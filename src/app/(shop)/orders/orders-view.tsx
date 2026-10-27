import Link from "next/link";
import { ChevronRight, ReceiptText } from "lucide-react";
import { RepeatOrderButton } from "@/components/shop/repeat-order-button";
import { ButtonLink } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/pill";
import { rupees } from "@/lib/money";
import { isTerminal } from "@/lib/order-flow";
import { slotDayLabel } from "@/lib/slots";
import type { Order } from "@/lib/types";
import { dayLabel } from "@/lib/utils";

export function OrdersView({ orders }: { orders: Order[] }) {
  const active = orders.filter((o) => !isTerminal(o.status));
  const past = orders.filter((o) => isTerminal(o.status));

  if (!orders.length)
    return (
      <div className="grid justify-items-center gap-3 rounded-3xl bg-surface px-6 py-12 text-center ring-1 ring-border">
        <span className="grid size-16 place-items-center rounded-2xl bg-primary-soft text-primary">
          <ReceiptText className="size-8" aria-hidden />
        </span>
        <h1 className="text-xl font-semibold">No orders yet</h1>
        <p className="text-muted">When you place an order, you can track it here.</p>
        <ButtonLink href="/">Start shopping</ButtonLink>
      </div>
    );

  const card = (o: Order) => (
    <li key={o.id} className="rounded-2xl bg-surface ring-1 ring-border">
      <Link href={`/orders/${o.id}`} className="flex items-start gap-3 rounded-2xl p-4 hover:bg-surface-2/50">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={o.status} audience="shopper" />
            <span className="text-sm text-muted">{o.number}</span>
          </div>
          <p className="mt-1.5 font-semibold">
            {o.items.filter((i) => !i.substituteFor).length} items · <span className="tabular">{rupees(o.totalFinal ?? o.totalEstimated)}</span>
          </p>
          <p className="text-sm text-muted">
            {isTerminal(o.status)
              ? `Ordered ${dayLabel(o.createdAt)}`
              : o.mode === "delivery"
                ? `Arriving ${slotDayLabel(o.slot)}, ${o.slot.label}`
                : `Pickup ${slotDayLabel(o.slot)}, ${o.slot.label.toLowerCase()}`}
          </p>
        </div>
        <ChevronRight className="mt-1 size-5 shrink-0 text-muted" aria-hidden />
      </Link>
      {isTerminal(o.status) && o.status !== "cancelled" ? (
        <div className="border-t border-border px-4 py-2">
          <RepeatOrderButton orderId={o.id} variant="ghost" />
        </div>
      ) : null}
    </li>
  );

  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <h1 className="text-2xl font-semibold">Your orders</h1>
      {active.length ? (
        <section className="grid gap-2.5" aria-label="Active orders">
          <h2 className="text-base font-semibold">In progress</h2>
          <ul className="grid gap-2.5">{active.map(card)}</ul>
        </section>
      ) : null}
      {past.length ? (
        <section className="grid gap-2.5" aria-label="Past orders">
          <h2 className="text-base font-semibold">Past orders</h2>
          <ul className="grid gap-2.5">{past.map(card)}</ul>
        </section>
      ) : null}
    </div>
  );
}
