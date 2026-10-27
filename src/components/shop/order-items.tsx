import { ArrowRight, CircleCheck, Hourglass } from "lucide-react";
import { grams, rupees } from "@/lib/money";
import { itemBilled } from "@/lib/pricing";
import type { Order, OrderItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ProductArt } from "./product-art";

function qtyText(i: OrderItem, which: "ordered" | "packed") {
  const q = which === "packed" ? i.qtyPacked ?? i.qtyOrdered : i.qtyOrdered;
  return i.unitType === "weight" ? grams(q) : `${q} × ${i.unitLabel}`;
}

/** Order lines with packing outcome: weighed amount, replacements, removals. */
export function OrderItems({ order }: { order: Order }) {
  const subs = new Map(order.items.filter((i) => i.substituteFor).map((i) => [i.substituteFor!, i]));
  const rows = order.items.filter((i) => !i.substituteFor);
  return (
    <ul className="divide-y divide-border">
      {rows.map((i) => {
        const sub = subs.get(i.lineId);
        const gone = i.status === "removed" || i.status === "substituted";
        const weighed = i.unitType === "weight" && i.status === "packed" && i.qtyPacked !== undefined && i.qtyPacked !== i.qtyOrdered;
        return (
          <li key={i.lineId} className="py-3 first:pt-0 last:pb-0">
            <div className="flex gap-3">
              <ProductArt icon={i.icon ?? "Package"} tint={i.tint ?? "green"} dim={gone} className="w-12 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1">
                <p className={cn("font-semibold leading-snug", gone && "text-muted line-through")}>{i.name}</p>
                <p className="text-sm text-muted">
                  {qtyText(i, "ordered")}
                  {weighed ? (
                    <span className="font-semibold text-accent"> · weighed {grams(i.qtyPacked!)}</span>
                  ) : null}
                </p>
                {i.status === "removed" ? <p className="text-sm font-semibold text-danger">Out of stock, removed and refunded</p> : null}
                {i.status === "awaiting" ? (
                  <p className="flex items-center gap-1 text-sm font-semibold text-accent">
                    <Hourglass className="size-3.5" aria-hidden /> Out of stock, waiting for your reply
                  </p>
                ) : null}
              </div>
              <p className="shrink-0 text-right tabular">
                {gone || i.status === "awaiting" ? <span className="text-muted">—</span> : <b>{rupees(itemBilled(i))}</b>}
              </p>
            </div>
            {sub ? (
              <div className="ml-15 mt-2 flex items-center gap-2 rounded-xl bg-primary-soft px-3 py-2 text-sm">
                <ArrowRight className="size-4 shrink-0 text-primary" aria-hidden />
                <span className="min-w-0 flex-1">
                  Replaced with <b>{sub.name}</b> · {qtyText(sub, sub.status === "packed" ? "packed" : "ordered")}
                </span>
                {sub.status === "packed" ? <CircleCheck className="size-4 text-primary" aria-label="Packed" /> : null}
                <b className="tabular">{rupees(itemBilled(sub))}</b>
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
