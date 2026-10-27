import { Icon } from "@/components/ui/icon";
import type { Tint } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Vector stand-in for product photography until the store's photos are shot.
 * Same footprint as a photo (square, reserved space), so swapping to <Image> later causes no layout shift.
 */
export function ProductArt({
  icon,
  tint,
  label,
  className,
  iconClassName,
  dim,
}: {
  icon: string;
  tint: Tint;
  label?: string;
  className?: string;
  iconClassName?: string;
  dim?: boolean;
}) {
  return (
    <div
      role={label ? "img" : undefined}
      aria-label={label}
      className={cn("relative grid aspect-square place-items-center overflow-hidden rounded-2xl", dim && "opacity-55 grayscale", className)}
      style={{ background: `var(--tint-${tint})`, color: `var(--tint-${tint}-ink)` }}
    >
      <span className="absolute -right-[18%] -top-[18%] aspect-square w-[62%] rounded-full bg-white/35 dark:bg-white/5" aria-hidden />
      <Icon name={icon} className={cn("relative size-[44%]", iconClassName)} strokeWidth={1.6} />
    </div>
  );
}
