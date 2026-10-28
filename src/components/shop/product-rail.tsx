import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { T } from "@/components/i18n";
import { ProductCard } from "./product-card";
import type { LiveProduct } from "@/lib/types";

export function SectionHeader({ title, sub, href, cta }: { title: React.ReactNode; sub?: React.ReactNode; href?: string; cta?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-lg font-semibold leading-tight sm:text-xl">{title}</h2>
        {sub ? <p className="text-sm text-muted">{sub}</p> : null}
      </div>
      {href ? (
        <Link href={href} className="-mr-2 inline-flex h-11 shrink-0 items-center gap-0.5 rounded-lg px-2 text-sm font-bold text-primary hover:bg-primary-soft">
          {cta ?? <T k="common.seeAll" />}
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      ) : null}
    </div>
  );
}

export function ProductRail({ title, sub, href, products, label }: { title: React.ReactNode; sub?: React.ReactNode; href?: string; products: LiveProduct[]; label: string }) {
  if (!products.length) return null;
  return (
    <section aria-label={label} className="min-w-0">
      <SectionHeader title={title} sub={sub} href={href} />
      <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-2.5 overflow-x-auto scroll-px-4 px-4 pb-1">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} className="w-[44vw] max-w-[180px] shrink-0 snap-start sm:w-[180px]" />
        ))}
      </div>
    </section>
  );
}
