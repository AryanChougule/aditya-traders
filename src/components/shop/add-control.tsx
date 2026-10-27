"use client";

import { Minus, Plus } from "lucide-react";
import { DEFAULT_WEIGHT, WEIGHT_STEP } from "@/lib/catalog";
import { useCart, useCartQty, useHydrated } from "@/lib/cart-store";
import { grams } from "@/lib/money";
import type { LiveProduct } from "@/lib/types";
import { cn } from "@/lib/utils";

const MAX_PIECES = 12;
const MAX_GRAMS = 5000;

/** Add button that turns into a stepper. Steps by count for packs and by 250 g for loose items. */
export function AddControl({ product, size = "md", className }: { product: LiveProduct; size?: "md" | "lg"; className?: string }) {
  const hydrated = useHydrated();
  const qty = useCartQty(product.id);
  const setQty = useCart((s) => s.setQty);
  const loose = product.unitType === "weight";
  const max = loose ? MAX_GRAMS : Math.max(1, Math.min(MAX_PIECES, product.stockLeft));
  const h = size === "lg" ? "h-12" : "h-11";

  if (!hydrated) return <div className={cn(h, "w-full rounded-xl bg-surface-2", className)} aria-hidden />;

  if (!product.available)
    return (
      <div className={cn(h, "grid w-full place-items-center rounded-xl border border-dashed border-border text-sm font-semibold text-muted", className)}>
        Out of stock
      </div>
    );

  if (qty === 0)
    return (
      <button
        type="button"
        onClick={() => setQty(product, loose ? DEFAULT_WEIGHT : 1)}
        aria-label={`Add ${product.name} to cart`}
        className={cn(
          h,
          "inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border-[1.5px] border-primary bg-surface font-bold text-primary transition-[background-color,transform] duration-150 hover:bg-primary-soft active:scale-[0.97]",
          size === "lg" && "text-base",
          className,
        )}
      >
        <Plus className="size-4" strokeWidth={2.5} aria-hidden />
        Add
      </button>
    );

  const step = loose ? WEIGHT_STEP : 1;
  const removing = loose ? qty - step < WEIGHT_STEP : qty - step <= 0;
  return (
    <div
      className={cn(h, "flex w-full items-center justify-between rounded-xl bg-primary text-primary-fg animate-pop", className)}
      role="group"
      aria-label={`${product.name} quantity`}
    >
      <button
        type="button"
        onClick={() => setQty(product, removing ? 0 : qty - step)}
        aria-label={removing ? `Remove ${product.name}` : `Decrease ${product.name}`}
        className="grid h-full w-11 shrink-0 cursor-pointer place-items-center rounded-l-xl transition-colors hover:bg-black/10 active:bg-black/20"
      >
        <Minus className="size-4" strokeWidth={2.5} aria-hidden />
      </button>
      <span className="min-w-0 truncate text-center text-[15px] font-bold tabular" aria-live="polite">
        {loose ? grams(qty) : qty}
      </span>
      <button
        type="button"
        onClick={() => setQty(product, Math.min(qty + step, max))}
        disabled={qty >= max}
        aria-label={`Increase ${product.name}`}
        className="grid h-full w-11 shrink-0 cursor-pointer place-items-center rounded-r-xl transition-colors hover:bg-black/10 active:bg-black/20 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Plus className="size-4" strokeWidth={2.5} aria-hidden />
      </button>
    </div>
  );
}
