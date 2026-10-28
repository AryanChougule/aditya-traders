import Link from "next/link";
import { ChevronRight, ReceiptText } from "lucide-react";
import { T } from "@/components/i18n";
import { RepeatOrderButton } from "@/components/shop/repeat-order-button";
import { SlotWhen } from "@/components/shop/slot-when";
import { ButtonLink } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/pill";
import { rupees } from "@/lib/money";
import { isTerminal } from "@/lib/order-flow";
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
        <h1 className="text-xl font-semibold">
          <T k="orders.noneTitle" />
        </h1>
        <p className="text-muted">
          <T k="orders.noneBody" />
        </p>
        <ButtonLink href="/shop">
          <T k="common.startShopping" />
        </ButtonLink>
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
            <T k="common.items" v={{ n: o.items.filter((i) => !i.substituteFor).length }} /> · <span className="tabular">{rupees(o.totalFinal ?? o.totalEstimated)}</span>
          </p>
          <p className="text-sm text-muted">
            {isTerminal(o.status) ? <T k="orders.ordered" v={{ date: dayLabel(o.createdAt) }} /> : <SlotWhen slot={o.slot} mode={o.mode} />}
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
      <h1 className="text-2xl font-semibold">
        <T k="orders.title" />
      </h1>
      {active.length ? (
        <section className="grid gap-2.5" aria-label="Active orders">
          <h2 className="text-base font-semibold">
            <T k="orders.active" />
          </h2>
          <ul className="grid gap-2.5">{active.map(card)}</ul>
        </section>
      ) : null}
      {past.length ? (
        <section className="grid gap-2.5" aria-label="Past orders">
          <h2 className="text-base font-semibold">
            <T k="orders.past" />
          </h2>
          <ul className="grid gap-2.5">{past.map(card)}</ul>
        </section>
      ) : null}
    </div>
  );
}
