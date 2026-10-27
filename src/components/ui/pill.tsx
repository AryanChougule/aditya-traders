import { Icon } from "./icon";
import { PAYMENT_META, STATUS_META } from "@/lib/order-flow";
import type { OrderStatus, PaymentStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const TONES = {
  neutral: "bg-surface-2 text-muted",
  info: "bg-info-soft text-info",
  progress: "bg-primary-soft text-primary",
  warn: "bg-accent-soft text-accent",
  good: "bg-primary-soft text-primary",
  bad: "bg-danger-soft text-danger",
} as const;

export type Tone = keyof typeof TONES;

export function Pill({ tone = "neutral", icon, children, className }: { tone?: Tone; icon?: string; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold", TONES[tone], className)}>
      {icon ? <Icon name={icon} className="size-3.5" strokeWidth={2.25} /> : null}
      {children}
    </span>
  );
}

export function StatusPill({ status, audience = "store", className }: { status: OrderStatus; audience?: "store" | "shopper"; className?: string }) {
  const m = STATUS_META[status];
  return (
    <Pill tone={m.tone} icon={m.icon} className={className}>
      {audience === "store" ? m.label : m.shopper}
    </Pill>
  );
}

export function PaymentPill({ status, className }: { status: PaymentStatus; className?: string }) {
  const m = PAYMENT_META[status];
  return <Pill tone={m.tone} className={className}>{m.label}</Pill>;
}
