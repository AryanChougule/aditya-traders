import { describe, expect, it } from "vitest";
import { PRODUCTS } from "./catalog";
import { gstBreakup, itemBilled, lineTotal, quote, settle, withinTolerance } from "./pricing";
import { DEFAULT_SETTINGS as S, deliveryFee } from "./settings";
import type { OrderItem } from "./types";

const tomato = PRODUCTS.find((p) => p.slug === "tomato")!; // ₹40/kg, loose
const atta = PRODUCTS.find((p) => p.slug.startsWith("aashirvaad"))!; // ₹285, pack
const get = (id: string) => PRODUCTS.find((p) => p.id === id);

describe("lineTotal", () => {
  it("prices loose items per kg from grams", () => {
    expect(lineTotal(tomato, 500)).toBe(2000);
    expect(lineTotal(tomato, 1250)).toBe(5000);
  });
  it("prices packs by count", () => {
    expect(lineTotal(atta, 2)).toBe(57000);
  });
});

describe("quote", () => {
  it("charges a distance-based fee below the free-delivery threshold", () => {
    const q = quote([{ productId: tomato.id, qty: 1000 }, { productId: atta.id, qty: 1 }], get, { mode: "delivery", km: 3 }, S);
    expect(q.subtotal).toBe(4000 + 28500);
    expect(q.deliveryFee).toBe(deliveryFee(S, 3));
    expect(q.hasLoose).toBe(true);
  });
  it("delivers free above the threshold and for pickup", () => {
    expect(quote([{ productId: atta.id, qty: 2 }], get, { mode: "delivery", km: 4.5 }, S).deliveryFee).toBe(0);
    expect(quote([{ productId: tomato.id, qty: 1000 }], get, { mode: "pickup" }, S).deliveryFee).toBe(0);
  });
  it("flags orders below the minimum", () => {
    expect(quote([{ productId: tomato.id, qty: 500 }], get, { mode: "pickup" }, S).belowMinimum).toBe(true);
  });
  it("never applies more wallet than the bill", () => {
    const q = quote([{ productId: atta.id, qty: 1 }], get, { mode: "pickup", wallet: 1_000_000 }, S);
    expect(q.walletUsed).toBe(28500);
    expect(q.total).toBe(0);
  });
});

describe("delivery fee bands", () => {
  it("picks the first band that covers the distance, even if bands are unsorted", () => {
    const s = { feeBands: [{ upToKm: 30, fee: 4000 }, { upToKm: 2, fee: 2000 }, { upToKm: 4, fee: 3000 }] };
    expect(deliveryFee(s, 1.5)).toBe(2000);
    expect(deliveryFee(s, 3)).toBe(3000);
    expect(deliveryFee(s, 99)).toBe(4000);
  });
});

describe("settle", () => {
  it("credits the wallet when the packed bill is lower", () => {
    expect(settle(50000, 48800, true, S.absorbUpTo)).toEqual({ credited: 1200, collectOnDelivery: 0, absorbed: 0 });
  });
  it("absorbs small overages and collects the rest", () => {
    expect(settle(50000, 50600, true, 1000)).toEqual({ credited: 0, collectOnDelivery: 0, absorbed: 600 });
    expect(settle(50000, 52500, true, 1000)).toEqual({ credited: 0, collectOnDelivery: 1500, absorbed: 1000 });
  });
  it("does nothing for cash on delivery, which collects the final bill", () => {
    expect(settle(50000, 52500, false, 1000)).toEqual({ credited: 0, collectOnDelivery: 0, absorbed: 0 });
  });
});

describe("withinTolerance", () => {
  it("allows ±10% of the ordered weight", () => {
    expect(withinTolerance(1000, 1100, 0.1)).toBe(true);
    expect(withinTolerance(1000, 900, 0.1)).toBe(true);
    expect(withinTolerance(1000, 1101, 0.1)).toBe(false);
  });
});

describe("GST", () => {
  const item = (over: Partial<OrderItem>): OrderItem => ({
    lineId: "x", productId: "p", name: "n", unitType: "piece", unitLabel: "1", qtyOrdered: 1, unitPrice: 10500, mrp: 10500,
    gstRate: 5, hsn: "0000", aisle: 1, status: "packed", ...over,
  });
  it("splits tax out of inclusive prices per rate", () => {
    const rows = gstBreakup([item({}), item({ lineId: "y", gstRate: 18, unitPrice: 11800 })]);
    expect(rows).toEqual([
      { rate: 5, taxable: 10000, tax: 500 },
      { rate: 18, taxable: 10000, tax: 1800 },
    ]);
  });
  it("ignores removed and substituted lines", () => {
    expect(itemBilled(item({ status: "removed" }))).toBe(0);
    expect(itemBilled(item({ status: "substituted" }))).toBe(0);
    expect(itemBilled(item({ unitType: "weight", unitPrice: 4000, qtyOrdered: 1000, qtyPacked: 1080 }))).toBe(4320);
  });
});
