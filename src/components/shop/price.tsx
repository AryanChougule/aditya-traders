import { discountPct, rupees } from "@/lib/money";
import type { Paise, UnitType } from "@/lib/types";
import { cn } from "@/lib/utils";

export function Price({
  price,
  mrp,
  unitType,
  size = "md",
  className,
}: {
  price: Paise;
  mrp: Paise;
  unitType: UnitType;
  size?: "md" | "lg";
  className?: string;
}) {
  const off = discountPct(price, mrp);
  return (
    <div className={cn("flex flex-wrap items-baseline gap-x-1.5", className)}>
      <span className={cn("font-display font-semibold tabular", size === "lg" ? "text-2xl" : "text-[15px]")}>
        {rupees(price)}
        {unitType === "weight" ? <span className="text-sm font-normal text-muted">/kg</span> : null}
      </span>
      {off > 0 ? (
        <>
          <span className={cn("text-muted line-through tabular", size === "lg" ? "text-base" : "text-xs")}>
            <span className="sr-only">MRP </span>
            {rupees(mrp)}
          </span>
          {size === "lg" ? <span className="text-sm font-bold text-accent">{off}% off</span> : null}
        </>
      ) : null}
    </div>
  );
}
