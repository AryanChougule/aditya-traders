import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Bike, Scale, Search, Store } from "lucide-react";
import { T } from "@/components/i18n";
import { BuyAgain, HowItWorks } from "@/components/shop/buy-again";
import { CategoryTile } from "@/components/shop/category-tile";
import { StoreStatus } from "@/components/shop/chrome";
import { ProductRail, SectionHeader } from "@/components/shop/product-rail";
import type { Key } from "@/lib/i18n";
import { rupees } from "@/lib/money";
import { getCatalog, getCategories, getSettings } from "@/server/catalog";

export const metadata: Metadata = { title: "Shop" };

export default async function ShopHomePage() {
  const [catalog, categories, s] = await Promise.all([getCatalog(), getCategories(), getSettings()]);
  const has = (p: (typeof catalog)[number], tag: string) => p.tags?.includes(tag as never);
  const fresh = catalog.filter((p) => has(p, "fresh"));
  const essentials = catalog.filter((p) => has(p, "essential") && ["staples", "oil", "dairy"].includes(p.categoryId));
  const deals = catalog
    .filter((p) => p.available && p.mrp > p.price)
    .sort((a, b) => (b.mrp - b.price) / b.mrp - (a.mrp - a.price) / a.mrp)
    .slice(0, 12);
  const bestsellers = catalog.filter((p) => has(p, "bestseller"));

  return (
    <div className="grid grid-cols-1 gap-7">
      <h1 className="sr-only">{s.name}</h1>

      <div className="grid gap-3 md:hidden">
        <StoreStatus />
        <Link href="/search" className="flex h-12 items-center gap-2.5 rounded-xl bg-surface px-4 text-muted ring-1 ring-border">
          <Search className="size-5 text-fg" aria-hidden />
          <T k="search.placeholder" />
        </Link>
      </div>

      <section aria-label="Why order from us" className="grid gap-2.5 sm:grid-cols-3">
        <Perk icon={<Bike className="size-5" />} title="perk.freeDelivery" vars={{ amount: rupees(s.freeDeliveryAt) }} body="perk.freeDeliveryBody" tone="primary" />
        <Perk icon={<Scale className="size-5" />} title="perk.weight" body="perk.weightBody" tone="accent" />
        <Perk icon={<Store className="size-5" />} title="perk.pickup" body="perk.pickupBody" tone="info" />
      </section>

      <Suspense fallback={<HowItWorks />}>
        <BuyAgain />
      </Suspense>

      <section aria-label="Shop by category">
        <SectionHeader title={<T k="home.categories" />} href="/categories" />
        <div className="grid grid-cols-4 gap-x-1.5 gap-y-3 sm:grid-cols-5 lg:grid-cols-10">
          {categories.map((c) => (
            <CategoryTile key={c.id} c={c} />
          ))}
        </div>
      </section>

      <ProductRail label="Fresh today" title={<T k="home.fresh" />} sub={<T k="home.freshSub" />} href="/c/vegetables" products={fresh} />
      <ProductRail label="Monthly essentials" title={<T k="home.essentials" />} sub={<T k="home.essentialsSub" />} href="/c/atta-rice-dal" products={essentials} />
      <ProductRail label="Biggest savings" title={<T k="home.deals" />} sub={<T k="home.dealsSub" />} products={deals} />
      <ProductRail label="Best sellers" title={<T k="home.bestsellers" />} products={bestsellers} />
    </div>
  );
}

function Perk({ icon, title, vars, body, tone }: { icon: React.ReactNode; title: Key; vars?: Record<string, string>; body: Key; tone: "primary" | "accent" | "info" }) {
  const toneCls = {
    primary: "bg-primary-soft text-primary",
    accent: "bg-accent-soft text-accent",
    info: "bg-info-soft text-info",
  }[tone];
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-surface p-3.5 ring-1 ring-border">
      <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${toneCls}`} aria-hidden>
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block font-display text-[15px] font-semibold leading-snug">
          <T k={title} v={vars} />
        </span>
        <span className="block text-sm text-muted">
          <T k={body} />
        </span>
      </span>
    </div>
  );
}
