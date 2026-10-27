"use client";

import { BadgeIndianRupee, Bike, RotateCcw, Scale } from "lucide-react";
import { AddControl } from "@/components/shop/add-control";
import { Price } from "@/components/shop/price";
import { ProductArt } from "@/components/shop/product-art";
import { DEFAULT_WEIGHT, WEIGHT_STEP } from "@/lib/catalog";
import { useSettings } from "@/components/providers";
import { useCart, useCartQty, useHydrated } from "@/lib/cart-store";
import { grams, rupees } from "@/lib/money";
import { lineTotal } from "@/lib/pricing";
import type { LiveProduct } from "@/lib/types";
import { cn } from "@/lib/utils";

const WEIGHTS = [250, 500, 1000, 2000];

export function ProductDetail({ product: p, categoryName }: { product: LiveProduct; categoryName: string }) {
  const settings = useSettings();
  const hydrated = useHydrated();
  const qty = useCartQty(p.id);
  const setQty = useCart((s) => s.setQty);
  const loose = p.unitType === "weight";

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:gap-10">
      <ProductArt icon={p.icon} tint={p.tint} dim={!p.available} label={`${p.name} illustration`} className="w-full max-w-[520px] rounded-3xl" />

      <div className="grid content-start gap-5">
        <div className="grid gap-1">
          {p.brand ? <p className="text-sm font-bold text-primary">{p.brand}</p> : null}
          <h1 className="text-2xl font-semibold leading-tight sm:text-3xl">{p.name}</h1>
          <p className="text-muted">
            <span lang="hi">{p.nameHi}</span> · {loose ? "Sold loose, by weight" : p.unitLabel}
          </p>
        </div>

        <div className="grid gap-1">
          <Price price={p.price} mrp={p.mrp} unitType={p.unitType} size="lg" />
          <p className="text-sm text-muted">MRP inclusive of all taxes</p>
        </div>

        {loose ? (
          <fieldset className="grid gap-2.5">
            <legend className="mb-2 text-sm font-bold">How much?</legend>
            <div className="grid grid-cols-4 gap-2">
              {WEIGHTS.map((g) => {
                const selected = hydrated && qty === g;
                return (
                  <button
                    key={g}
                    type="button"
                    disabled={!p.available}
                    aria-pressed={selected}
                    onClick={() => setQty(p, g)}
                    className={cn(
                      "grid h-16 cursor-pointer content-center justify-items-center rounded-xl ring-1 transition-[background-color,box-shadow,transform] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50",
                      selected ? "bg-primary-soft ring-2 ring-primary" : "bg-surface ring-border hover:bg-surface-2",
                    )}
                  >
                    <span className="font-display font-semibold">{grams(g)}</span>
                    <span className="text-xs text-muted tabular">~{rupees(lineTotal(p, g))}</span>
                  </button>
                );
              })}
            </div>
            <p className="flex items-start gap-2 rounded-xl bg-accent-soft px-3.5 py-2.5 text-sm">
              <Scale className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
              <span>
                <b>Final price after weighing.</b> We pack within ±{settings.weightTolerance * 100}% of what you order (in {WEIGHT_STEP} g steps,
                from {grams(DEFAULT_WEIGHT)} by default). If it weighs less, the difference goes to your wallet.
              </span>
            </p>
          </fieldset>
        ) : null}

        <div>
          <div className="flex items-center gap-3">
            {hydrated && qty > 0 ? (
              <p className="min-w-0 flex-1 text-sm leading-tight">
                <span className="block text-muted">In your cart</span>
                <b className="font-display text-lg tabular">{rupees(lineTotal(p, qty))}</b>
                {loose ? <span className="text-muted"> approx.</span> : null}
              </p>
            ) : null}
            <AddControl product={p} size="lg" className={hydrated && qty > 0 ? "max-w-[180px]" : "md:max-w-xs"} />
          </div>
        </div>

        <ul className="grid gap-2.5 rounded-2xl bg-surface p-4 text-sm ring-1 ring-border">
          <li className="flex gap-3">
            <Bike className="size-5 shrink-0 text-primary" aria-hidden />
            <span>Delivered in your chosen 2-hour slot. Free above {rupees(settings.freeDeliveryAt)}.</span>
          </li>
          <li className="flex gap-3">
            <RotateCcw className="size-5 shrink-0 text-primary" aria-hidden />
            <span>Damaged or not fresh? Tell the rider at the door or within 24 hours and we'll replace it.</span>
          </li>
          <li className="flex gap-3">
            <BadgeIndianRupee className="size-5 shrink-0 text-primary" aria-hidden />
            <span>GST invoice with every order (HSN {p.hsn}, {p.gstRate}% GST included).</span>
          </li>
        </ul>

        <section aria-label="About this item" className="grid gap-1">
          <h2 className="text-base font-semibold">About this item</h2>
          <p className="text-muted">{p.description}</p>
          <p className="text-sm text-muted">Category: {categoryName}</p>
        </section>
      </div>
    </div>
  );
}
