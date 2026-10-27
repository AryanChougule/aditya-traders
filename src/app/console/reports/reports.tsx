"use client";

import { useNow } from "@/lib/use-now";
import { rupees } from "@/lib/money";
import { amountDue, itemBilled } from "@/lib/pricing";
import { istStartOfDay } from "@/lib/slots";
import type { Order } from "@/lib/types";
import { timeAgo } from "@/lib/utils";

export function Reports({ orders, zero, riders }: { orders: Order[]; zero: { q: string; at: number }[]; riders: { id: string; name: string }[] }) {
  const now = useNow();
  if (!now) return <div className="h-[60vh] rounded-2xl bg-surface-2" aria-busy />;

  const valid = orders.filter((o) => !["cancelled", "placed"].includes(o.status));
  const revenue = valid.reduce((s, o) => s + (o.totalFinal ?? o.totalEstimated), 0);
  const aov = valid.length ? Math.round(revenue / valid.length) : 0;
  const lines = valid.flatMap((o) => o.items.filter((i) => !i.substituteFor));
  const subbed = lines.filter((i) => i.status === "substituted" || i.status === "removed").length;
  const packedLines = lines.filter((i) => i.status !== "pending" && i.status !== "awaiting").length;
  const subRate = packedLines ? Math.round((subbed / packedLines) * 100) : 0;

  const byProduct = new Map<string, { qty: number; value: number; name: string }>();
  for (const o of valid)
    for (const i of o.items) {
      if (i.status === "removed" || i.status === "substituted") continue;
      const r = byProduct.get(i.productId) ?? { qty: 0, value: 0, name: i.name };
      r.qty += 1;
      r.value += itemBilled(i);
      byProduct.set(i.productId, r);
    }
  const top = [...byProduct.entries()].sort((a, b) => b[1].value - a[1].value).slice(0, 8);
  const maxVal = top[0]?.[1].value ?? 1;

  const zeroCounts = new Map<string, { n: number; last: number }>();
  for (const z of zero) {
    const k = z.q.toLowerCase();
    const r = zeroCounts.get(k) ?? { n: 0, last: 0 };
    r.n++;
    r.last = Math.max(r.last, z.at);
    zeroCounts.set(k, r);
  }

  const open = orders.filter((o) => !["delivered", "picked_up", "cancelled", "returned"].includes(o.status));
  const today = istStartOfDay(now);
  const handedOverToday = (o: Order) => o.paymentStatus === "collected" && (o.timeline.at(-1)?.at ?? 0) >= today;
  const cash = riders.map((r) => ({
    r,
    due: open.filter((o) => o.fulfilment.riderId === r.id).reduce((s, o) => s + amountDue(o), 0),
    collected: orders.filter((o) => o.fulfilment.riderId === r.id && handedOverToday(o)).reduce((s, o) => s + (o.totalFinal ?? o.totalEstimated), 0),
  }));
  const counterDue = open.filter((o) => o.mode === "pickup").reduce((s, o) => s + amountDue(o), 0);

  return (
    <div className="grid gap-5">
      <h1 className="text-2xl font-semibold">Reports</h1>
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-border ring-1 ring-border md:grid-cols-4">
        <Kpi label="Orders, 30 days" value={String(valid.length)} />
        <Kpi label="Sales, 30 days" value={rupees(revenue)} />
        <Kpi label="Average order" value={rupees(aov)} />
        <Kpi label="Items replaced or removed" value={`${subRate}%`} hint="Target: 5% or less" />
      </dl>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl bg-surface p-4 ring-1 ring-border sm:p-5">
          <h2 className="text-base font-semibold">Top items by sales</h2>
          <p className="mb-3 text-sm text-muted">Last 30 days</p>
          <ul className="grid gap-2.5">
            {top.map(([id, v]) => {
              return (
                <li key={id} className="grid gap-1">
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="truncate font-semibold">{v.name}</span>
                    <span className="shrink-0 tabular">
                      {rupees(v.value)} <span className="text-muted">· {v.qty} orders</span>
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-2" aria-hidden>
                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(4, (v.value / maxVal) * 100)}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="rounded-2xl bg-surface p-4 ring-1 ring-border sm:p-5">
          <h2 className="text-base font-semibold">Searches with no results</h2>
          <p className="mb-3 text-sm text-muted">What shoppers looked for and didn't find. Add the product, or add the word as a search alias.</p>
          {zeroCounts.size ? (
            <ul className="divide-y divide-border">
              {[...zeroCounts.entries()].sort((a, b) => b[1].n - a[1].n).map(([q, v]) => (
                <li key={q} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <b>“{q}”</b>
                  <span className="text-muted">
                    {v.n}× · last {timeAgo(v.last, now)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Nothing yet.</p>
          )}
        </section>

        <section className="rounded-2xl bg-surface p-4 ring-1 ring-border sm:p-5 lg:col-span-2">
          <h2 className="text-base font-semibold">Cash reconciliation</h2>
          <p className="mb-3 text-sm text-muted">At closing, each rider's cash must match what they collected.</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted">
                  <th className="py-2 font-bold">Who</th>
                  <th className="py-2 text-right font-bold">Still to collect</th>
                  <th className="py-2 text-right font-bold">Collected today</th>
                </tr>
              </thead>
              <tbody className="tabular">
                {cash.map(({ r, due, collected }) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="py-2 font-semibold">{r.name}</td>
                    <td className="py-2 text-right">{rupees(due)}</td>
                    <td className="py-2 text-right">{rupees(collected)}</td>
                  </tr>
                ))}
                <tr className="border-t border-border">
                  <td className="py-2 font-semibold">Counter (pickups)</td>
                  <td className="py-2 text-right">{rupees(counterDue)}</td>
                  <td className="py-2 text-right text-muted">—</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-surface px-4 py-3">
      <dt className="text-xs font-bold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="font-display text-2xl font-semibold tabular">{value}</dd>
      {hint ? <dd className="text-xs text-muted">{hint}</dd> : null}
    </div>
  );
}
