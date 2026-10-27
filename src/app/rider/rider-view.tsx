"use client";

import { Banknote, Bike, CircleCheck, MapPin, Navigation, Phone } from "lucide-react";
import { Brand } from "@/components/brand";
import { Pill } from "@/components/ui/pill";
import { amountDue } from "@/lib/pricing";
import { rupees } from "@/lib/money";
import type { Order } from "@/lib/types";
import { clock, cn, landmarkText } from "@/lib/utils";
import { HandoverPanel } from "../console/orders/[id]/dispatch";

/** One-hand phone view for the store's own riders: today's drops, navigation, cash to collect, handover code. */
export function RiderView({ rider, orders }: { rider: { id: string; name: string }; orders: Order[] }) {
  const riderId = rider.id;

  const mine = orders.filter((o) => o.fulfilment.kind === "own" && o.fulfilment.riderId === riderId);
  const active = mine.filter((o) => o.status === "out_for_delivery" || o.status === "delivery_failed").sort((a, b) => a.slot.start - b.slot.start);
  const done = mine.filter((o) => o.status === "delivered" || o.status === "returned");
  const toCollect = active.reduce((s, o) => s + amountDue(o), 0);
  const collected = mine.filter((o) => o.paymentStatus === "collected").reduce((s, o) => s + (o.totalFinal ?? o.totalEstimated), 0);

  return (
    <div className="mx-auto min-h-dvh max-w-lg pb-[max(24px,env(safe-area-inset-bottom))]">
      <header className="sticky top-0 z-20 border-b border-border bg-surface/95 px-4 pb-3 pt-[max(12px,env(safe-area-inset-top))] backdrop-blur">
        <Brand href="/rider" sub="Rider" />
        <p className="mt-2 text-sm text-muted">
          Logged in as <b className="text-fg">{rider.name}</b>
        </p>
      </header>

      <main className="grid gap-4 px-4 pt-4">
          <>
            <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl bg-border ring-1 ring-border">
              <Stat label="Drops left" value={String(active.length)} />
              <Stat label="To collect" value={rupees(toCollect)} />
              <Stat label="Collected" value={rupees(collected)} />
            </dl>

            {active.length ? (
              active.map((o, i) => <DropCard key={o.id} o={o} n={i + 1} />)
            ) : (
              <div className="grid justify-items-center gap-2 rounded-2xl bg-surface px-6 py-10 text-center ring-1 ring-border">
                <span className="grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary">
                  <Bike className="size-7" aria-hidden />
                </span>
                <p className="font-display text-lg font-semibold">No drops right now</p>
                <p className="text-sm text-muted">New drops appear here when the store sends an order out with you.</p>
              </div>
            )}

            {done.length ? (
              <section aria-label="Done today" className="rounded-2xl bg-surface p-4 ring-1 ring-border">
                <h2 className="mb-2 text-base font-semibold">Done today</h2>
                <ul className="divide-y divide-border text-sm">
                  {done.map((o) => (
                    <li key={o.id} className="flex items-center justify-between gap-3 py-2">
                      <span className="flex items-center gap-2">
                        <CircleCheck className={cn("size-4", o.status === "delivered" ? "text-primary" : "text-muted")} aria-hidden />
                        <b>{o.number}</b> {o.customer.name}
                      </span>
                      <span className="text-muted">{o.status === "delivered" ? clock(o.timeline.at(-1)!.at) : "Returned"}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface px-3 py-2.5">
      <dt className="text-[11px] font-bold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="font-display text-lg font-semibold tabular">{value}</dd>
    </div>
  );
}

function DropCard({ o, n }: { o: Order; n: number }) {
  const a = o.address;
  const query = a ? encodeURIComponent(`${a.line1}, ${a.area}, ${a.pincode}`) : "";
  const due = amountDue(o);
  return (
    <article className="grid gap-3 rounded-2xl bg-surface p-4 ring-1 ring-border" aria-label={`Drop ${n}: ${o.number}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-full bg-fg font-display text-sm font-bold text-bg">{n}</span>
          <b className="font-display text-lg">{o.number}</b>
        </span>
        {due > 0 ? (
          <Pill tone="warn">
            <Banknote className="size-3.5" aria-hidden /> Collect {rupees(due)}
          </Pill>
        ) : (
          <Pill tone="good">Paid</Pill>
        )}
      </div>
      <div className="flex gap-3">
        <MapPin className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
        <div className="min-w-0">
          <p className="font-semibold">{o.customer.name}</p>
          {a ? (
            <>
              <p>{a.line1}, {a.area}</p>
              {a.landmark ? <p className="font-semibold text-accent">{landmarkText(a.landmark)}</p> : null}
            </>
          ) : null}
          <p className="text-sm text-muted">
            Slot {o.slot.label} · {o.items.filter((i) => i.status === "packed").length} items
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${query}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary-soft font-bold text-primary active:scale-[0.97]"
        >
          <Navigation className="size-5" aria-hidden /> Navigate
        </a>
        <a href={`tel:${o.customer.phone.replace(/[^\d+]/g, "")}`} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-surface-2 font-bold active:scale-[0.97]">
          <Phone className="size-5" aria-hidden /> Call
        </a>
      </div>
      <p className="-mt-1 text-center text-xs text-muted select-all">{o.customer.phone}</p>
      <HandoverPanel order={o} compact />
    </article>
  );
}
