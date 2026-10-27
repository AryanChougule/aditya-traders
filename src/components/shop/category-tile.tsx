import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import type { Category } from "@/lib/types";
import { cn } from "@/lib/utils";

export function CategoryTile({ c, count, className }: { c: Category; count?: number; className?: string }) {
  return (
    <Link
      href={`/c/${c.slug}`}
      className={cn("group flex min-w-0 flex-col items-center gap-2 rounded-2xl p-1.5 text-center transition-transform active:scale-[0.97]", className)}
    >
      <span
        className="grid aspect-square w-full place-items-center rounded-2xl transition-transform duration-200 group-hover:-translate-y-0.5"
        style={{ background: `var(--tint-${c.tint})`, color: `var(--tint-${c.tint}-ink)` }}
      >
        <Icon name={c.icon} className="size-[42%]" strokeWidth={1.6} />
      </span>
      <span className="line-clamp-2 text-[13px] font-semibold leading-tight">{c.name}</span>
      {count !== undefined ? <span className="-mt-1.5 text-xs text-muted">{count} items</span> : null}
    </Link>
  );
}
