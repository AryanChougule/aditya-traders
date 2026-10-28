"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ArrowRight, Bike, Scale, ShoppingBasket, Trash2 } from "lucide-react";
import { refreshCartAction } from "@/app/actions";
import { pick, T, useLang, useT } from "@/components/i18n";
import { useSettings } from "@/components/providers";
import { AddControl } from "@/components/shop/add-control";
import { Bill } from "@/components/shop/bill";
import { ProductArt } from "@/components/shop/product-art";
import { ProductRail } from "@/components/shop/product-rail";
import { Button, ButtonLink } from "@/components/ui/button";
import { cartQuote, useCart, useHydrated } from "@/lib/cart-store";
import { grams, rupees } from "@/lib/money";
import { lineMrp, lineTotal } from "@/lib/pricing";
import type { LiveProduct } from "@/lib/types";

export function CartView({ essentials }: { essentials: LiveProduct[] }) {
  const hydrated = useHydrated();
  const settings = useSettings();
  const t = useT();
  const lang = useLang();
  const cart = useCart((s) => s.cart);
  const remove = useCart((s) => s.remove);
  const clear = useCart((s) => s.clear);
  const refresh = useCart((s) => s.refresh);

  // prices and stock may have changed since things were added
  const ids = cart.map((l) => l.productId).join(",");
  useEffect(() => {
    if (!hydrated || !ids) return;
    refreshCartAction(ids.split(",")).then(refresh).catch(() => {});
  }, [hydrated, ids, refresh]);

  if (!hydrated) return <CartSkeleton />;

  const lines = cart.filter((l) => l.snap);
  const inStock = lines.filter((l) => l.snap!.available);
  const q = cartQuote(cart, settings);
  const progress = Math.min(100, Math.round((q.subtotal / Math.max(settings.freeDeliveryAt, 1)) * 100));
  const missed = essentials.filter((p) => !cart.some((l) => l.productId === p.id));

  if (!lines.length)
    return (
      <div className="grid grid-cols-1 gap-8">
        <div className="grid justify-items-center gap-3 rounded-3xl bg-surface px-6 py-12 text-center ring-1 ring-border">
          <span className="grid size-16 place-items-center rounded-2xl bg-primary-soft text-primary">
            <ShoppingBasket className="size-8" aria-hidden />
          </span>
          <h1 className="text-xl font-semibold">{t("cart.emptyTitle")}</h1>
          <p className="max-w-xs text-muted">{t("cart.emptyBody")}</p>
          <ButtonLink href="/shop" className="mt-1">
            {t("common.startShopping")}
          </ButtonLink>
        </div>
        <ProductRail label="Monthly essentials" title={<T k="home.essentials" />} products={essentials} />
      </div>
    );

  const blocked = q.belowMinimum || !inStock.length || !settings.acceptingOrders;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-8">
      <div className="grid gap-4">
        <div className="flex items-end justify-between">
          <h1 className="text-2xl font-semibold">{t("nav.cart")}</h1>
          <button onClick={clear} className="inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-muted hover:text-danger">
            <Trash2 className="size-4" aria-hidden /> {t("cart.empty")}
          </button>
        </div>

        <div className="rounded-2xl bg-surface p-4 ring-1 ring-border">
          {q.toFreeDelivery > 0 ? (
            <p className="flex items-center gap-2 text-sm">
              <Bike className="size-4 text-primary" aria-hidden />
              {t("cart.addMoreFree", { amount: rupees(q.toFreeDelivery) })}
            </p>
          ) : (
            <p className="flex items-center gap-2 text-sm font-bold text-primary">
              <Bike className="size-4" aria-hidden /> {t("cart.freeUnlocked")}
            </p>
          )}
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label={t("cart.progressAria")}>
            <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <ul className="divide-y divide-border rounded-2xl bg-surface ring-1 ring-border">
          {lines.map(({ productId, qty, snap }) => {
            const p = { ...snap!, id: productId } as unknown as LiveProduct;
            return (
              <li key={productId} className="flex gap-3 p-3.5">
                <Link href={`/p/${p.slug}`} className="w-16 shrink-0" aria-hidden tabIndex={-1}>
                  <ProductArt icon={p.icon} tint={p.tint} dim={!p.available} className="rounded-xl" />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <Link href={`/p/${p.slug}`} className="line-clamp-2 font-semibold leading-snug hover:text-primary">
                      {p.brand ? `${p.brand} ` : ""}
                      {pick(lang, p.name, p.nameMr)}
                    </Link>
                    <p className="text-sm text-muted">
                      {p.unitType === "weight" ? (
                        <>
                          {grams(qty)} · {rupees(p.price)}/kg <span className="font-semibold text-accent">· {t("common.approx")}</span>
                        </>
                      ) : (
                        p.unitLabel
                      )}
                    </p>
                    {!p.available ? <p className="mt-1 text-sm font-bold text-danger">{t("cart.lineOut")}</p> : null}
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    {p.available ? (
                      <AddControl product={p} className="w-[148px]" />
                    ) : (
                      <button onClick={() => remove(productId)} className="h-10 cursor-pointer rounded-xl px-3 text-sm font-bold text-danger hover:bg-danger-soft">
                        {t("common.remove")}
                      </button>
                    )}
                    <span className="w-20 text-right leading-tight">
                      <b className="block tabular">{rupees(lineTotal(p, qty))}</b>
                      {p.mrp > p.price ? <span className="text-xs text-muted line-through tabular">{rupees(lineMrp(p, qty))}</span> : null}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        {q.hasLoose ? (
          <p className="flex items-start gap-2 rounded-xl bg-accent-soft px-3.5 py-2.5 text-sm">
            <Scale className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
            {t("cart.looseNote")}
          </p>
        ) : null}
      </div>

      <aside className="grid gap-3 lg:sticky lg:top-32">
        <Bill
          rows={[
            { label: t("bill.itemTotal"), value: q.subtotal, strike: q.savings > 0 ? q.mrpTotal : undefined },
            { label: t("bill.deliveryFee"), value: q.deliveryFee === 0 ? t("common.free") : q.deliveryFee, tone: q.deliveryFee === 0 ? "save" : undefined },
            ...(q.savings > 0 ? [{ label: t("bill.saveMrp"), value: q.savings, tone: "save" as const }] : []),
          ]}
          total={q.total}
          totalLabel={q.hasLoose ? t("bill.toPayEst") : t("bill.toPay")}
          note={t("cart.feeNote")}
        />
        {q.belowMinimum ? (
          <p className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm font-semibold text-danger" role="status">
            {t("cart.minOrder", { min: rupees(settings.minOrder), more: rupees(settings.minOrder - q.subtotal) })}
          </p>
        ) : null}
        <div className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-20 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur md:static md:border-0 md:bg-transparent md:p-0">
          {blocked ? (
            <Button size="lg" disabled className="w-full justify-between">
              <span className="tabular">{rupees(q.total)}</span>
              <span>{!settings.acceptingOrders ? t("cart.paused") : q.belowMinimum ? t("cart.addMore", { amount: rupees(settings.minOrder - q.subtotal) }) : t("cart.nothingInStock")}</span>
            </Button>
          ) : (
            <ButtonLink href="/checkout" size="lg" className="w-full justify-between">
              <span className="tabular">{rupees(q.total)}</span>
              <span className="flex items-center gap-1.5">
                {t("cart.checkout")} <ArrowRight className="size-5" aria-hidden />
              </span>
            </ButtonLink>
          )}
        </div>
      </aside>

      <div className="lg:col-span-2">
        <ProductRail label="Did you forget?" title={<T k="cart.forgot" />} sub={<T k="cart.forgotSub" />} products={missed} />
      </div>
    </div>
  );
}

function CartSkeleton() {
  return (
    <div className="grid gap-4" aria-busy>
      <div className="h-8 w-32 rounded-lg bg-surface-2" />
      <div className="h-16 rounded-2xl bg-surface-2" />
      <div className="h-64 rounded-2xl bg-surface-2" />
    </div>
  );
}
