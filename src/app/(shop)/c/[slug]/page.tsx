import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/skeleton";
import { Scale } from "lucide-react";
import { ProductGrid } from "@/components/shop/product-card";
import { getCatalog, getCategories, getCategory } from "@/server/catalog";
import { cn } from "@/lib/utils";

const SORTS = [
  { key: "popular", label: "Popular" },
  { key: "price-asc", label: "Price: low to high" },
  { key: "price-desc", label: "Price: high to low" },
  { key: "discount", label: "Biggest discount" },
] as const;

export async function generateStaticParams() {
  return (await getCategories()).map((c) => ({ slug: c.slug }));
}

export async function generateMetadata(props: PageProps<"/c/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  return { title: (await getCategory(slug))?.name ?? "Category" };
}

export default function CategoryPage(props: PageProps<"/c/[slug]">) {
  return (
    <Suspense fallback={<PageSkeleton variant="grid" />}>
      <Category {...props} />
    </Suspense>
  );
}

async function Category(props: PageProps<"/c/[slug]">) {
  const { slug } = await props.params;
  const { sort: sortParam } = await props.searchParams;
  const [cat, categories, catalog] = await Promise.all([getCategory(slug), getCategories(), getCatalog()]);
  if (!cat) notFound();
  const sort = SORTS.find((s) => s.key === sortParam)?.key ?? "popular";

  const items = catalog.filter((p) => p.categoryId === cat.id);
  if (sort === "price-asc") items.sort((a, b) => a.price - b.price);
  else if (sort === "price-desc") items.sort((a, b) => b.price - a.price);
  else if (sort === "discount") items.sort((a, b) => (b.mrp - b.price) / b.mrp - (a.mrp - a.price) / a.mrp);
  else items.sort((a, b) => Number(b.available) - Number(a.available) || Number(!!b.tags?.includes("bestseller")) - Number(!!a.tags?.includes("bestseller")));
  const hasLoose = items.some((p) => p.unitType === "weight");

  return (
    <div className="grid grid-cols-1 gap-4">
      <nav aria-label="Categories" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/c/${c.slug}`}
            aria-current={c.id === cat.id ? "page" : undefined}
            className={cn(
              "inline-flex h-10 shrink-0 items-center rounded-full px-4 text-sm font-bold ring-1 transition-colors",
              c.id === cat.id ? "bg-fg text-bg ring-fg" : "bg-surface text-fg ring-border hover:bg-surface-2",
            )}
          >
            {c.name}
          </Link>
        ))}
      </nav>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{cat.name}</h1>
          <p className="text-sm text-muted" lang="hi">
            {cat.nameHi} · {items.length} items
          </p>
        </div>
        <nav aria-label="Sort" className="no-scrollbar -mx-4 flex max-w-[calc(100%+2rem)] gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          {SORTS.map((s) => (
            <Link
              key={s.key}
              href={s.key === "popular" ? `/c/${cat.slug}` : `/c/${cat.slug}?sort=${s.key}`}
              replace
              scroll={false}
              aria-current={s.key === sort ? "true" : undefined}
              className={cn(
                "inline-flex h-9 shrink-0 items-center rounded-lg px-3 text-sm font-semibold transition-colors",
                s.key === sort ? "bg-primary-soft text-primary" : "text-muted hover:bg-surface-2",
              )}
            >
              {s.label}
            </Link>
          ))}
        </nav>
      </div>

      {hasLoose ? (
        <p className="flex items-start gap-2 rounded-xl bg-accent-soft px-3.5 py-2.5 text-sm text-fg">
          <Scale className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
          <span>
            Loose items are priced per kg and weighed when we pack. Your final bill uses the exact weight (within ±10%), and any
            difference goes back to your wallet.
          </span>
        </p>
      ) : null}

      <ProductGrid products={items} />
    </div>
  );
}
