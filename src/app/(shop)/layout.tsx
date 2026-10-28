import { T } from "@/components/i18n";
import { BottomNav, CartBar, ShopHeader } from "@/components/shop/chrome";
import { SiteFooter } from "@/components/shop/site-footer";
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
          <T k="shop.pausedBanner" v={{ phone: s.phone }} />
        </p>
      ) : null}
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pb-44 pt-4 md:pb-16">
        {children}
      </main>
      <SiteFooter s={s} className="pb-24 md:pb-0" />
      <CartBar />
      <BottomNav />
    </div>
  );
}
