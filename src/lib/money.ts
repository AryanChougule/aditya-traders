import type { Paise } from "./types";

const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 0 });

/** 12345 → "₹123.45", 12300 → "₹123" */
export function rupees(p: Paise): string {
  const sign = p < 0 ? "−" : "";
  return `${sign}₹${inr.format(Math.abs(p) / 100)}`;
}

export function discountPct(price: Paise, mrp: Paise): number {
  if (mrp <= price) return 0;
  return Math.round(((mrp - price) / mrp) * 100);
}

/** grams → "500 g" / "1.25 kg" */
export function grams(g: number): string {
  if (g < 1000) return `${g} g`;
  const kg = g / 1000;
  return `${Number.isInteger(kg) ? kg : kg.toFixed(2).replace(/0$/, "")} kg`;
}
