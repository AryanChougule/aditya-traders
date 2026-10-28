"use client";

import { BadgeIndianRupee, Bike, RotateCcw, Scale } from "lucide-react";
import { AddControl } from "@/components/shop/add-control";
import { Price } from "@/components/shop/price";
import { ProductArt } from "@/components/shop/product-art";
import { DEFAULT_WEIGHT, WEIGHT_STEP } from "@/lib/catalog";
import { pick, useLang, useT } from "@/components/i18n";
import { useSettings } from "@/components/providers";
import { useCart, useCartQty, useHydrated } from "@/lib/cart-store";
import { grams, rupees } from "@/lib/money";
import { lineTotal } from "@/lib/pricing";
import type { LiveProduct } from "@/lib/types";
import { cn } from "@/lib/utils";

const WEIGHTS = [250, 500, 1000, 2000];

export function ProductDetail({ product: p, categoryName, categoryNameMr }: { product: LiveProduct; categoryName: string; categoryNameMr: string }) {
  const lang = useLang();
  const t = useT();
  const name = pick(lang, p.name, p.nameMr);
  const settings = useSettings();
  const hydrated = useHydrated();
  const qty = useCartQty(p.id);
  const setQty = useCart((s) => s.setQty);
  const loose = p.unitType === "weight";

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:gap-10">
      <ProductArt icon={p.icon} tint={p.tint} dim={!p.available} label={name} className="w-full max-w-[520px] rounded-3xl" />

      <div className="grid content-start gap-5">
        <div className="grid gap-1">
          {p.brand ? <p className="text-sm font-bold text-primary">{p.brand}</p> : null}
          <h1 className="text-2xl font-semibold leading-tight sm:text-3xl">{name}</h1>
          <p className="text-muted">
            {lang === "mr" ? p.name : p.nameMr || p.nameHi} · {loose ? t("product.soldLoose") : p.unitLabel}
          </p>
        </div>

        <div className="grid gap-1">
          <Price price={p.price} mrp={p.mrp} unitType={p.unitType} size="lg" />
          <p className="text-sm text-muted">{t("product.mrpIncl")}</p>
        </div>

        {loose ? (
          <fieldset className="grid gap-2.5">
            <legend className="mb-2 text-sm font-bold">{t("product.howMuch")}</legend>
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
                <b>{t("product.finalAfterWeighing")}</b>{" "}
                {t("product.weighNote", { pct: Math.round(settings.weightTolerance * 100), step: WEIGHT_STEP, def: grams(DEFAULT_WEIGHT) })}
              </span>
            </p>
          </fieldset>
        ) : null}

        <div>
          <div className="flex items-center gap-3">
            {hydrated && qty > 0 ? (
              <p className="min-w-0 flex-1 text-sm leading-tight">
                <span className="block text-muted">{t("product.inCart")}</span>
                <b className="font-display text-lg tabular">{rupees(lineTotal(p, qty))}</b>
                {loose ? <span className="text-muted"> {t("common.approx")}</span> : null}
              </p>
            ) : null}
            <AddControl product={p} size="lg" className={hydrated && qty > 0 ? "max-w-[180px]" : "md:max-w-xs"} />
          </div>
        </div>

        <ul className="grid gap-2.5 rounded-2xl bg-surface p-4 text-sm ring-1 ring-border">
          <li className="flex gap-3">
            <Bike className="size-5 shrink-0 text-primary" aria-hidden />
            <span>{t("product.promiseSlot", { amount: rupees(settings.freeDeliveryAt) })}</span>
          </li>
          <li className="flex gap-3">
            <RotateCcw className="size-5 shrink-0 text-primary" aria-hidden />
            <span>{t("product.promiseFresh")}</span>
          </li>
          <li className="flex gap-3">
            <BadgeIndianRupee className="size-5 shrink-0 text-primary" aria-hidden />
            <span>{t("product.promiseGst", { hsn: p.hsn || "—", gst: p.gstRate })}</span>
          </li>
        </ul>

        <section aria-label="About this item" className="grid gap-1">
          <h2 className="text-base font-semibold">{t("product.about")}</h2>
          <p className="text-muted">{lang === "mr" ? t(loose ? "product.descLoose" : "product.descPack") : p.description}</p>
          <p className="text-sm text-muted">
            {t("product.category")}: {pick(lang, categoryName, categoryNameMr)}
          </p>
        </section>
      </div>
    </div>
  );
}
