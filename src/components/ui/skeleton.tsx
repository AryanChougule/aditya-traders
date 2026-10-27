import { cn } from "@/lib/utils";

/** Placeholder shown in the static shell while URL-dependent content streams in. Same footprint as a typical page. */
export function PageSkeleton({ variant = "page", className }: { variant?: "page" | "grid" | "detail"; className?: string }) {
  return (
    <div className={cn("grid animate-pulse gap-4", className)} aria-busy aria-label="Loading">
      <div className="h-8 w-48 rounded-lg bg-surface-2" />
      {variant === "grid" ? (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} className="aspect-[3/5] rounded-2xl bg-surface-2" />
          ))}
        </div>
      ) : variant === "detail" ? (
        <div className="grid gap-6 md:grid-cols-[5fr_6fr]">
          <div className="aspect-square max-w-[520px] rounded-3xl bg-surface-2" />
          <div className="grid content-start gap-3">
            <div className="h-6 w-2/3 rounded bg-surface-2" />
            <div className="h-10 w-1/3 rounded bg-surface-2" />
            <div className="h-12 rounded-xl bg-surface-2" />
          </div>
        </div>
      ) : (
        <>
          <div className="h-40 rounded-2xl bg-surface-2" />
          <div className="h-64 rounded-2xl bg-surface-2" />
        </>
      )}
    </div>
  );
}
