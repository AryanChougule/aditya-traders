import { cn } from "@/lib/utils";

export function Field({
  label,
  hint,
  error,
  id,
  className,
  prefix,
  ...input
}: {
  label: string;
  hint?: string;
  error?: string;
  id: string;
  prefix?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <div
        className={cn(
          "flex h-12 items-center rounded-xl border bg-surface transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20",
          error ? "border-danger" : "border-border",
        )}
      >
        {prefix ? <span className="pl-3.5 pr-1 text-muted tabular">{prefix}</span> : null}
        <input
          id={id}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
          className="h-full w-full min-w-0 rounded-xl bg-transparent px-3.5 text-base outline-none placeholder:text-muted/70"
          {...input}
        />
      </div>
      {error ? (
        <p id={`${id}-err`} className="text-sm font-semibold text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  id?: string;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="group relative inline-flex h-11 w-14 shrink-0 cursor-pointer items-center justify-center"
    >
      <span className={cn("h-7 w-12 rounded-full transition-colors duration-200", checked ? "bg-primary" : "bg-border")} />
      <span
        className={cn(
          "absolute left-2 top-1/2 size-5 -translate-y-1/2 rounded-full bg-white shadow transition-transform duration-200",
          checked && "translate-x-5",
        )}
      />
    </button>
  );
}
