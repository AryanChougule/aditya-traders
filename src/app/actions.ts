"use server";

import { and, eq, inArray, ne } from "drizzle-orm";
import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { inferGroup, parseGrams, slugify } from "@/lib/catalog";
import { search as rankProducts } from "@/lib/search";
import { settingsSchema } from "@/lib/settings";
import type { CartLine, LiveProduct, Order } from "@/lib/types";
import { ActionError, assertRole, displayPhone, getCurrentUser, normalizePhone, type Role, type SessionUser } from "@/server/auth";
import { getCatalog, getCategories, TAGS } from "@/server/catalog";
import { getDb, schema } from "@/server/db";
import { getOrderFor, orderOps, placeOrder as place, type PlaceOrderInput } from "@/server/orders";
import { createGatewayOrder, gatewayEnabled, recordPayment, verifyCheckoutSignature } from "@/server/razorpay";

export type Result<T = null> = { ok: true; value: T } | { ok: false; error: string };

/** Runs an action, turning ActionError into a message the user can read and hiding anything else. */
async function run<T>(fn: () => Promise<T>, after?: { catalog?: boolean; settings?: boolean }): Promise<Result<T>> {
  try {
    const value = await fn();
    if (after?.catalog) updateTag(TAGS.catalog);
    if (after?.settings) updateTag(TAGS.settings);
    refresh();
    return { ok: true, value };
  } catch (e) {
    if (e instanceof ActionError) return { ok: false, error: e.message };
    if (e instanceof z.ZodError) return { ok: false, error: e.issues[0]?.message ?? "Please check the details and try again." };
    console.error(e);
    return { ok: false, error: "Something went wrong on our side. Please try again." };
  }
}

const STAFF: Role[] = ["owner", "packer"];
const DELIVERY: Role[] = ["owner", "packer", "rider"];
const ANY: Role[] = ["customer", "owner", "packer", "rider"];
const id = z.string().uuid();

async function audit(actor: SessionUser, action: string, entity: string, data?: unknown) {
  const db = await getDb();
  await db.insert(schema.auditLog).values({ actorId: actor.id, action, entity, data: (data ?? null) as object });
}

/* ---------- shopper ---------- */

export async function placeOrderAction(input: PlaceOrderInput): Promise<Result<{ order: Order; gateway?: { keyId: string; orderId: string; amount: number } }>> {
  return run(
    async () => {
      const user = await assertRole(ANY);
      const parsed = z
        .object({
          lines: z.array(z.object({ productId: z.string().max(80), qty: z.number().int().positive() })).min(1).max(100),
          mode: z.enum(["delivery", "pickup"]),
          addressId: z.string().uuid().optional(),
          slotId: z.string().max(40),
          subPref: z.enum(["similar", "ask", "remove"]),
          paymentMethod: z.enum(["upi", "card", "cod"]),
          useWallet: z.boolean(),
        })
        .parse(input);
      const order = await place(user, parsed);
      if (order.status === "placed" && (await gatewayEnabled())) {
        return { order, gateway: await createGatewayOrder(order) };
      }
      return { order };
    },
    { catalog: true },
  );
}

/** Checkout callback after the shopper pays in Razorpay's sheet. The webhook confirms the same payment independently. */
export async function verifyPaymentAction(input: { orderId: string; razorpayOrderId: string; razorpayPaymentId: string; signature: string }) {
  return run(async () => {
    const user = await assertRole(ANY);
    const p = z.object({ orderId: id, razorpayOrderId: z.string().max(60), razorpayPaymentId: z.string().max(60), signature: z.string().max(200) }).parse(input);
    if (!verifyCheckoutSignature(p.razorpayOrderId, p.razorpayPaymentId, p.signature)) throw new ActionError("We couldn't confirm that payment. If money was taken, it will be confirmed automatically in a few minutes.");
    const db = await getDb();
    const [o] = await db.select({ userId: schema.orders.userId, total: schema.orders.totalEstimated, rz: schema.orders.razorpayOrderId }).from(schema.orders).where(eq(schema.orders.id, p.orderId));
    if (!o || o.userId !== user.id || o.rz !== p.razorpayOrderId) throw new ActionError("Order not found.");
    await recordPayment(p.razorpayOrderId, p.razorpayPaymentId, o.total);
  });
}

/** Opens the gateway again for an order left unpaid (retry from the order page). */
export async function retryPaymentAction(orderId: string): Promise<Result<{ keyId: string; orderId: string; amount: number }>> {
  return run(async () => {
    const user = await assertRole(ANY);
    const order = await getOrderFor(user, id.parse(orderId));
    if (!order || order.customer.id !== user.id) throw new ActionError("Order not found.");
    if (order.status !== "placed") throw new ActionError("This order doesn't need payment.");
    if (!(await gatewayEnabled())) throw new ActionError("Online payment is switched off. Please call the store.");
    return createGatewayOrder(order);
  });
}

export async function cancelOrderAction(orderId: string, reason: string) {
  return run(async () => orderOps.cancel(await assertRole(ANY), id.parse(orderId), z.string().max(120).parse(reason)), { catalog: true });
}

export async function resolveApprovalAction(orderId: string, lineId: string, decision: "accept" | "remove") {
  return run(async () => orderOps.resolveApproval(await assertRole(ANY), id.parse(orderId), id.parse(lineId), z.enum(["accept", "remove"]).parse(decision)));
}

const addressInput = z.object({
  id: z.string().uuid().optional(),
  label: z.enum(["Home", "Work", "Other"]),
  line1: z.string().trim().min(3, "Add your flat or house number and building").max(120),
  area: z.string().trim().min(2, "Add your street or area").max(120),
  landmark: z.string().trim().max(120),
  pincode: z.string().regex(/^\d{6}$/, "Enter a 6-digit pincode"),
});

export async function saveAddressAction(input: z.infer<typeof addressInput>): Promise<Result<string>> {
  return run(async () => {
    const user = await assertRole(ANY);
    const a = addressInput.parse(input);
    const db = await getDb();
    const existing = await db.select({ id: schema.addresses.id }).from(schema.addresses).where(eq(schema.addresses.userId, user.id));
    if (a.id) {
      await db.update(schema.addresses).set(a).where(and(eq(schema.addresses.id, a.id), eq(schema.addresses.userId, user.id)));
      return a.id;
    }
    if (existing.length >= 10) throw new ActionError("You can save up to 10 addresses.");
    const [row] = await db
      .insert(schema.addresses)
      .values({ ...a, userId: user.id, isDefault: existing.length === 0 })
      .returning({ id: schema.addresses.id });
    return row.id;
  });
}

export async function setDefaultAddressAction(addressId: string) {
  return run(async () => {
    const user = await assertRole(ANY);
    const db = await getDb();
    await db.transaction(async (tx) => {
      await tx.update(schema.addresses).set({ isDefault: false }).where(eq(schema.addresses.userId, user.id));
      await tx.update(schema.addresses).set({ isDefault: true }).where(and(eq(schema.addresses.id, id.parse(addressId)), eq(schema.addresses.userId, user.id)));
    });
  });
}

export async function deleteAddressAction(addressId: string) {
  return run(async () => {
    const user = await assertRole(ANY);
    const db = await getDb();
    await db
      .update(schema.addresses)
      .set({ deletedAt: new Date(), isDefault: false })
      .where(and(eq(schema.addresses.id, id.parse(addressId)), eq(schema.addresses.userId, user.id)));
  });
}

export async function updateProfileAction(input: { name?: string; phone?: string; subPref?: "similar" | "ask" | "remove" }) {
  return run(async () => {
    const user = await assertRole(ANY);
    const p = z
      .object({ name: z.string().trim().min(2, "Please enter your name").max(60).optional(), phone: z.string().max(20).optional(), subPref: z.enum(["similar", "ask", "remove"]).optional() })
      .parse(input);
    const phone = p.phone === undefined ? undefined : normalizePhone(p.phone);
    if (phone === null) throw new ActionError("Enter a 10-digit Indian mobile number.");
    const db = await getDb();
    await db.update(schema.users).set({ ...p, phone }).where(eq(schema.users.id, user.id));
  });
}

/** Deletes the shopper's account data we don't need to keep (DPDP Act). Orders stay for GST records, anonymised. */
export async function deleteAccountAction() {
  return run(async () => {
    const user = await assertRole(["customer"]);
    const db = await getDb();
    await db.transaction(async (tx) => {
      await tx.delete(schema.addresses).where(eq(schema.addresses.userId, user.id));
      await tx.update(schema.orders).set({ customerName: "Deleted customer", address: null }).where(eq(schema.orders.userId, user.id));
      await tx.update(schema.users).set({ name: "", disabled: true, phone: null, email: null, googleUid: null }).where(eq(schema.users.id, user.id));
      await tx.delete(schema.sessions).where(eq(schema.sessions.userId, user.id));
    });
  });
}

/** Fresh price and availability for what's in the cart (prices may have changed since it was added). */
export async function refreshCartAction(ids: string[]): Promise<LiveProduct[]> {
  const wanted = new Set(z.array(z.string().max(80)).max(100).parse(ids));
  return (await getCatalog()).filter((p) => wanted.has(p.id));
}

export async function searchAction(q: string): Promise<LiveProduct[]> {
  const term = z.string().max(60).parse(q).trim();
  if (!term) return [];
  const [catalog, cats] = await Promise.all([getCatalog(), getCategories()]);
  const results = rankProducts(term, catalog, cats);
  if (!results.length && term.length >= 3) {
    const db = await getDb();
    await db.insert(schema.zeroSearches).values({ q: term.toLowerCase() });
  }
  return results;
}

/** Products to fill a cart from a past order ("Repeat this order"). */
export async function repeatOrderLines(orderId: string): Promise<CartLine[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const db = await getDb();
  const [o] = await db.select({ userId: schema.orders.userId }).from(schema.orders).where(eq(schema.orders.id, id.parse(orderId)));
  if (!o || o.userId !== user.id) return [];
  const items = await db
    .select({ productId: schema.orderItems.productId, qty: schema.orderItems.qtyOrdered })
    .from(schema.orderItems)
    .where(and(eq(schema.orderItems.orderId, orderId), inArray(schema.orderItems.status, ["packed", "pending"])));
  const live = new Map((await getCatalog()).map((p) => [p.id, p]));
  return items.filter((i) => live.get(i.productId)?.available).map((i) => ({ productId: i.productId, qty: i.qty, snap: live.get(i.productId) }));
}

/* ---------- store: packing and delivery ---------- */

export async function startPackingAction(orderId: string) {
  return run(async () => orderOps.startPacking(await assertRole(STAFF), id.parse(orderId)));
}
export async function packItemAction(orderId: string, lineId: string, qty: number) {
  return run(async () => orderOps.packItem(await assertRole(STAFF), id.parse(orderId), id.parse(lineId), z.number().int().positive().parse(qty)));
}
export async function unpackItemAction(orderId: string, lineId: string) {
  return run(async () => orderOps.unpackItem(await assertRole(STAFF), id.parse(orderId), id.parse(lineId)));
}
export async function markMissingAction(orderId: string, lineId: string, productId?: string) {
  return run(async () => orderOps.markMissing(await assertRole(STAFF), id.parse(orderId), id.parse(lineId), productId ? z.string().max(80).parse(productId) : undefined));
}
export async function removeItemAction(orderId: string, lineId: string) {
  return run(async () => orderOps.removeItem(await assertRole(STAFF), id.parse(orderId), id.parse(lineId)));
}
export async function finishPackingAction(orderId: string) {
  return run(async () => orderOps.finishPacking(await assertRole(STAFF), id.parse(orderId)));
}
export async function dispatchAction(orderId: string, f: { kind: "own" | "partner" | "pickup"; riderId?: string; partnerName?: string; trackingUrl?: string }) {
  return run(async () => {
    const actor = await assertRole(STAFF);
    const p = z
      .object({
        kind: z.enum(["own", "partner", "pickup"]),
        riderId: z.string().uuid().optional(),
        partnerName: z.string().max(40).optional(),
        trackingUrl: z.string().url("Paste a full link starting with https://").max(500).optional(),
      })
      .parse(f);
    let rider: { riderName?: string; riderPhone?: string } = {};
    if (p.kind === "own") {
      const db = await getDb();
      const [r] = p.riderId ? await db.select().from(schema.users).where(eq(schema.users.id, p.riderId)) : [];
      if (!r || r.role === "customer" || r.disabled) throw new ActionError("Choose a rider.");
      rider = { riderName: r.name, riderPhone: displayPhone(r.phone) };
    }
    return orderOps.dispatch(actor, id.parse(orderId), { ...p, ...rider });
  });
}
export async function completeHandoverAction(orderId: string, code: string) {
  return run(async () => orderOps.completeHandover(await assertRole(DELIVERY), id.parse(orderId), z.string().max(6).parse(code)));
}
export async function failDeliveryAction(orderId: string, reason: string) {
  return run(async () => orderOps.failDelivery(await assertRole(DELIVERY), id.parse(orderId), z.string().max(120).parse(reason)));
}
export async function retryDeliveryAction(orderId: string) {
  return run(async () => orderOps.retryDelivery(await assertRole(STAFF), id.parse(orderId)));
}
export async function returnToStoreAction(orderId: string) {
  return run(async () => orderOps.returnToStore(await assertRole(STAFF), id.parse(orderId)), { catalog: true });
}
export async function storeCancelAction(orderId: string) {
  return run(async () => orderOps.cancel(await assertRole(STAFF), id.parse(orderId), "Cancelled by store"), { catalog: true });
}

/* ---------- store: products ---------- */

const productInput = z.object({
  name: z.string().trim().min(2).max(80),
  nameHi: z.string().trim().max(80).default(""),
  nameMr: z.string().trim().max(80).default(""),
  brand: z.string().trim().max(40).optional(),
  categoryId: z.string().max(40),
  unitType: z.enum(["piece", "weight"]),
  unitLabel: z.string().trim().max(40),
  price: z.number().int().positive("Price must be above zero"),
  mrp: z.number().int().positive("Enter the MRP"),
  hsn: z.string().trim().max(10).default(""),
  gstRate: z.number().int().refine((n) => [0, 5, 12, 18, 40].includes(n), "GST rate must be 0, 5, 12, 18 or 40"),
  aisle: z.number().int().min(1).max(99).default(1),
  stock: z.number().int().min(0).max(100_000),
  aliases: z.array(z.string().trim().max(30)).max(20).default([]),
  description: z.string().trim().max(500).default(""),
});

export async function updateProductAction(productId: string, patch: { price?: number; mrp?: number; stock?: number; available?: boolean; active?: boolean; aisle?: number }) {
  return run(
    async () => {
      const actor = await assertRole(STAFF);
      const p = z
        .object({
          price: z.number().int().positive().optional(),
          mrp: z.number().int().positive().optional(),
          stock: z.number().int().min(0).max(100_000).optional(),
          available: z.boolean().optional(),
          active: z.boolean().optional(),
          aisle: z.number().int().min(1).max(99).optional(),
        })
        .parse(patch);
      if ((p.price !== undefined || p.mrp !== undefined || p.active !== undefined) && actor.role !== "owner")
        throw new ActionError("Only the owner can change prices or remove products.");
      const db = await getDb();
      const [cur] = await db.select().from(schema.products).where(eq(schema.products.id, z.string().max(80).parse(productId)));
      if (!cur) throw new ActionError("Product not found.");
      if ((p.price ?? cur.price) > (p.mrp ?? cur.mrp)) throw new ActionError("Selling price can't be above MRP.");
      await db.update(schema.products).set({ ...p, updatedAt: new Date() }).where(eq(schema.products.id, cur.id));
      await audit(actor, "product.update", cur.id, { before: { price: cur.price, mrp: cur.mrp, stock: cur.stock, available: cur.available }, after: p });
    },
    { catalog: true },
  );
}

export async function createProductAction(input: z.input<typeof productInput>): Promise<Result<string>> {
  return run(
    async () => {
      const actor = await assertRole(["owner"]);
      const p = productInput.parse(input);
      if (p.price > p.mrp) throw new ActionError("Selling price can't be above MRP.");
      const db = await getDb();
      const id = await insertProduct(db, p);
      await audit(actor, "product.create", id, p);
      return id;
    },
    { catalog: true },
  );
}

async function insertProduct(db: Awaited<ReturnType<typeof getDb>>, p: z.infer<typeof productInput>) {
  const cats = await getCategories();
  const cat = cats.find((c) => c.id === p.categoryId);
  if (!cat) throw new ActionError(`Unknown category "${p.categoryId}".`);
  const base = slugify(`${p.brand ? p.brand + " " : ""}${p.name}${p.unitType === "weight" ? "" : " " + p.unitLabel}`) || "product";
  let slug = base;
  for (let n = 2; ; n++) {
    const [taken] = await db.select({ id: schema.products.id }).from(schema.products).where(eq(schema.products.slug, slug));
    if (!taken) break;
    slug = `${base}-${n}`;
  }
  const id = `p-${crypto.randomUUID().slice(0, 8)}`;
  await db.insert(schema.products).values({
    id,
    slug,
    name: p.name,
    nameHi: p.nameHi,
    nameMr: p.nameMr,
    brand: p.brand || null,
    categoryId: p.categoryId,
    unitType: p.unitType,
    unitLabel: p.unitType === "weight" ? "per kg" : p.unitLabel,
    price: p.price,
    mrp: p.mrp,
    hsn: p.hsn,
    gstRate: p.gstRate,
    aisle: p.aisle,
    aliases: p.aliases,
    tags: [],
    icon: cat.icon,
    tint: cat.tint,
    group: inferGroup(p.name) ?? null,
    netGrams: p.unitType === "weight" ? null : (parseGrams(p.unitLabel) ?? null),
    description: p.description,
    stock: p.stock,
  });
  return id;
}

/**
 * Bulk import from a spreadsheet saved as CSV. Columns (header row required):
 * name, name_mr, name_hi, brand, category, unit_type (piece|weight), unit, price, mrp, hsn, gst, aisle, stock, aliases
 * Prices in rupees. Existing products with the same name + brand + unit are updated instead of duplicated.
 */
export async function importProductsAction(csv: string): Promise<Result<{ created: number; updated: number; errors: string[] }>> {
  return run(
    async () => {
      const actor = await assertRole(["owner"]);
      if (csv.length > 2_000_000) throw new ActionError("That file is too big. Split it into smaller files.");
      const rows = parseCsv(csv);
      if (rows.length < 2) throw new ActionError("The file needs a header row and at least one product.");
      const head = rows[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
      const col = (r: string[], k: string) => (r[head.indexOf(k)] ?? "").trim();
      const cats = await getCategories();
      const db = await getDb();
      const existing = await db.select().from(schema.products);
      let created = 0;
      let updated = 0;
      const errors: string[] = [];
      for (const [n, r] of rows.slice(1).entries()) {
        if (r.every((c) => !c.trim())) continue;
        const catText = col(r, "category").toLowerCase();
        const cat = cats.find((c) => c.id === catText || c.slug === catText || c.name.toLowerCase() === catText);
        const parsed = productInput.safeParse({
          name: col(r, "name"),
          nameHi: col(r, "name_hi"),
          nameMr: col(r, "name_mr"),
          brand: col(r, "brand") || undefined,
          categoryId: cat?.id ?? "",
          unitType: col(r, "unit_type") === "weight" ? "weight" : "piece",
          unitLabel: col(r, "unit") || "1 pc",
          price: Math.round(Number(col(r, "price")) * 100),
          mrp: Math.round(Number(col(r, "mrp") || col(r, "price")) * 100),
          hsn: col(r, "hsn"),
          gstRate: Number(col(r, "gst") || 0),
          aisle: Number(col(r, "aisle") || 1),
          stock: Number(col(r, "stock") || 0),
          aliases: col(r, "aliases").split(/[;|]/).map((s) => s.trim()).filter(Boolean),
        });
        if (!cat) {
          errors.push(`Row ${n + 2}: unknown category "${col(r, "category")}"`);
          continue;
        }
        if (!parsed.success) {
          errors.push(`Row ${n + 2}: ${parsed.error.issues[0]?.message}`);
          continue;
        }
        const p = parsed.data;
        if (p.price > p.mrp) {
          errors.push(`Row ${n + 2}: price is above MRP`);
          continue;
        }
        const match = existing.find(
          (e) => e.name.toLowerCase() === p.name.toLowerCase() && (e.brand ?? "").toLowerCase() === (p.brand ?? "").toLowerCase() && (e.unitType === "weight" || e.unitLabel === p.unitLabel),
        );
        if (match) {
          await db
            .update(schema.products)
            .set({ price: p.price, mrp: p.mrp, stock: p.stock, hsn: p.hsn || match.hsn, gstRate: p.gstRate, aisle: p.aisle, nameHi: p.nameHi || match.nameHi, nameMr: p.nameMr || match.nameMr, active: true, updatedAt: new Date() })
            .where(eq(schema.products.id, match.id));
          updated++;
        } else {
          await insertProduct(db, p);
          created++;
        }
      }
      await audit(actor, "product.import", "products", { created, updated, errors: errors.length });
      return { created, updated, errors: errors.slice(0, 50) };
    },
    { catalog: true },
  );
}

/** Minimal RFC 4180 CSV parser (quoted fields, escaped quotes, CRLF). */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/* ---------- store: settings and staff ---------- */

export async function saveSettingsAction(data: unknown) {
  return run(
    async () => {
      const actor = await assertRole(["owner"]);
      const s = settingsSchema.parse(data);
      if (s.closesAt <= s.opensAt) throw new ActionError("Closing time must be after opening time.");
      if (s.onlinePayments && !(await gatewayEnabled({ ignoreSetting: true })))
        throw new ActionError("Add your Razorpay keys in Vercel before turning on online payments.");
      const db = await getDb();
      await db.update(schema.settings).set({ data: s, updatedAt: new Date() }).where(eq(schema.settings.id, 1));
      await audit(actor, "settings.update", "settings", s);
    },
    { settings: true },
  );
}

/** Staff are identified by the Gmail they log in with; the owner can add them before their first login. */
export async function saveStaffAction(input: { email: string; name: string; phone?: string; role: "owner" | "packer" | "rider" | "customer" }) {
  return run(async () => {
    const actor = await assertRole(["owner"]);
    const p = z
      .object({
        email: z.string().trim().toLowerCase().email("Enter the Gmail address they log in with"),
        name: z.string().trim().min(2, "Enter their name").max(60),
        phone: z.string().max(20).optional(),
        role: z.enum(["owner", "packer", "rider", "customer"]),
      })
      .parse(input);
    // riders need a number customers can call; for others it's optional
    const phone = p.phone ? normalizePhone(p.phone) : undefined;
    if (phone === null) throw new ActionError("Enter a 10-digit Indian mobile number, or leave it empty.");
    const db = await getDb();
    const [existing] = await db.select().from(schema.users).where(eq(schema.users.email, p.email));
    if (existing?.id === actor.id && p.role !== "owner") throw new ActionError("You can't remove your own owner access.");
    if (existing) await db.update(schema.users).set({ role: p.role, name: existing.name || p.name, ...(phone ? { phone } : {}) }).where(eq(schema.users.id, existing.id));
    else await db.insert(schema.users).values({ email: p.email, name: p.name, phone: phone ?? null, role: p.role });
    if (p.role === "customer" && existing) await db.delete(schema.sessions).where(eq(schema.sessions.userId, existing.id));
    await audit(actor, "staff.save", p.email, { role: p.role });
  });
}

export async function setStaffRoleAction(input: { userId: string; role: "owner" | "packer" | "rider" | "customer" }) {
  return run(async () => {
    const actor = await assertRole(["owner"]);
    const p = z.object({ userId: z.string().uuid(), role: z.enum(["owner", "packer", "rider", "customer"]) }).parse(input);
    if (p.userId === actor.id && p.role !== "owner") throw new ActionError("You can't remove your own owner access.");
    const db = await getDb();
    await db.update(schema.users).set({ role: p.role }).where(eq(schema.users.id, p.userId));
    if (p.role === "customer") await db.delete(schema.sessions).where(eq(schema.sessions.userId, p.userId));
    await audit(actor, "staff.role", p.userId, { role: p.role });
  });
}

/** Riders available for dispatch. Staff only: every server action is a public endpoint, and this returns phone numbers. */
export async function listRiders() {
  await assertRole(STAFF);
  const db = await getDb();
  return db
    .select({ id: schema.users.id, name: schema.users.name, phone: schema.users.phone })
    .from(schema.users)
    .where(and(eq(schema.users.role, "rider"), eq(schema.users.disabled, false), ne(schema.users.name, "")));
}

