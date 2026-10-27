import { deliveryFee as feeFor, type StoreSettings } from "./settings";
import type { CartLine, FulfilmentMode, Order, OrderItem, Paise, Product } from "./types";

/** Line total for a quantity: count for pieces, grams for loose items (price is per kg). */
export function lineTotal(p: Pick<Product, "unitType" | "price">, qty: number): Paise {
  return p.unitType === "weight" ? Math.round((p.price * qty) / 1000) : p.price * qty;
}

export function lineMrp(p: Pick<Product, "unitType" | "mrp">, qty: number): Paise {
  return p.unitType === "weight" ? Math.round((p.mrp * qty) / 1000) : p.mrp * qty;
}

export type Quote = {
  itemCount: number;
  subtotal: Paise;
  mrpTotal: Paise;
  savings: Paise;
  deliveryFee: Paise;
  walletUsed: Paise;
  total: Paise;
  hasLoose: boolean;
  belowMinimum: boolean;
  toFreeDelivery: Paise;
};

/**
 * The server re-runs this at checkout; the browser's number is only a preview.
 * `resolve` lets callers apply live price/availability overrides on top of the seed catalog.
 */
export function quote(
  lines: CartLine[],
  resolve: (id: string) => Product | undefined,
  opts: { mode: FulfilmentMode; km?: number; wallet?: Paise },
  s: Pick<StoreSettings, "freeDeliveryAt" | "minOrder" | "feeBands">,
): Quote {
  let subtotal = 0;
  let mrpTotal = 0;
  let itemCount = 0;
  let hasLoose = false;
  for (const l of lines) {
    const p = resolve(l.productId);
    if (!p) continue;
    subtotal += lineTotal(p, l.qty);
    mrpTotal += lineMrp(p, l.qty);
    itemCount += p.unitType === "weight" ? 1 : l.qty;
    if (p.unitType === "weight") hasLoose = true;
  }
  const free = subtotal >= s.freeDeliveryAt;
  const deliveryFee = opts.mode === "pickup" || free || subtotal === 0 ? 0 : feeFor(s, opts.km ?? 2);
  const gross = subtotal + deliveryFee;
  const walletUsed = Math.min(Math.max(opts.wallet ?? 0, 0), gross);
  return {
    itemCount,
    subtotal,
    mrpTotal,
    savings: mrpTotal - subtotal,
    deliveryFee,
    walletUsed,
    total: gross - walletUsed,
    hasLoose,
    belowMinimum: subtotal > 0 && subtotal < s.minOrder,
    toFreeDelivery: Math.max(s.freeDeliveryAt - subtotal, 0),
  };
}

/** Billed value of one order line once packed (or as ordered, before packing). */
export function itemBilled(i: OrderItem): Paise {
  if (i.status === "removed" || i.status === "substituted" || i.status === "missing" || i.status === "awaiting") return 0;
  const qty = i.qtyPacked ?? i.qtyOrdered;
  return i.unitType === "weight" ? Math.round((i.unitPrice * qty) / 1000) : i.unitPrice * qty;
}

export function itemEstimated(i: OrderItem): Paise {
  if (i.substituteFor) return 0;
  return i.unitType === "weight" ? Math.round((i.unitPrice * i.qtyOrdered) / 1000) : i.unitPrice * i.qtyOrdered;
}

/**
 * Settles the difference between what was paid at checkout and the packed bill.
 * Lower bill → credit the wallet. Higher bill → store absorbs a little, the rest is collected on delivery.
 */
export function settle(estimated: Paise, final: Paise, prepaid: boolean, absorbUpTo: Paise) {
  const diff = final - estimated;
  if (!prepaid) return { credited: 0, collectOnDelivery: 0, absorbed: 0 }; // COD simply collects the final bill
  if (diff <= 0) return { credited: -diff, collectOnDelivery: 0, absorbed: 0 };
  const absorbed = Math.min(diff, absorbUpTo);
  return { credited: 0, collectOnDelivery: diff - absorbed, absorbed };
}

/** Is a packed weight within tolerance of what was ordered? */
export function withinTolerance(ordered: number, packed: number, tol: number) {
  return Math.abs(packed - ordered) <= ordered * tol;
}

/** GST is included in shelf prices; split it out per rate for the invoice. */
export function gstBreakup(items: OrderItem[]) {
  const byRate = new Map<number, { taxable: Paise; tax: Paise }>();
  for (const i of items) {
    const gross = itemBilled(i);
    if (!gross) continue;
    const taxable = Math.round((gross * 100) / (100 + i.gstRate));
    const row = byRate.get(i.gstRate) ?? { taxable: 0, tax: 0 };
    row.taxable += taxable;
    row.tax += gross - taxable;
    byRate.set(i.gstRate, row);
  }
  return [...byRate.entries()].sort((a, b) => a[0] - b[0]).map(([rate, v]) => ({ rate, ...v }));
}

/** Amount still to be collected at the door or counter. */
export function amountDue(o: Pick<Order, "paymentStatus" | "totalFinal" | "totalEstimated" | "adjustment">): Paise {
  if (o.paymentStatus === "cod_due") return o.totalFinal ?? o.totalEstimated;
  if (o.paymentStatus === "paid") return o.adjustment?.collectOnDelivery ?? 0;
  return 0;
}
