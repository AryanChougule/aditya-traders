import { rupees } from "@/lib/money";
import type { Paise } from "@/lib/types";
import { cn } from "@/lib/utils";

export type BillRow = { label: React.ReactNode; value: Paise | string; tone?: "save" | "muted" | "strong"; strike?: Paise };

/** Itemised bill used by the cart, checkout, order and invoice views so every total reads the same way. */
export function Bill({ rows, total, totalLabel, note, className }: { rows: BillRow[]; total: Paise; totalLabel: string; note?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl bg-surface p-4 ring-1 ring-border", className)}>
      <h2 className="mb-2 text-base font-semibold">Bill details</h2>
      <dl className="grid gap-1.5 text-[15px]">
        {rows.map((r, i) => (
          <div key={i} className="flex items-baseline justify-between gap-3">
            <dt className={cn("min-w-0", r.tone === "muted" ? "text-muted" : "")}>{r.label}</dt>
            <dd className={cn("shrink-0 tabular", r.tone === "save" && "font-semibold text-primary", r.tone === "strong" && "font-semibold")}>
              {r.strike ? <span className="mr-1.5 text-sm text-muted line-through">{rupees(r.strike)}</span> : null}
              {typeof r.value === "number" ? rupees(r.value) : r.value}
            </dd>
          </div>
        ))}
        <div className="mt-1.5 flex items-baseline justify-between gap-3 border-t border-dashed border-border pt-2.5">
          <dt className="font-display font-semibold">{totalLabel}</dt>
          <dd className="font-display text-lg font-semibold tabular">{rupees(total)}</dd>
        </div>
      </dl>
      {note ? <div className="mt-2 text-sm text-muted">{note}</div> : null}
    </div>
  );
}
