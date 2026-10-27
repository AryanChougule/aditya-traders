"use client";

import Link from "next/link";
import { Scale } from "lucide-react";
import { AddControl } from "./add-control";
import { Price } from "./price";
import { ProductArt } from "./product-art";
import { discountPct } from "@/lib/money";
import type { LiveProduct } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ProductCard({ product: p, className }: { product: LiveProduct; className?: string }) {
  const off = discountPct(p.price, p.mrp);
  const low = p.available && p.stockLeft <= 3;
  return (
    <article className={cn("relative flex min-w-0 flex-col rounded-2xl bg-surface p-2.5 ring-1 ring-border", className)}>
      <Link href={`/p/${p.slug}`} className="group flex flex-1 flex-col gap-2 rounded-xl" aria-label={`${p.brand ?? ""} ${p.name}, ${p.unitLabel}`}>
        <div className="relative">
          <ProductArt icon={p.icon} tint={p.tint} dim={!p.available} className="transition-transform duration-200 group-hover:scale-[1.02]" />
          {off > 0 && p.available ? (
            <span className="absolute left-1.5 top-1.5 rounded-md bg-accent px-1.5 py-0.5 text-[11px] font-bold text-white dark:text-[#2a1d00]">
              {off}% off
            </span>
          ) : null}
          {low ? (
            <span className="absolute bottom-1.5 left-1.5 rounded-md bg-surface/95 px-1.5 py-0.5 text-[11px] font-bold text-danger">
              Only {p.stockLeft} left
            </span>
          ) : null}
        </div>
        <div className="flex flex-1 flex-col gap-0.5 px-0.5">
          {p.brand ? <span className="truncate text-xs font-semibold text-muted">{p.brand}</span> : null}
          <h3 className="line-clamp-2 font-sans text-sm font-semibold leading-snug">{p.name}</h3>
          <span className="mt-auto flex items-center gap-1 pt-0.5 text-xs text-muted">
            {p.unitType === "weight" ? (
              <>
                <Scale className="size-3.5 text-accent" aria-hidden /> Sold by weight
              </>
            ) : (
              p.unitLabel
            )}
          </span>
        </div>
      </Link>
      <div className="mt-2 grid gap-2 px-0.5">
        <Price price={p.price} mrp={p.mrp} unitType={p.unitType} />
        <AddControl product={p} />
      </div>
    </article>
  );
}

export function ProductGrid({ products }: { products: LiveProduct[] }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
