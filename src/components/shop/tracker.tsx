import { Check } from "lucide-react";
import { trackerSteps } from "@/lib/order-flow";
import type { Order } from "@/lib/types";
import { clock, cn } from "@/lib/utils";

/** Progress along the happy path. Off-path states (failed, cancelled) are shown by the status banner instead. */
export function Tracker({ order }: { order: Order }) {
  const steps = trackerSteps(order.mode);
  const reachedIdx = steps.reduce((acc, s, i) => (order.timeline.some((t) => s.key.includes(t.status)) ? i : acc), -1);
  const currentIdx = steps.findIndex((s) => s.key.includes(order.status));
  return (
    <ol className="grid grid-cols-5 gap-1" aria-label="Order progress">
      {steps.map((s, i) => {
        const done = i <= reachedIdx;
        const current = i === currentIdx;
        const at = order.timeline.filter((t) => s.key.includes(t.status)).at(-1)?.at;
        return (
          <li key={s.label} className="relative flex flex-col items-center gap-1.5 text-center" aria-current={current ? "step" : undefined}>
            {i > 0 ? (
              <span className={cn("absolute right-1/2 top-4 h-0.5 w-full -translate-y-1/2", i <= reachedIdx ? "bg-primary" : "bg-border")} aria-hidden />
            ) : null}
            <span
              className={cn(
                "relative grid size-8 place-items-center rounded-full ring-4 ring-surface transition-colors",
                done ? "bg-primary text-primary-fg" : "bg-surface-2 text-muted",
                current && "outline-2 outline-offset-2 outline-primary",
              )}
            >
              {done ? <Check className="size-4" strokeWidth={3} aria-hidden /> : <span className="text-xs font-bold">{i + 1}</span>}
            </span>
            <span className={cn("text-xs font-bold leading-tight", done ? "text-fg" : "text-muted")}>{s.label}</span>
            <span className="text-[11px] text-muted tabular">{at ? clock(at) : " "}</span>
          </li>
        );
      })}
    </ol>
  );
}
