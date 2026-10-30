"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { ChevronRight, Clock, Home, LayoutGrid, MapPin, ReceiptText, Search, ShoppingCart, User } from "lucide-react";
import { Brand } from "@/components/brand";
import { LangSwitch, useLang, useT } from "@/components/i18n";
import { useSettings } from "@/components/providers";
import { hourLabel, type Key } from "@/lib/i18n";
import { cartQuote, useCart, useHydrated } from "@/lib/cart-store";
import { rupees } from "@/lib/money";
import { storeClock } from "@/lib/slots";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";

function useCartSummary() {
  const cart = useCart((s) => s.cart);
  return cartQuote(cart, useSettings());
}

function DeliverTo() {
  const s = useSettings();
  const t = useT();
  const farthest = Math.ceil(Math.max(0, ...Object.values(s.serviceable)));
  return (
    <Link href="/account#addresses" className="flex min-w-0 items-center gap-1.5 rounded-lg py-1 text-left text-sm hover:text-primary">
      <MapPin className="size-4 shrink-0 text-primary" aria-hidden />
      <span className="min-w-0 truncate font-semibold">{s.acceptingOrders ? t("chrome.deliverWithin", { km: farthest || 5 }) : t("chrome.paused")}</span>
      <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden />
    </Link>
  );
}

export function StoreStatus({ className, audience = "shopper" }: { className?: string; audience?: "shopper" | "store" }) {
  const now = useNow();
  const s = useSettings();
  const lang = useLang();
  const t = useT();
  if (!now) return <span className={cn("inline-block h-5 w-40 rounded bg-surface-2", className)} aria-hidden />;
  const c = storeClock(s, now);
  const open = c.open;
  const h = (x: number) => hourLabel(lang, x);
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm", className)}>
      <span className={cn("size-2 rounded-full", open ? "bg-primary" : "bg-danger")} aria-hidden />
      <b className="font-bold">{open ? t("chrome.openNow") : t("chrome.closed")}</b>
      <span className="text-muted">
        <Clock className="mr-1 inline size-3.5 align-[-2px]" aria-hidden />
        {c.open
          ? t("chrome.until", { time: h(c.until) })
          : audience === "store" || !c.tomorrow
            ? t("chrome.opens", { time: h(c.opensAt) })
            : t("chrome.opensOrderNow", { time: h(c.opensAt) })}
      </span>
    </span>
  );
}

function ShopHeaderView({ pathname }: { pathname: string }) {
  const hydrated = useHydrated();
  const { itemCount, total } = useCartSummary();
  const t = useT();
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/95 pt-[env(safe-area-inset-top)] backdrop-blur supports-[backdrop-filter]:bg-surface/85">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5 md:gap-6">
        <Brand />
        <Link
          href="/search"
          className={cn(
            "hidden h-11 min-w-0 flex-1 items-center gap-2 rounded-xl bg-surface-2 px-3.5 text-muted ring-1 ring-transparent transition hover:ring-border md:flex",
            pathname === "/search" && "md:hidden",
          )}
        >
          <Search className="size-5" aria-hidden />
          <span className="truncate">{t("search.placeholder")}</span>
        </Link>
        <nav className="ml-auto hidden items-center gap-1 md:flex" aria-label="Main">
          <HeaderLink href="/categories" label={t("nav.categories")} active={pathname.startsWith("/c")} />
          <HeaderLink href="/orders" label={t("nav.orders")} active={pathname.startsWith("/orders")} />
          <HeaderLink href="/account" label={t("nav.account")} active={pathname.startsWith("/account")} />
        </nav>
        <LangSwitch className="hidden lg:inline-flex" />
        <Link
          href="/cart"
          className="relative ml-auto inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-3.5 font-bold text-primary-fg transition-transform active:scale-[0.97] md:ml-0"
          aria-label={hydrated && itemCount ? t("chrome.cartAria", { n: itemCount, total: rupees(total) }) : t("nav.cart")}
        >
          <ShoppingCart className="size-5" aria-hidden />
          <span className="hidden tabular sm:inline">{hydrated && itemCount ? rupees(total) : t("nav.cart")}</span>
          {hydrated && itemCount ? (
            <span
              key={itemCount}
              className="absolute -right-1.5 -top-1.5 grid min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] font-bold text-white animate-pop dark:text-[#2a1d00] sm:hidden"
            >
              {itemCount}
            </span>
          ) : null}
        </Link>
      </div>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 pb-2">
        <DeliverTo />
        <div className="flex shrink-0 items-center gap-3">
          <StoreStatus className="hidden shrink-0 sm:inline-flex" />
          <LangSwitch className="lg:hidden" />
        </div>
      </div>
    </header>
  );
}

function HeaderLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn("rounded-lg px-3 py-2.5 text-[15px] font-semibold text-muted hover:bg-surface-2 hover:text-fg", active && "text-primary")}
    >
      {label}
    </Link>
  );
}

const TABS: { href: string; label: Key; icon: typeof Home; match: (p: string) => boolean }[] = [
  { href: "/shop", label: "nav.home", icon: Home, match: (p: string) => p === "/shop" },
  { href: "/categories", label: "nav.categories", icon: LayoutGrid, match: (p: string) => p.startsWith("/categories") || p.startsWith("/c/") },
  { href: "/search", label: "nav.search", icon: Search, match: (p: string) => p.startsWith("/search") },
  { href: "/orders", label: "nav.orders", icon: ReceiptText, match: (p: string) => p.startsWith("/orders") },
  { href: "/account", label: "nav.account", icon: User, match: (p: string) => p.startsWith("/account") },
];

function BottomNavView({ pathname }: { pathname: string }) {
  const t = useT();
  if (pathname.startsWith("/checkout")) return null;
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {TABS.map(({ href, label, icon: I, match }) => {
          const active = match(pathname);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn("flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-bold transition-colors", active ? "text-primary" : "text-muted hover:text-fg")}
              >
                <span className={cn("grid h-7 w-12 place-items-center rounded-full transition-colors", active && "bg-primary-soft")}>
                  <I className="size-5" strokeWidth={active ? 2.4 : 2} aria-hidden />
                </span>
                {t(label)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Floating cart summary. Sits above the bottom nav on phones, bottom-right on desktop. */
function CartBarView({ pathname }: { pathname: string }) {
  const hydrated = useHydrated();
  const q = useCartSummary();
  const t = useT();
  if (!hydrated || !q.itemCount || pathname.startsWith("/cart") || pathname.startsWith("/checkout")) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-30 px-3 pb-2 md:bottom-6 md:left-auto md:right-6 md:w-96 md:px-0 md:pb-0">
      <Link
        href="/cart"
        className="pointer-events-auto flex items-center gap-3 rounded-2xl bg-primary py-2.5 pl-4 pr-3 text-primary-fg shadow-[0_10px_30px_-8px_rgb(4_120_87/0.55)] transition-transform animate-sheet-up active:scale-[0.98]"
      >
        <span key={q.itemCount} className="grid size-10 place-items-center rounded-xl bg-black/15 animate-pop">
          <ShoppingCart className="size-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block text-sm font-semibold opacity-90">
            {t(q.itemCount > 1 ? "common.items" : "common.item", { n: q.itemCount })}
            {q.savings > 0 ? ` · ${t("chrome.saving", { amount: rupees(q.savings) })}` : ""}
          </span>
          <span className="block font-display text-lg font-semibold tabular">{rupees(q.subtotal)}</span>
        </span>
        <span className="flex items-center gap-0.5 font-bold">
          {t("chrome.viewCart")} <ChevronRight className="size-5" aria-hidden />
        </span>
      </Link>
    </div>
  );
}

/*
 * The bars only need the path to highlight the active tab. Reading it inside <Suspense> keeps every route's
 * static shell instant; the fallback is the same bar with nothing highlighted.
 */
function withPathname(View: React.ComponentType<{ pathname: string }>) {
  function Live() {
    return <View pathname={usePathname()} />;
  }
  return function WithPathname() {
    return (
      <Suspense fallback={<View pathname="" />}>
        <Live />
      </Suspense>
    );
  };
}

export const ShopHeader = withPathname(ShopHeaderView);
export const BottomNav = withPathname(BottomNavView);
export const CartBar = withPathname(CartBarView);
