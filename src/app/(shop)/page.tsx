import Link from "next/link";
import { Suspense } from "react";
import { Bike, Scale, Search, Store } from "lucide-react";
import { BuyAgain, HowItWorks } from "@/components/shop/buy-again";
import { CategoryTile } from "@/components/shop/category-tile";
import { StoreStatus } from "@/components/shop/chrome";
import { ProductRail, SectionHeader } from "@/components/shop/product-rail";
import { rupees } from "@/lib/money";
import { getCatalog, getCategories, getSettings } from "@/server/catalog";

export default async function HomePage() {
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
      <h1 className="sr-only">{s.name}: order groceries online</h1>

      <div className="grid gap-3 md:hidden">
        <StoreStatus />
        <Link href="/search" className="flex h-12 items-center gap-2.5 rounded-xl bg-surface px-4 text-muted ring-1 ring-border">
          <Search className="size-5 text-fg" aria-hidden />
          Search “atta”, “dahi”, “toor dal”…
        </Link>
      </div>

      <section aria-label="Why order from us" className="grid gap-2.5 sm:grid-cols-3">
        <Perk icon={<Bike className="size-5" />} title={`Free delivery above ${rupees(s.freeDeliveryAt)}`} body="Two-hour slots from our own delivery staff" tone="primary" />
        <Perk icon={<Scale className="size-5" />} title="Pay for the exact weight" body="Loose atta, dal and sabzi weighed fresh at packing" tone="accent" />
        <Perk icon={<Store className="size-5" />} title="Or pick up at the counter" body="Skip the queue. Collect it when it's packed." tone="info" />
      </section>

      <Suspense fallback={<HowItWorks />}>
        <BuyAgain />
      </Suspense>

      <section aria-label="Shop by category">
        <SectionHeader title="Shop by category" href="/categories" />
        <div className="grid grid-cols-4 gap-x-1.5 gap-y-3 sm:grid-cols-5 lg:grid-cols-10">
          {categories.map((c) => (
            <CategoryTile key={c.id} c={c} />
          ))}
        </div>
      </section>

      <ProductRail title="Fresh today" sub="Vegetables and fruit, weighed when we pack" href="/c/vegetables" products={fresh} />
      <ProductRail title="Monthly essentials" sub="Atta, rice, dal, oil and milk" href="/c/atta-rice-dal" products={essentials} />
      <ProductRail title="Biggest savings" sub="Lowest prices against MRP" products={deals} />
      <ProductRail title="Best sellers in the neighbourhood" products={bestsellers} />
    </div>
  );
}

function Perk({ icon, title, body, tone }: { icon: React.ReactNode; title: string; body: string; tone: "primary" | "accent" | "info" }) {
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
        <span className="block font-display text-[15px] font-semibold leading-snug">{title}</span>
        <span className="block text-sm text-muted">{body}</span>
      </span>
    </div>
  );
}
