"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { quote } from "./pricing";
import type { StoreSettings } from "./settings";
import type { CartLine, LiveProduct } from "./types";

/*
 * The only state kept in the browser: the cart (with a price snapshot for instant totals) and recent
 * searches. Orders, addresses, wallet and stock live in the database; the server re-prices the cart at checkout.
 */

type Snap = NonNullable<CartLine["snap"]>;

const snapOf = (p: LiveProduct | Snap): Snap => ({
  slug: p.slug,
  name: p.name,
  brand: p.brand,
  price: p.price,
  mrp: p.mrp,
  unitType: p.unitType,
  unitLabel: p.unitLabel,
  icon: p.icon,
  tint: p.tint,
  available: p.available,
  stockLeft: p.stockLeft,
});

type CartState = {
  cart: CartLine[];
  recentSearches: string[];
  hydrated: boolean;
  setQty: (p: LiveProduct, qty: number) => void;
  remove: (productId: string) => void;
  addLines: (lines: CartLine[]) => number;
  /** Replace snapshots with fresh prices/availability from the server. */
  refresh: (fresh: LiveProduct[]) => void;
  clear: () => void;
  rememberSearch: (q: string) => void;
  clearRecentSearches: () => void;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      cart: [],
      recentSearches: [],
      hydrated: false,
      setQty: (p, qty) => {
        const cart = get().cart;
        if (qty <= 0) set({ cart: cart.filter((l) => l.productId !== p.id) });
        else if (cart.some((l) => l.productId === p.id)) set({ cart: cart.map((l) => (l.productId === p.id ? { ...l, qty, snap: snapOf(p) } : l)) });
        else set({ cart: [...cart, { productId: p.id, qty, snap: snapOf(p) }] });
      },
      remove: (productId) => set({ cart: get().cart.filter((l) => l.productId !== productId) }),
      addLines: (lines) => {
        const cart = [...get().cart];
        let added = 0;
        for (const l of lines) {
          if (cart.some((c) => c.productId === l.productId) || !l.snap) continue;
          cart.push({ productId: l.productId, qty: l.qty, snap: snapOf(l.snap) });
          added++;
        }
        set({ cart });
        return added;
      },
      refresh: (fresh) => {
        const byId = new Map(fresh.map((p) => [p.id, p]));
        set({
          cart: get().cart.map((l) => {
            const p = byId.get(l.productId);
            // gone from the catalog entirely: keep the line but mark it unavailable so the shopper sees why
            return p ? { ...l, snap: snapOf(p) } : l.snap ? { ...l, snap: { ...l.snap, available: false } } : l;
          }),
        });
      },
      clear: () => set({ cart: [] }),
      rememberSearch: (q) => {
        const t = q.trim();
        if (!t) return;
        set({ recentSearches: [t, ...get().recentSearches.filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, 6) });
      },
      clearRecentSearches: () => set({ recentSearches: [] }),
    }),
    {
      name: "aditya-traders-cart-v2",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => ({ cart: s.cart, recentSearches: s.recentSearches }),
      onRehydrateStorage: () => () => useCart.setState({ hydrated: true }),
    },
  ),
);

export const useHydrated = () => useCart((s) => s.hydrated);
export const useCartQty = (productId: string) => useCart((s) => s.cart.find((l) => l.productId === productId)?.qty ?? 0);

/** Cart totals from snapshots, for the header, cart bar and cart page. */
export function cartQuote(cart: CartLine[], settings: StoreSettings, opts: { mode: "delivery" | "pickup"; km?: number; wallet?: number } = { mode: "delivery" }) {
  const lines = cart.filter((l) => l.snap?.available);
  return quote(lines, (id) => {
    const s = lines.find((l) => l.productId === id)?.snap;
    return s ? ({ ...s, id } as unknown as LiveProduct) : undefined;
  }, opts, settings);
}
