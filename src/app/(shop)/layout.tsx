import Link from "next/link";
import { BottomNav, CartBar, ShopHeader } from "@/components/shop/chrome";
import { rupees } from "@/lib/money";
import { getSettings } from "@/server/catalog";

export default async function ShopLayout({ children }: LayoutProps<"/">) {
  const s = await getSettings();
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2">
        Skip to content
      </a>
      <ShopHeader />
      {!s.acceptingOrders ? (
        <p className="bg-accent-soft px-4 py-2 text-center text-sm font-semibold" role="status">
          We're not taking online orders right now. You can still browse, or call {s.phone}.
        </p>
      ) : null}
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pb-44 pt-4 md:pb-16">
        {children}
      </main>
      <footer className="border-t border-border bg-surface pb-24 md:pb-0">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 text-sm text-muted md:grid-cols-4">
          <div>
            <p className="font-display text-base font-semibold text-fg">{s.name}</p>
            <p>{s.address}</p>
            <p>
              Call the store: <span className="select-all font-semibold text-fg">{s.phone}</span>
            </p>
            {s.gstin ? <p>GSTIN {s.gstin}</p> : null}
          </div>
          <div>
            <p className="font-semibold text-fg">Delivery</p>
            <p>
              Free above {rupees(s.freeDeliveryAt)} · Minimum order {rupees(s.minOrder)}
            </p>
            <p>Two-hour slots, or pick up at the counter</p>
          </div>
          <nav aria-label="Policies" className="flex flex-col gap-1">
            <p className="font-semibold text-fg">Policies</p>
            <Link className="hover:text-primary" href="/legal/terms">Terms of service</Link>
            <Link className="hover:text-primary" href="/legal/privacy">Privacy policy</Link>
            <Link className="hover:text-primary" href="/legal/refunds">Cancellations and refunds</Link>
            <Link className="hover:text-primary" href="/legal/shipping">Delivery policy</Link>
          </nav>
          <nav aria-label="Staff" className="flex flex-col gap-1">
            <p className="font-semibold text-fg">For staff</p>
            <Link className="hover:text-primary" href="/console">Store console</Link>
            <Link className="hover:text-primary" href="/rider">Rider view</Link>
          </nav>
        </div>
      </footer>
      <CartBar />
      <BottomNav />
    </div>
  );
}
