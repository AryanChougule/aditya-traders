import "server-only";
import { randomInt } from "node:crypto";
import { and, desc, eq, gt, inArray, lt, notInArray, or, sql } from "drizzle-orm";
import { connection } from "next/server";
import { comparablePrice, convertQty, substitutesFor } from "@/lib/catalog";
import { canTransition, isCancellable, isTerminal } from "@/lib/order-flow";
import { itemBilled, quote, settle } from "@/lib/pricing";
import type { StoreSettings } from "@/lib/settings";
import { fyLabel, slotFromId } from "@/lib/slots";
import type { Address, Fulfilment, FulfilmentMode, LedgerEntry, LiveProduct, Order, OrderItem, OrderStatus, PaymentMethod, SubPref, Tint } from "@/lib/types";
import { ActionError, displayPhone, type SessionUser } from "./auth";
import { getCatalog, getSettings, toLiveProduct } from "./catalog";
import { getDb, schema, type DB, type Tx } from "./db";

/*
 * Order operations from the design doc (§07 lifecycle, §08 substitutions and weighing, §10 payments).
 * Every change runs in one transaction that locks the order row, applies the same rules the UI was
 * built against, and appends an event, so concurrent taps from two staff phones can't corrupt an order.
 */

const UNPAID_HOLD_MS = 15 * 60_000;
const code4 = () => String(randomInt(1000, 10000));

/* ---------- loading ---------- */

type OrderRow = typeof schema.orders.$inferSelect;
type ItemRow = typeof schema.orderItems.$inferSelect;
type EventRow = typeof schema.orderEvents.$inferSelect;

function assemble(o: OrderRow, items: ItemRow[], events: EventRow[], catalog: Map<string, LiveProduct>): Order {
  return {
    id: o.id,
    number: o.number,
    createdAt: o.createdAt.getTime(),
    customer: { id: o.userId, name: o.customerName, phone: displayPhone(o.customerPhone) },
    mode: o.mode,
    address: o.address ?? undefined,
    slot: o.slot,
    subPref: o.subPref,
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    status: o.status as OrderStatus,
    deliveryFee: o.deliveryFee,
    walletUsed: o.walletUsed,
    totalEstimated: o.totalEstimated,
    totalFinal: o.totalFinal ?? undefined,
    adjustment: o.adjustment ?? undefined,
    invoiceNumber: o.invoiceNumber ?? undefined,
    fulfilment: o.fulfilment,
    timeline: events.map((e) => ({ status: e.status as OrderStatus, at: e.at.getTime(), note: e.note ?? undefined })),
    items: items
      .sort((a, b) => a.sort - b.sort)
      .map((i) => {
        const p = catalog.get(i.productId);
        const alt = i.proposedProductId ? catalog.get(i.proposedProductId) : undefined;
        return {
          lineId: i.id,
          productId: i.productId,
          name: i.name,
          unitType: i.unitType,
          unitLabel: i.unitLabel,
          qtyOrdered: i.qtyOrdered,
          qtyPacked: i.qtyPacked ?? undefined,
          unitPrice: i.unitPrice,
          mrp: i.mrp,
          gstRate: i.gstRate,
          hsn: i.hsn,
          aisle: i.aisle,
          status: i.status,
          substituteFor: i.substituteFor ?? undefined,
          proposedProductId: i.proposedProductId ?? undefined,
          awaitingSince: i.awaitingSince?.getTime(),
          icon: p?.icon ?? "Package",
          tint: (p?.tint ?? "green") as Tint,
          proposed: alt
            ? { name: alt.brand ? `${alt.brand} ${alt.name}` : alt.name, unitLabel: alt.unitLabel, unitType: alt.unitType, price: alt.price, icon: alt.icon, tint: alt.tint }
            : undefined,
        };
      }),
  };
}

async function loadMany(db: DB | Tx, rows: OrderRow[]): Promise<Order[]> {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const [items, events, catalog] = await Promise.all([
    db.select().from(schema.orderItems).where(inArray(schema.orderItems.orderId, ids)),
    db.select().from(schema.orderEvents).where(inArray(schema.orderEvents.orderId, ids)).orderBy(schema.orderEvents.id),
    getCatalog(),
  ]);
  const byId = new Map(catalog.map((p) => [p.id, p]));
  return rows.map((r) =>
    assemble(
      r,
      items.filter((i) => i.orderId === r.id),
      events.filter((e) => e.orderId === r.id),
      byId,
    ),
  );
}

/** An order the viewer may see: their own, or any order for staff. */
export async function getOrderFor(viewer: SessionUser, id: string): Promise<Order | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const db = await getDb();
  await expireStale(db);
  const [row] = await db.select().from(schema.orders).where(eq(schema.orders.id, id));
  if (!row) return null;
  if (viewer.role === "customer" && row.userId !== viewer.id) return null;
  if (viewer.role === "rider" && row.fulfilment.riderId !== viewer.id && row.userId !== viewer.id) return null;
  return (await loadMany(db, [row]))[0];
}

export async function listCustomerOrders(userId: string): Promise<Order[]> {
  const db = await getDb();
  await expireStale(db);
  const rows = await db.select().from(schema.orders).where(eq(schema.orders.userId, userId)).orderBy(desc(schema.orders.createdAt)).limit(50);
  return loadMany(db, rows);
}

/** Open orders plus anything from the last two days, for the console board and reports. */
export async function listConsoleOrders(): Promise<Order[]> {
  const db = await getDb();
  await expireStale(db);
  const since = new Date(Date.now() - 2 * 86_400_000);
  const rows = await db
    .select()
    .from(schema.orders)
    .where(or(notInArray(schema.orders.status, ["delivered", "picked_up", "returned", "cancelled"]), gt(schema.orders.createdAt, since)))
    .orderBy(desc(schema.orders.createdAt))
    .limit(300);
  return loadMany(db, rows);
}

/** Everything placed in the last `days` days, for reports. */
export async function listOrdersSince(days: number): Promise<Order[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.orders)
    .where(gt(schema.orders.createdAt, new Date(Date.now() - days * 86_400_000)))
    .orderBy(desc(schema.orders.createdAt))
    .limit(5000);
  return loadMany(db, rows);
}

/** Searches that found nothing, for the "what to stock" report. */
export async function listZeroSearches(days: number) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.zeroSearches)
    .where(gt(schema.zeroSearches.at, new Date(Date.now() - days * 86_400_000)))
    .orderBy(desc(schema.zeroSearches.at))
    .limit(500);
  return rows.map((z) => ({ q: z.q, at: z.at.getTime() }));
}

export async function listRiderOrders(riderId: string): Promise<Order[]> {
  const db = await getDb();
  const since = new Date(Date.now() - 86_400_000);
  const rows = await db
    .select()
    .from(schema.orders)
    .where(
      and(
        sql`${schema.orders.fulfilment}->>'riderId' = ${riderId}`,
        or(inArray(schema.orders.status, ["out_for_delivery", "delivery_failed"]), gt(schema.orders.updatedAt, since)),
      ),
    )
    .orderBy(desc(schema.orders.updatedAt));
  return loadMany(db, rows);
}

export async function walletBalance(userId: string, db?: DB | Tx): Promise<number> {
  const d = db ?? (await getDb());
  const [r] = await d.select({ sum: sql<number>`coalesce(sum(${schema.ledger.amount}), 0)::int` }).from(schema.ledger).where(eq(schema.ledger.userId, userId));
  return r.sum;
}

export async function walletEntries(userId: string): Promise<LedgerEntry[]> {
  const db = await getDb();
  const rows = await db.select().from(schema.ledger).where(eq(schema.ledger.userId, userId)).orderBy(desc(schema.ledger.at)).limit(30);
  return rows.map((l) => ({ id: l.id, customerId: l.userId, at: l.at.getTime(), amount: l.amount, kind: l.kind, orderNumber: l.orderNumber ?? undefined, note: l.note }));
}

/** Orders already booked into each slot (cancelled ones free their place). */
export async function slotBookings(slotIds: string[], db?: DB | Tx): Promise<Record<string, number>> {
  if (!slotIds.length) return {};
  const d = db ?? (await getDb());
  const rows = await d
    .select({ slotId: schema.orders.slotId, n: sql<number>`count(*)::int` })
    .from(schema.orders)
    .where(and(inArray(schema.orders.slotId, slotIds), notInArray(schema.orders.status, ["cancelled"])))
    .groupBy(schema.orders.slotId);
  return Object.fromEntries(rows.map((r) => [r.slotId, r.n]));
}

/* ---------- placing an order ---------- */

export type PlaceOrderInput = {
  lines: { productId: string; qty: number }[];
  mode: FulfilmentMode;
  addressId?: string;
  slotId: string;
  subPref: SubPref;
  paymentMethod: PaymentMethod;
  useWallet: boolean;
};

export async function placeOrder(user: SessionUser, input: PlaceOrderInput): Promise<Order> {
  const settings = await getSettings();
  if (!settings.acceptingOrders) throw new ActionError("The store isn't taking online orders right now. Please try again later or call the store.");
  if (input.paymentMethod !== "cod" && !settings.onlinePayments) throw new ActionError("Online payment isn't available yet. Please choose cash or UPI on delivery.");
  if (!user.phone) throw new ActionError("Add your mobile number first, so the store and rider can reach you.");
  const db = await getDb();

  const id = await db.transaction(async (tx) => {
    const ids = [...new Set(input.lines.map((l) => l.productId))];
    const rows = ids.length ? await tx.select().from(schema.products).where(inArray(schema.products.id, ids)) : [];
    const live = new Map(rows.map((r) => [r.id, toLiveProduct(r)]));
    const lines = input.lines.filter((l) => live.get(l.productId)?.available && l.qty > 0 && l.qty <= 20_000);
    if (!lines.length) throw new ActionError("Everything in your cart just went out of stock. Please add something else.");

    let address: Address | undefined;
    let km: number | undefined;
    if (input.mode === "delivery") {
      const [a] = input.addressId
        ? await tx.select().from(schema.addresses).where(and(eq(schema.addresses.id, input.addressId), eq(schema.addresses.userId, user.id)))
        : [];
      if (!a || a.deletedAt) throw new ActionError("Please choose a delivery address.");
      km = settings.serviceable[a.pincode];
      if (km === undefined) throw new ActionError(`We don't deliver to ${a.pincode} yet. Choose pickup instead.`);
      address = { id: a.id, label: a.label, line1: a.line1, area: a.area, landmark: a.landmark, pincode: a.pincode };
    }

    // one booking at a time per slot, so two shoppers can't both take the last place
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${input.slotId}))`);
    const booked = await slotBookings([input.slotId], tx);
    const slot = slotFromId(settings, input.slotId, booked);
    if (!slot || slot.closed) throw new ActionError("That slot just filled up or closed. Please pick another time.");
    if ((input.mode === "pickup") !== input.slotId.startsWith("pickup-")) throw new ActionError("Please pick a time again.");

    const balance = input.useWallet ? await walletBalance(user.id, tx) : 0;
    const q = quote(lines, (pid) => live.get(pid), { mode: input.mode, km, wallet: balance }, settings);
    if (q.belowMinimum) throw new ActionError(`Minimum order is ₹${settings.minOrder / 100}.`);
    if (input.paymentMethod === "cod" && q.total > settings.codLimit) throw new ActionError(`Cash on delivery is available up to ₹${settings.codLimit / 100}.`);

    const [{ value: seq }] = await tx
      .update(schema.counters)
      .set({ value: sql`${schema.counters.value} + 1` })
      .where(eq(schema.counters.key, "order"))
      .returning({ value: schema.counters.value });

    const cod = input.paymentMethod === "cod";
    const free = q.total === 0;
    const status: OrderStatus = cod || free ? "confirmed" : "placed";
    const [order] = await tx
      .insert(schema.orders)
      .values({
        number: `AT-${seq}`,
        userId: user.id,
        customerName: user.name || "Customer",
        customerPhone: `+91${user.phone.replace(/\D/g, "").slice(-10)}`,
        mode: input.mode,
        address: address ?? null,
        slotId: slot.id,
        slot: { id: slot.id, date: slot.date, label: slot.label, start: slot.start, end: slot.end },
        subPref: input.subPref,
        paymentMethod: input.paymentMethod,
        paymentStatus: cod ? "cod_due" : free ? "paid" : "pending",
        status,
        deliveryFee: q.deliveryFee,
        walletUsed: q.walletUsed,
        totalEstimated: q.total,
        fulfilment: { kind: input.mode === "pickup" ? "pickup" : "own", code: code4() },
      })
      .returning();

    await tx.insert(schema.orderItems).values(
      lines.map((l, i) => {
        const p = live.get(l.productId)!;
        return {
          orderId: order.id,
          sort: i * 10,
          productId: p.id,
          name: p.brand ? `${p.brand} ${p.name}` : p.name,
          unitType: p.unitType,
          unitLabel: p.unitLabel,
          qtyOrdered: l.qty,
          unitPrice: p.price,
          mrp: p.mrp,
          gstRate: p.gstRate,
          hsn: p.hsn,
          aisle: p.aisle,
          status: "pending" as const,
        };
      }),
    );
    await tx.insert(schema.orderEvents).values({ orderId: order.id, status, actorId: user.id });
    if (q.walletUsed) await tx.insert(schema.ledger).values({ userId: user.id, amount: -q.walletUsed, kind: "used", orderNumber: order.number, note: "Used at checkout" });
    for (const l of lines) {
      const p = live.get(l.productId)!;
      const units = p.unitType === "weight" ? Math.ceil(l.qty / 1000) : l.qty;
      await tx.update(schema.products).set({ stock: sql`greatest(${schema.products.stock} - ${units}, 0)` }).where(eq(schema.products.id, p.id));
    }
    await tx.update(schema.users).set({ subPref: input.subPref }).where(eq(schema.users.id, user.id));
    return order.id;
  });

  return (await getOrderFor(user, id))!;
}

/* ---------- changing an order ---------- */

type Ctx = {
  settings: StoreSettings;
  catalog: LiveProduct[];
  product: (id: string) => LiveProduct | undefined;
  credit: (amount: number, kind: LedgerEntry["kind"], note: string) => void;
  restock: () => void;
  invoiceNumber: () => Promise<string>;
  move: (to: OrderStatus, note?: string) => void;
};

/**
 * Locks the order, hands a working copy to `fn`, then writes back the order, its items, new events,
 * wallet credits and stock changes in the same transaction. `fn` throws ActionError to refuse.
 */
async function mutate(actor: SessionUser | null, orderId: string, fn: (o: Order, ctx: Ctx) => void | Promise<void>): Promise<void> {
  const [db, settings, catalog] = await Promise.all([getDb(), getSettings(), getCatalog()]);
  const byId = new Map(catalog.map((p) => [p.id, p]));
  await db.transaction(async (tx) => {
    const [row] = await tx.select().from(schema.orders).where(eq(schema.orders.id, orderId)).for("update");
    if (!row) throw new ActionError("Order not found.");
    const [o] = await loadMany(tx, [row]);
    const events: { status: string; note?: string }[] = [];
    const credits: { amount: number; kind: LedgerEntry["kind"]; note: string }[] = [];
    let restock = false;

    await fn(o, {
      settings,
      catalog,
      product: (id) => byId.get(id),
      credit: (amount, kind, note) => amount && credits.push({ amount, kind, note }),
      restock: () => (restock = true),
      invoiceNumber: async () => {
        const key = `invoice-${fyLabel(Date.now())}`;
        const [c] = await tx
          .insert(schema.counters)
          .values({ key, value: 1 })
          .onConflictDoUpdate({ target: schema.counters.key, set: { value: sql`${schema.counters.value} + 1` } })
          .returning({ value: schema.counters.value });
        return `AT/${fyLabel(Date.now())}/${String(c.value).padStart(4, "0")}`;
      },
      move: (to, note) => {
        if (!canTransition(o.status, to)) throw new ActionError("This order has already moved on. Refresh to see its latest status.");
        o.status = to;
        events.push({ status: to, note });
      },
    });

    await tx
      .update(schema.orders)
      .set({
        status: o.status,
        paymentStatus: o.paymentStatus,
        totalFinal: o.totalFinal ?? null,
        adjustment: o.adjustment ?? null,
        invoiceNumber: o.invoiceNumber ?? null,
        fulfilment: o.fulfilment,
        updatedAt: new Date(),
      })
      .where(eq(schema.orders.id, o.id));
    await tx.delete(schema.orderItems).where(eq(schema.orderItems.orderId, o.id));
    await tx.insert(schema.orderItems).values(
      o.items.map((i, idx) => ({
        id: i.lineId,
        orderId: o.id,
        sort: idx * 10,
        productId: i.productId,
        name: i.name,
        unitType: i.unitType,
        unitLabel: i.unitLabel,
        qtyOrdered: i.qtyOrdered,
        qtyPacked: i.qtyPacked ?? null,
        unitPrice: i.unitPrice,
        mrp: i.mrp,
        gstRate: i.gstRate,
        hsn: i.hsn,
        aisle: i.aisle,
        status: i.status,
        substituteFor: i.substituteFor ?? null,
        proposedProductId: i.proposedProductId ?? null,
        awaitingSince: i.awaitingSince ? new Date(i.awaitingSince) : null,
      })),
    );
    if (events.length) await tx.insert(schema.orderEvents).values(events.map((e) => ({ orderId: o.id, status: e.status, note: e.note ?? null, actorId: actor?.id ?? null })));
    for (const c of credits) await tx.insert(schema.ledger).values({ userId: o.customer.id, amount: c.amount, kind: c.kind, orderNumber: o.number, note: c.note });
    if (restock) {
      for (const i of o.items) {
        if (i.status === "removed" || i.status === "substituted" || i.substituteFor) continue;
        const units = i.unitType === "weight" ? Math.ceil(i.qtyOrdered / 1000) : i.qtyOrdered;
        await tx.update(schema.products).set({ stock: sql`${schema.products.stock} + ${units}` }).where(eq(schema.products.id, i.productId));
      }
    }
  });
}

const line = (o: Order, lineId: string) => {
  const i = o.items.find((x) => x.lineId === lineId);
  if (!i) throw new ActionError("That item is no longer on the order.");
  return i;
};

const newLine = (p: LiveProduct, qty: number, substituteFor: string): OrderItem => ({
  lineId: crypto.randomUUID(),
  productId: p.id,
  name: p.brand ? `${p.brand} ${p.name}` : p.name,
  unitType: p.unitType,
  unitLabel: p.unitLabel,
  qtyOrdered: qty,
  unitPrice: p.price,
  mrp: p.mrp,
  gstRate: p.gstRate,
  hsn: p.hsn,
  aisle: p.aisle,
  status: "pending",
  substituteFor,
});

function substitute(o: Order, original: OrderItem, p: LiveProduct, ctx: Ctx) {
  const from = ctx.product(original.productId) ?? { unitType: original.unitType, netGrams: undefined };
  const idx = o.items.findIndex((i) => i.lineId === original.lineId);
  o.items.splice(idx + 1, 0, newLine(p, convertQty(from, original.qtyOrdered, p), original.lineId));
  original.status = "substituted";
  original.proposedProductId = undefined;
  original.awaitingSince = undefined;
}

function bestSubstitute(o: Order, original: OrderItem, ctx: Ctx) {
  const p = ctx.product(original.productId);
  if (!p) return undefined;
  const paid = comparablePrice({ unitType: original.unitType, price: original.unitPrice, netGrams: p.netGrams });
  return substitutesFor(p, ctx.catalog, o.items.map((i) => i.productId)).find((x) => x.available && comparablePrice(x) <= paid * 1.1);
}

function afterApproval(o: Order, ctx: Ctx) {
  if (o.status === "needs_approval" && !o.items.some((i) => i.status === "awaiting")) ctx.move("packing", "Shopper replied");
}

const isStaff = (u: SessionUser) => u.role === "owner" || u.role === "packer";
const ownsOrRuns = (u: SessionUser, o: Order) => isStaff(u) || o.customer.id === u.id;

export const orderOps = {
  cancel: (actor: SessionUser, id: string, reason: string) =>
    mutate(actor, id, (o, ctx) => {
      if (!ownsOrRuns(actor, o)) throw new ActionError("You can't change this order.");
      if (!isCancellable(o.status)) throw new ActionError("Packing has started, so this order can't be cancelled here. Please call the store.");
      const paid = o.paymentStatus === "paid";
      ctx.credit((paid ? o.totalEstimated : 0) + o.walletUsed, "refund", "Order cancelled");
      o.paymentStatus = paid ? "refunded" : o.paymentStatus === "cod_due" ? "cod_due" : "failed";
      ctx.move("cancelled", reason.slice(0, 120));
      ctx.restock();
    }),

  startPacking: (actor: SessionUser, id: string) => mutate(actor, id, (o, ctx) => ctx.move("packing")),

  packItem: (actor: SessionUser, id: string, lineId: string, qtyPacked: number) =>
    mutate(actor, id, (o, ctx) => {
      const i = line(o, lineId);
      if (i.unitType === "weight" && Math.abs(qtyPacked - i.qtyOrdered) > i.qtyOrdered * ctx.settings.weightTolerance)
        throw new ActionError("That weight is outside the allowed range.");
      if (i.unitType === "piece" && (qtyPacked < 1 || qtyPacked > i.qtyOrdered)) throw new ActionError("Quantity can't be more than ordered.");
      i.status = "packed";
      i.qtyPacked = qtyPacked;
    }),

  unpackItem: (actor: SessionUser, id: string, lineId: string) =>
    mutate(actor, id, (o, ctx) => {
      const i = line(o, lineId);
      if (i.status === "substituted") o.items = o.items.filter((x) => x.substituteFor !== lineId);
      if (i.substituteFor) {
        const orig = o.items.find((x) => x.lineId === i.substituteFor);
        o.items = o.items.filter((x) => x.lineId !== lineId);
        if (orig) orig.status = "pending";
      } else {
        i.status = "pending";
        i.qtyPacked = undefined;
        i.proposedProductId = undefined;
        i.awaitingSince = undefined;
      }
      afterApproval(o, ctx);
    }),

  markMissing: (actor: SessionUser, id: string, lineId: string, chosenProductId?: string) =>
    mutate(actor, id, (o, ctx) => {
      if (o.status !== "packing" && o.status !== "needs_approval") throw new ActionError("Start packing first.");
      const i = line(o, lineId);
      const chosen = chosenProductId ? ctx.product(chosenProductId) : undefined;
      const pick = chosen?.available ? chosen : bestSubstitute(o, i, ctx);
      if (o.subPref === "remove" || (!pick && o.subPref === "similar")) {
        i.status = "removed";
        return;
      }
      if (o.subPref === "similar" && pick) return substitute(o, i, pick, ctx);
      i.status = "awaiting";
      i.proposedProductId = pick?.id;
      i.awaitingSince = Date.now();
      if (o.status === "packing") ctx.move("needs_approval", `${i.name} is out of stock`);
    }),

  removeItem: (actor: SessionUser, id: string, lineId: string) =>
    mutate(actor, id, (o, ctx) => {
      const i = line(o, lineId);
      i.status = "removed";
      i.proposedProductId = undefined;
      i.awaitingSince = undefined;
      afterApproval(o, ctx);
    }),

  /** Shopper (from their order page) or staff (answered by phone). */
  resolveApproval: (actor: SessionUser, id: string, lineId: string, decision: "accept" | "remove") =>
    mutate(actor, id, (o, ctx) => {
      if (!ownsOrRuns(actor, o)) throw new ActionError("You can't change this order.");
      const i = line(o, lineId);
      if (i.status !== "awaiting") throw new ActionError("This item was already handled.");
      const p = i.proposedProductId ? ctx.product(i.proposedProductId) : undefined;
      if (decision === "accept" && p?.available) substitute(o, i, p, ctx);
      else {
        i.status = "removed";
        i.proposedProductId = undefined;
        i.awaitingSince = undefined;
      }
      afterApproval(o, ctx);
    }),

  finishPacking: (actor: SessionUser, id: string) =>
    mutate(actor, id, async (o, ctx) => {
      const open = o.items.filter((i) => i.status === "pending" || i.status === "awaiting");
      if (open.length) throw new ActionError(`${open.length} item${open.length > 1 ? "s" : ""} still to pack or resolve.`);
      if (!o.items.some((i) => i.status === "packed")) throw new ActionError("Nothing was packed. Cancel the order instead.");
      const itemsFinal = o.items.reduce((s, i) => s + itemBilled(i), 0);
      o.totalFinal = Math.max(itemsFinal + o.deliveryFee - o.walletUsed, 0);
      o.adjustment = settle(o.totalEstimated, o.totalFinal, o.paymentStatus === "paid", ctx.settings.absorbUpTo);
      o.invoiceNumber = await ctx.invoiceNumber();
      ctx.credit(o.adjustment.credited, "weight_adjustment", "Final bill was lower than paid");
      ctx.move("packed", "Final bill generated");
    }),

  dispatch: (actor: SessionUser, id: string, f: Pick<Fulfilment, "kind" | "riderId" | "riderName" | "riderPhone" | "partnerName" | "trackingUrl">) =>
    mutate(actor, id, (o, ctx) => {
      if (o.status !== "packed") throw new ActionError("Pack the order first.");
      o.fulfilment = { ...o.fulfilment, ...f };
      ctx.move(o.mode === "pickup" ? "ready_for_pickup" : "out_for_delivery", f.kind === "partner" ? `Booked with ${f.partnerName}` : undefined);
    }),

  completeHandover: (actor: SessionUser, id: string, code: string) =>
    mutate(actor, id, (o, ctx) => {
      if (actor.role === "rider" && o.fulfilment.riderId !== actor.id) throw new ActionError("This drop isn't assigned to you.");
      if (code.trim() !== o.fulfilment.code) throw new ActionError("That code doesn't match. Ask the customer to read it from their order page.");
      if (o.paymentStatus === "cod_due") o.paymentStatus = "collected";
      if (o.adjustment) o.adjustment = { ...o.adjustment, collectOnDelivery: 0 };
      ctx.move(o.status === "ready_for_pickup" ? "picked_up" : "delivered");
    }),

  failDelivery: (actor: SessionUser, id: string, reason: string) =>
    mutate(actor, id, (o, ctx) => {
      if (actor.role === "rider" && o.fulfilment.riderId !== actor.id) throw new ActionError("This drop isn't assigned to you.");
      o.fulfilment = { ...o.fulfilment, failReason: reason.slice(0, 120) };
      ctx.move("delivery_failed", reason.slice(0, 120));
    }),

  retryDelivery: (actor: SessionUser, id: string) => mutate(actor, id, (o, ctx) => ctx.move("out_for_delivery", "Retrying")),

  returnToStore: (actor: SessionUser, id: string) =>
    mutate(actor, id, (o, ctx) => {
      if (o.paymentStatus === "paid") {
        ctx.credit((o.totalFinal ?? o.totalEstimated) + o.walletUsed, "refund", "Order returned to store");
        o.paymentStatus = "refunded";
      }
      ctx.move("returned");
      ctx.restock();
    }),

  /** Gateway confirmed payment (webhook or verified checkout callback). Idempotent. */
  markPaid: (id: string) =>
    mutate(null, id, (o, ctx) => {
      if (o.status !== "placed") return;
      o.paymentStatus = "paid";
      ctx.move("confirmed", "Payment received");
    }),
};

/**
 * Runs on reads instead of a cron (Vercel's free plan only allows daily crons):
 * cancels orders left unpaid for 15 minutes and removes items a shopper didn't answer about in time.
 */
export async function expireStale(db: DB) {
  await connection();
  const settings = await getSettings();
  const unpaid = await db
    .select({ id: schema.orders.id })
    .from(schema.orders)
    .where(and(eq(schema.orders.status, "placed"), lt(schema.orders.createdAt, new Date(Date.now() - UNPAID_HOLD_MS))));
  for (const { id } of unpaid) {
    await mutate(null, id, (o, ctx) => {
      if (o.status !== "placed") return;
      ctx.credit(o.walletUsed, "refund", "Payment not completed");
      o.paymentStatus = "failed";
      ctx.move("cancelled", "Payment not completed in 15 minutes");
      ctx.restock();
    }).catch(() => {});
  }

  const limit = new Date(Date.now() - settings.substitutionTimeoutMin * 60_000);
  const stale = await db
    .selectDistinct({ id: schema.orderItems.orderId })
    .from(schema.orderItems)
    .where(and(eq(schema.orderItems.status, "awaiting"), lt(schema.orderItems.awaitingSince, limit)));
  for (const { id } of stale) {
    await mutate(null, id, (o, ctx) => {
      for (const i of o.items) {
        if (i.status === "awaiting" && (i.awaitingSince ?? 0) < limit.getTime()) {
          i.status = "removed";
          i.proposedProductId = undefined;
          i.awaitingSince = undefined;
        }
      }
      afterApproval(o, ctx);
    }).catch(() => {});
  }
}

export { isTerminal };
