"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { ChevronRight, Clock, Home, LayoutGrid, MapPin, ReceiptText, Search, ShoppingCart, User } from "lucide-react";
import { Brand } from "@/components/brand";
import { useSettings } from "@/components/providers";
import { cartQuote, useCart, useHydrated } from "@/lib/cart-store";
import { rupees } from "@/lib/money";
import { isStoreOpen } from "@/lib/slots";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";

function useCartSummary() {
  const cart = useCart((s) => s.cart);
  return cartQuote(cart, useSettings());
}

function DeliverTo() {
  const s = useSettings();
  const farthest = Math.ceil(Math.max(0, ...Object.values(s.serviceable)));
  return (
    <Link href="/account#addresses" className="flex min-w-0 items-center gap-1.5 rounded-lg py-1 text-left text-sm hover:text-primary">
      <MapPin className="size-4 shrink-0 text-primary" aria-hidden />
      <span className="min-w-0 truncate font-semibold">
        {s.acceptingOrders ? `Delivering within ${farthest || 5} km · or pick up at the store` : "Online orders are paused right now"}
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden />
    </Link>
  );
}

export function StoreStatus({ className, audience = "shopper" }: { className?: string; audience?: "shopper" | "store" }) {
  const now = useNow();
  const s = useSettings();
  if (!now) return <span className={cn("inline-block h-5 w-40 rounded bg-surface-2", className)} aria-hidden />;
  const open = isStoreOpen(s, now);
  const h = (x: number) => `${x % 12 || 12} ${x < 12 ? "am" : "pm"}`;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm", className)}>
      <span className={cn("size-2 rounded-full", open ? "bg-primary" : "bg-danger")} aria-hidden />
      <b className="font-bold">{open ? "Open now" : "Closed"}</b>
      <span className="text-muted">
        <Clock className="mr-1 inline size-3.5 align-[-2px]" aria-hidden />
        {open ? `until ${h(s.closesAt)}` : audience === "store" ? `opens ${h(s.opensAt)}` : `opens ${h(s.opensAt)} · order now for tomorrow`}
      </span>
    </span>
  );
}

function ShopHeaderView({ pathname }: { pathname: string }) {
  const hydrated = useHydrated();
  const { itemCount, total } = useCartSummary();
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
          <span className="truncate">Search “atta”, “dahi”, “toor dal”…</span>
        </Link>
        <nav className="ml-auto hidden items-center gap-1 md:flex" aria-label="Main">
          <HeaderLink href="/categories" label="Categories" active={pathname.startsWith("/c")} />
          <HeaderLink href="/orders" label="Orders" active={pathname.startsWith("/orders")} />
          <HeaderLink href="/account" label="Account" active={pathname.startsWith("/account")} />
        </nav>
        <Link
          href="/cart"
          className="relative ml-auto inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-3.5 font-bold text-primary-fg transition-transform active:scale-[0.97] md:ml-0"
          aria-label={hydrated && itemCount ? `Cart, ${itemCount} items, ${rupees(total)}` : "Cart"}
        >
          <ShoppingCart className="size-5" aria-hidden />
          <span className="hidden tabular sm:inline">{hydrated && itemCount ? rupees(total) : "Cart"}</span>
          {hydrated && itemCount ? (
            <span key={itemCount} className="absolute -right-1.5 -top-1.5 grid min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] font-bold text-white animate-pop dark:text-[#2a1d00] sm:hidden">
              {itemCount}
            </span>
          ) : null}
        </Link>
      </div>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 pb-2">
        <DeliverTo />
        <StoreStatus className="hidden shrink-0 sm:inline-flex" />
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

const TABS = [
  { href: "/", label: "Home", icon: Home, match: (p: string) => p === "/" },
  { href: "/categories", label: "Categories", icon: LayoutGrid, match: (p: string) => p.startsWith("/categories") || p.startsWith("/c/") },
  { href: "/search", label: "Search", icon: Search, match: (p: string) => p.startsWith("/search") },
  { href: "/orders", label: "Orders", icon: ReceiptText, match: (p: string) => p.startsWith("/orders") },
  { href: "/account", label: "Account", icon: User, match: (p: string) => p.startsWith("/account") },
];

function BottomNavView({ pathname }: { pathname: string }) {
  if (pathname.startsWith("/checkout")) return null;
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {TABS.map(({ href, label, icon: I, match }) => {
          const active = match(pathname);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-bold transition-colors",
                  active ? "text-primary" : "text-muted hover:text-fg",
                )}
              >
                <span className={cn("grid h-7 w-12 place-items-center rounded-full transition-colors", active && "bg-primary-soft")}>
                  <I className="size-5" strokeWidth={active ? 2.4 : 2} aria-hidden />
                </span>
                {label}
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
            {q.itemCount} item{q.itemCount > 1 ? "s" : ""}
            {q.savings > 0 ? ` · saving ${rupees(q.savings)}` : ""}
          </span>
          <span className="block font-display text-lg font-semibold tabular">{rupees(q.subtotal)}</span>
        </span>
        <span className="flex items-center gap-0.5 font-bold">
          View cart <ChevronRight className="size-5" aria-hidden />
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
