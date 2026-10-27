"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useNow } from "@/lib/use-now";
import { Bike, ChevronDown, Store } from "lucide-react";
import { PaymentPill, StatusPill } from "@/components/ui/pill";
import { amountDue } from "@/lib/pricing";
import { rupees } from "@/lib/money";
import { istStartOfDay, slotDayLabel } from "@/lib/slots";
import type { Order, OrderStatus } from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";

const COLUMNS: { key: string; title: string; hint: string; statuses: OrderStatus[] }[] = [
  { key: "new", title: "New", hint: "Start packing", statuses: ["confirmed"] },
  { key: "packing", title: "Packing", hint: "Pick, weigh, resolve", statuses: ["packing", "needs_approval"] },
  { key: "packed", title: "Ready to send", hint: "Assign rider or partner", statuses: ["packed"] },
  { key: "out", title: "Out / at counter", hint: "Handover pending", statuses: ["out_for_delivery", "ready_for_pickup", "delivery_failed"] },
];

/** Two-tone chime for new orders. Browsers allow sound only after the first tap on the page. */
function chime() {
  try {
    const ctx = new AudioContext();
    [880, 1320].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.18);
      g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + i * 0.18 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.18 + 0.25);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.18);
      o.stop(ctx.currentTime + i * 0.18 + 0.3);
    });
  } catch {
    /* no audio permission yet */
  }
}

/** Chimes and toasts when a confirmed order appears that wasn't on the board at the last refresh. */
function useNewOrderAlerts(orders: Order[]) {
  const seen = useRef<Set<string> | null>(null);
  useEffect(() => {
    const confirmed = orders.filter((o) => o.status === "confirmed");
    if (!seen.current) {
      seen.current = new Set(confirmed.map((o) => o.id));
      return;
    }
    for (const o of confirmed) {
      if (seen.current.has(o.id)) continue;
      seen.current.add(o.id);
      chime();
      toast.success(`New order ${o.number}`, { description: `${o.customer.name} · ${o.items.length} items` });
    }
  }, [orders]);
}

export function OrdersBoard({ orders }: { orders: Order[] }) {
  const now = useNow();
  const [showDone, setShowDone] = useState(false);
  useNewOrderAlerts(orders);

  if (!now) return <div className="h-[60vh] rounded-2xl bg-surface-2" aria-busy />;

  const startOfDay = istStartOfDay(now);
  const today = orders.filter((o) => o.createdAt >= startOfDay && o.status !== "cancelled" && o.status !== "placed");
  const revenue = today.reduce((s, o) => s + (o.totalFinal ?? o.totalEstimated), 0);
  const cod = orders.filter((o) => !["delivered", "picked_up", "cancelled", "returned"].includes(o.status)).reduce((s, o) => s + amountDue(o), 0);
  const awaitingPay = orders.filter((o) => o.status === "placed");
  const done = orders.filter((o) => ["delivered", "picked_up", "returned", "cancelled"].includes(o.status) && o.createdAt >= startOfDay - 86_400_000);

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold">Orders</h1>
        <p className="text-sm text-muted">Refreshes every 10 seconds, with a chime for new orders. Tap anywhere once to allow sound.</p>
      </div>

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-border ring-1 ring-border md:grid-cols-4">
        <Stat label="Orders today" value={String(today.length)} />
        <Stat label="Sales today" value={rupees(revenue)} />
        <Stat label="To pack" value={String(orders.filter((o) => ["confirmed", "packing", "needs_approval"].includes(o.status)).length)} tone="accent" />
        <Stat label="Cash to collect" value={rupees(cod)} />
      </dl>

      {awaitingPay.length ? (
        <p className="rounded-xl bg-accent-soft px-3.5 py-2.5 text-sm">
          <b>{awaitingPay.length} order{awaitingPay.length > 1 ? "s" : ""} waiting for payment</b> ({awaitingPay.map((o) => o.number).join(", ")}). They
          appear in New once paid, or cancel themselves after 15 minutes.
        </p>
      ) : null}

      <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 xl:mx-0 xl:grid xl:grid-cols-4 xl:overflow-visible xl:px-0">
        {COLUMNS.map((c) => {
          const list = orders.filter((o) => c.statuses.includes(o.status)).sort((a, b) => a.slot.start - b.slot.start || a.createdAt - b.createdAt);
          return (
            <section key={c.key} aria-labelledby={`col-${c.key}`} className="flex w-[82vw] max-w-[340px] shrink-0 snap-start flex-col gap-2.5 rounded-2xl bg-surface-2/70 p-2.5 xl:w-auto xl:max-w-none">
              <header className="flex items-baseline justify-between px-1.5 pt-1">
                <h2 id={`col-${c.key}`} className="text-base font-semibold">
                  {c.title} <span className="ml-1 text-muted tabular">{list.length}</span>
                </h2>
                <span className="text-xs text-muted">{c.hint}</span>
              </header>
              {list.length ? (
                list.map((o) => <OrderCard key={o.id} o={o} now={now} />)
              ) : (
                <p className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-sm text-muted">Nothing here</p>
              )}
            </section>
          );
        })}
      </div>

      <section aria-label="Completed">
        <button onClick={() => setShowDone((v) => !v)} aria-expanded={showDone} className="inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-lg px-1 font-semibold">
          <ChevronDown className={cn("size-5 transition-transform", showDone && "rotate-180")} aria-hidden />
          Completed and cancelled <span className="text-muted">({done.length})</span>
        </button>
        {showDone ? (
          <ul className="mt-2 divide-y divide-border rounded-2xl bg-surface ring-1 ring-border">
            {done.map((o) => (
              <li key={o.id}>
                <Link href={`/console/orders/${o.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-surface-2/60">
                  <b className="w-20">{o.number}</b>
                  <span className="min-w-0 flex-1 truncate">{o.customer.name}</span>
                  <StatusPill status={o.status} />
                  <span className="w-20 text-right tabular">{rupees(o.totalFinal ?? o.totalEstimated)}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "accent" }) {
  return (
    <div className="bg-surface px-4 py-3">
      <dt className="text-xs font-bold uppercase tracking-wide text-muted">{label}</dt>
      <dd className={cn("font-display text-2xl font-semibold tabular", tone === "accent" && "text-accent")}>{value}</dd>
    </div>
  );
}

function OrderCard({ o, now }: { o: Order; now: number }) {
  const lines = o.items.filter((i) => !i.substituteFor);
  const packed = o.items.filter((i) => i.status === "packed").length;
  const resolved = o.items.filter((i) => ["packed", "removed", "substituted"].includes(i.status)).length;
  const late = o.status !== "out_for_delivery" && o.status !== "ready_for_pickup" && now > o.slot.start;
  return (
    <Link
      href={`/console/orders/${o.id}`}
      className={cn(
        "grid gap-2 rounded-xl bg-surface p-3 ring-1 ring-border transition-[box-shadow,transform] hover:shadow-md hover:ring-primary/40 active:scale-[0.99]",
        o.status === "needs_approval" && "ring-2 ring-accent",
        o.status === "delivery_failed" && "ring-2 ring-danger",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <b className="font-display">{o.number}</b>
        <span className="text-xs text-muted">{timeAgo(o.createdAt, now)}</span>
      </div>
      <p className="truncate font-semibold">{o.customer.name}</p>
      <p className={cn("flex items-center gap-1.5 text-sm", late ? "font-bold text-danger" : "text-muted")}>
        {o.mode === "delivery" ? <Bike className="size-4 shrink-0" aria-hidden /> : <Store className="size-4 shrink-0" aria-hidden />}
        <span className="truncate">
          {slotDayLabel(o.slot, now)} {o.slot.label.replace("Ready by ", "by ")}
          {late ? " · slot started" : ""}
        </span>
      </p>
      {o.status === "packing" || o.status === "needs_approval" ? (
        <div className="grid gap-1">
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
            <div className="h-full rounded-full bg-primary" style={{ width: `${(resolved / o.items.length) * 100}%` }} />
          </div>
          <span className="text-xs text-muted">
            {packed} of {lines.length} packed
          </span>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm">
          {lines.length} items · <b className="tabular">{rupees(o.totalFinal ?? o.totalEstimated)}</b>
        </span>
        {o.status === "needs_approval" || o.status === "delivery_failed" ? <StatusPill status={o.status} /> : <PaymentPill status={o.paymentStatus} />}
      </div>
    </Link>
  );
}
