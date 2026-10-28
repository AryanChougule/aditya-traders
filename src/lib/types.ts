// Money is always integer paise. ₹1 = 100.
export type Paise = number;

export type Tint = "green" | "orange" | "yellow" | "blue" | "red" | "purple" | "brown" | "teal";

export type Category = {
  id: string;
  slug: string;
  name: string;
  nameHi: string;
  /** Marathi display name (Devanagari); empty falls back to English */
  nameMr: string;
  icon: string;
  tint: Tint;
};

/** `piece`: qty is a count. `weight`: qty is grams, price is per kg. */
export type UnitType = "piece" | "weight";

export type Product = {
  id: string;
  slug: string;
  name: string;
  nameHi: string;
  /** Marathi display name (Devanagari); empty falls back to English */
  nameMr: string;
  brand?: string;
  categoryId: string;
  unitType: UnitType;
  /** "1 kg", "500 ml", "per kg" */
  unitLabel: string;
  price: Paise;
  mrp: Paise;
  hsn: string;
  gstRate: 0 | 5 | 12 | 18;
  aisle: number;
  aliases: string[];
  icon: string;
  tint: Tint;
  tags?: ("bestseller" | "fresh" | "essential")[];
  /** products that can stand in for each other (all atta, all rice…); substitutions stay inside a group */
  group?: string;
  /** net weight of a pack in grams, so packs and loose items can be compared per kg */
  netGrams?: number;
  description: string;
  /** default stock count for the seed inventory */
  stock: number;
};

/** A product as the shop sees it right now: live price and whether it can be ordered. */
export type LiveProduct = Product & { available: boolean; stockLeft: number };

/** Cart lines carry a snapshot for instant totals; the server re-prices everything at checkout. */
export type CartLine = {
  productId: string;
  qty: number;
  snap?: Pick<LiveProduct, "slug" | "name" | "nameMr" | "brand" | "price" | "mrp" | "unitType" | "unitLabel" | "icon" | "tint" | "available" | "stockLeft">;
};

export type FulfilmentMode = "delivery" | "pickup";
export type PaymentMethod = "upi" | "card" | "cod";
export type SubPref = "similar" | "ask" | "remove";

export type OrderStatus =
  | "placed"
  | "confirmed"
  | "packing"
  | "needs_approval"
  | "packed"
  | "out_for_delivery"
  | "ready_for_pickup"
  | "delivered"
  | "picked_up"
  | "delivery_failed"
  | "returned"
  | "cancelled";

export type PaymentStatus = "pending" | "paid" | "cod_due" | "collected" | "refunded" | "failed";

export type ItemStatus = "pending" | "packed" | "missing" | "awaiting" | "substituted" | "removed";

export type OrderItem = {
  lineId: string;
  productId: string;
  name: string;
  unitType: UnitType;
  unitLabel: string;
  qtyOrdered: number;
  /** count or grams actually packed */
  qtyPacked?: number;
  unitPrice: Paise;
  mrp: Paise;
  gstRate: number;
  hsn: string;
  aisle: number;
  status: ItemStatus;
  /** set on a substitute row: the lineId it replaces */
  substituteFor?: string;
  /** set on a missing row awaiting the shopper: suggested replacement */
  proposedProductId?: string;
  awaitingSince?: number;
  /** display-only, filled in when the order is loaded */
  icon?: string;
  tint?: Tint;
  proposed?: { name: string; unitLabel: string; unitType: UnitType; price: Paise; icon: string; tint: Tint };
};

export type Address = {
  id: string;
  label: "Home" | "Work" | "Other";
  line1: string;
  area: string;
  landmark: string;
  pincode: string;
};

export type Slot = { id: string; date: string; label: string; start: number; end: number };

export type TimelineEntry = { status: OrderStatus; at: number; note?: string };

export type Fulfilment = {
  kind: "own" | "partner" | "pickup";
  riderId?: string;
  /** copied at dispatch so the shopper's page can show who is coming */
  riderName?: string;
  riderPhone?: string;
  partnerName?: string;
  trackingUrl?: string;
  /** 4-digit code the shopper reads out to the rider / at the counter */
  code: string;
  failReason?: string;
};

export type Order = {
  id: string;
  number: string;
  createdAt: number;
  customer: { id: string; name: string; phone: string };
  mode: FulfilmentMode;
  address?: Address;
  slot: Slot;
  subPref: SubPref;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  items: OrderItem[];
  deliveryFee: Paise;
  walletUsed: Paise;
  /** what the shopper paid / owes at checkout (estimated for loose items) */
  totalEstimated: Paise;
  /** set when packing finishes */
  totalFinal?: Paise;
  /** difference settled after weighing: + credited to wallet, - collected on delivery */
  adjustment?: { credited: Paise; collectOnDelivery: Paise; absorbed: Paise };
  invoiceNumber?: string;
  fulfilment: Fulfilment;
  timeline: TimelineEntry[];
};

export type LedgerEntry = {
  id: string;
  customerId: string;
  at: number;
  amount: Paise;
  kind: "weight_adjustment" | "refund" | "used" | "goodwill";
  orderNumber?: string;
  note: string;
};

export type Rider = { id: string; name: string; phone: string };
