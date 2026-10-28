import { sql } from "drizzle-orm";
import { boolean, index, integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import type { Address, Fulfilment, Slot } from "@/lib/types";

/*
 * Tables follow the data model in the design doc (§06). Money is integer paise everywhere.
 * Orders snapshot the address, slot and item prices so later edits never rewrite history.
 */

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  phone: text("phone").notNull().unique(),
  name: text("name").notNull().default(""),
  role: text("role", { enum: ["customer", "owner", "packer", "rider"] }).notNull().default("customer"),
  subPref: text("sub_pref", { enum: ["similar", "ask", "remove"] }).notNull().default("similar"),
  disabled: boolean("disabled").notNull().default(false),
  createdAt: createdAt(),
});

export const sessions = pgTable(
  "sessions",
  {
    /** sha-256 of the cookie token; the raw token is never stored */
    id: text("id").primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const addresses = pgTable(
  "addresses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    label: text("label", { enum: ["Home", "Work", "Other"] }).notNull(),
    line1: text("line1").notNull(),
    area: text("area").notNull(),
    landmark: text("landmark").notNull().default(""),
    pincode: text("pincode").notNull(),
    isDefault: boolean("is_default").notNull().default(false),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("addresses_user_idx").on(t.userId)],
);

export const categories = pgTable("categories", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  nameHi: text("name_hi").notNull().default(""),
  nameMr: text("name_mr").notNull().default(""),
  icon: text("icon").notNull(),
  tint: text("tint").notNull(),
  sort: integer("sort").notNull().default(0),
});

export const products = pgTable(
  "products",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    nameHi: text("name_hi").notNull().default(""),
    nameMr: text("name_mr").notNull().default(""),
    brand: text("brand"),
    categoryId: text("category_id").notNull().references(() => categories.id),
    unitType: text("unit_type", { enum: ["piece", "weight"] }).notNull(),
    unitLabel: text("unit_label").notNull(),
    price: integer("price").notNull(),
    mrp: integer("mrp").notNull(),
    hsn: text("hsn").notNull().default(""),
    gstRate: integer("gst_rate").notNull().default(0),
    aisle: integer("aisle").notNull().default(1),
    aliases: jsonb("aliases").$type<string[]>().notNull().default([]),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    icon: text("icon").notNull(),
    tint: text("tint").notNull(),
    group: text("group"),
    netGrams: integer("net_grams"),
    description: text("description").notNull().default(""),
    stock: integer("stock").notNull().default(0),
    available: boolean("available").notNull().default(true),
    /** soft delete: hidden from the shop, kept for old orders and invoices */
    active: boolean("active").notNull().default(true),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("products_category_idx").on(t.categoryId)],
);

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    number: text("number").notNull().unique(),
    userId: uuid("user_id").notNull().references(() => users.id),
    customerName: text("customer_name").notNull(),
    customerPhone: text("customer_phone").notNull(),
    mode: text("mode", { enum: ["delivery", "pickup"] }).notNull(),
    address: jsonb("address").$type<Address | null>(),
    slotId: text("slot_id").notNull(),
    slot: jsonb("slot").$type<Slot>().notNull(),
    subPref: text("sub_pref", { enum: ["similar", "ask", "remove"] }).notNull(),
    paymentMethod: text("payment_method", { enum: ["upi", "card", "cod"] }).notNull(),
    paymentStatus: text("payment_status", { enum: ["pending", "paid", "cod_due", "collected", "refunded", "failed"] }).notNull(),
    status: text("status").notNull(),
    deliveryFee: integer("delivery_fee").notNull(),
    walletUsed: integer("wallet_used").notNull().default(0),
    totalEstimated: integer("total_estimated").notNull(),
    totalFinal: integer("total_final"),
    adjustment: jsonb("adjustment").$type<{ credited: number; collectOnDelivery: number; absorbed: number } | null>(),
    invoiceNumber: text("invoice_number").unique(),
    fulfilment: jsonb("fulfilment").$type<Fulfilment>().notNull(),
    razorpayOrderId: text("razorpay_order_id").unique(),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("orders_user_idx").on(t.userId), index("orders_status_idx").on(t.status), index("orders_slot_idx").on(t.slotId)],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    sort: integer("sort").notNull(),
    productId: text("product_id").notNull(),
    name: text("name").notNull(),
    unitType: text("unit_type", { enum: ["piece", "weight"] }).notNull(),
    unitLabel: text("unit_label").notNull(),
    qtyOrdered: integer("qty_ordered").notNull(),
    qtyPacked: integer("qty_packed"),
    unitPrice: integer("unit_price").notNull(),
    mrp: integer("mrp").notNull(),
    gstRate: integer("gst_rate").notNull(),
    hsn: text("hsn").notNull(),
    aisle: integer("aisle").notNull(),
    status: text("status", { enum: ["pending", "packed", "missing", "awaiting", "substituted", "removed"] }).notNull(),
    substituteFor: uuid("substitute_for"),
    proposedProductId: text("proposed_product_id"),
    awaitingSince: timestamp("awaiting_since", { withTimezone: true }),
  },
  (t) => [index("order_items_order_idx").on(t.orderId)],
);

export const orderEvents = pgTable(
  "order_events",
  {
    id: serial("id").primaryKey(),
    orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    status: text("status").notNull(),
    note: text("note"),
    actorId: uuid("actor_id"),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("order_events_order_idx").on(t.orderId)],
);

export const ledger = pgTable(
  "ledger",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id),
    amount: integer("amount").notNull(),
    kind: text("kind", { enum: ["weight_adjustment", "refund", "used", "goodwill"] }).notNull(),
    orderNumber: text("order_number"),
    note: text("note").notNull(),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("ledger_user_idx").on(t.userId)],
);

/** One row per gateway payment; the unique id makes webhook retries harmless. */
export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").notNull().references(() => orders.id),
  provider: text("provider").notNull(),
  providerPaymentId: text("provider_payment_id").notNull(),
  amount: integer("amount").notNull(),
  status: text("status").notNull(),
  createdAt: createdAt(),
}, (t) => [uniqueIndex("payments_provider_id_idx").on(t.provider, t.providerPaymentId)]);

/** Gap-free sequences: order numbers and per-financial-year invoice numbers. */
export const counters = pgTable("counters", {
  key: text("key").primaryKey(),
  value: integer("value").notNull(),
});

export const settings = pgTable("settings", {
  id: integer("id").primaryKey().default(1),
  data: jsonb("data").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const zeroSearches = pgTable("zero_searches", {
  id: serial("id").primaryKey(),
  q: text("q").notNull(),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
});

export const auditLog = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  actorId: uuid("actor_id"),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  data: jsonb("data"),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
});

/** Coarse per-key rate limiting (login attempts) without another service. */
export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull().default(sql`now()`),
});
