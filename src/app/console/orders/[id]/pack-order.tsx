"use client";

import Link from "next/link";
import { createContext, useContext, useState } from "react";
import { ArrowLeft, Bike, Check, CircleAlert, Hourglass, PackageX, Phone, RefreshCcw, Scale, Store, Trash2, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { ProductArt } from "@/components/shop/product-art";
import { OrderItems } from "@/components/shop/order-items";
import { Button } from "@/components/ui/button";
import { PaymentPill, Pill, StatusPill } from "@/components/ui/pill";
import { Sheet } from "@/components/ui/sheet";
import {
  finishPackingAction,
  markMissingAction,
  packItemAction,
  removeItemAction,
  storeCancelAction,
  startPackingAction,
  unpackItemAction,
  resolveApprovalAction,
  type Result,
} from "@/app/actions";
import { useSettings } from "@/components/providers";
import { comparablePrice, convertQty, similarTo, substitutesFor } from "@/lib/catalog";
import { grams, rupees } from "@/lib/money";
import { STATUS_META } from "@/lib/order-flow";
import { amountDue, itemBilled, settle, withinTolerance } from "@/lib/pricing";
import { slotDayLabel } from "@/lib/slots";
import type { LiveProduct, Order, OrderItem } from "@/lib/types";
import { useNow } from "@/lib/use-now";
import { clock, cn, landmarkText } from "@/lib/utils";
import { DispatchPanel, HandoverPanel } from "./dispatch";

const PREF_LABEL = { similar: "Replace with similar", ask: "Ask me first", remove: "Remove it" } as const;

export type RiderOption = { id: string; name: string; phone: string; busy: number };

/** Live catalog (for replacements) and riders, shared by the packing rows and dispatch panel. */
const PackData = createContext<{ catalog: LiveProduct[]; riders: RiderOption[] }>({ catalog: [], riders: [] });
export const usePackData = () => useContext(PackData);

/** Shows a server action's error, if any. */
export async function act(p: Promise<Result<unknown>>, done?: string) {
  const r = await p;
  if (!r.ok) toast.error(r.error);
  else if (done) toast.success(done);
  return r;
}

export function PackOrder({ order, catalog, riders }: { order: Order; catalog: LiveProduct[]; riders: RiderOption[] }) {
  const STORE = useSettings();
  const startPacking = startPackingAction;
  const finishPacking = finishPackingAction;

  const packing = order.status === "packing" || order.status === "needs_approval";
  const open = order.items.filter((i) => i.status === "pending" || i.status === "awaiting").length;
  const aisles = [...new Set(order.items.map((i) => i.aisle))].sort((a, b) => a - b);

  return (
    <PackData.Provider value={{ catalog, riders }}>
    <div className="grid gap-4">
      <BackLink />

      <header className="grid gap-3 rounded-2xl bg-surface p-4 ring-1 ring-border sm:p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
        <div className="grid gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-semibold">{order.number}</h1>
            <StatusPill status={order.status} />
            <PaymentPill status={order.paymentStatus} />
          </div>
          <p className="font-semibold">
            {order.customer.name} <span className="font-normal text-muted">· <span className="select-all tabular">{order.customer.phone}</span></span>
          </p>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
            <span className="flex items-center gap-1.5">
              {order.mode === "delivery" ? <Bike className="size-4" aria-hidden /> : <Store className="size-4" aria-hidden />}
              {order.mode === "delivery" ? "Delivery" : "Pickup"} · {slotDayLabel(order.slot)}, {order.slot.label}
            </span>
            {order.address ? (
              <span>
                {order.address.line1}, {order.address.area} {order.address.landmark ? `(${landmarkText(order.address.landmark).toLowerCase()})` : ""}
              </span>
            ) : null}
          </div>
          <p className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted">If out of stock:</span>
            <Pill tone={order.subPref === "ask" ? "warn" : "neutral"} icon={order.subPref === "ask" ? "CircleAlert" : undefined}>
              {PREF_LABEL[order.subPref]}
            </Pill>
          </p>
        </div>
        <div className="grid gap-2 md:w-72">
          {order.status === "placed" ? (
            <p className="flex items-center gap-2 rounded-xl bg-accent-soft p-3 text-sm">
              <Hourglass className="size-4 shrink-0 text-accent" aria-hidden /> Waiting for the shopper to pay. Don't pack yet.
            </p>
          ) : null}
          {order.status === "confirmed" ? (
            <Button
              size="lg"
              onClick={async () => {
                const r = await startPacking(order.id);
                if (!r.ok) toast.error(r.error);
              }}
            >
              Start packing
            </Button>
          ) : null}
          {packing ? (
            <Button
              size="lg"
              disabled={open > 0}
              onClick={async () => {
                const r = await finishPacking(order.id);
                if (r.ok) toast.success("Packed. Final bill and invoice generated.");
                else toast.error(r.error);
              }}
            >
              {open > 0 ? `${open} item${open > 1 ? "s" : ""} left` : "Finish packing and bill"}
            </Button>
          ) : null}
          {order.status === "placed" || order.status === "confirmed" ? (
            <Button
              variant="ghost"
              className="text-danger"
              onClick={async () => {
                const r = await storeCancelAction(order.id);
                if (r.ok) toast("Order cancelled. Any payment was refunded to the shopper's wallet.");
                else toast.error(r.error);
              }}
            >
              Cancel order
            </Button>
          ) : null}
        </div>
      </header>

      {order.status === "needs_approval" ? (
        <p className="flex items-start gap-2 rounded-xl bg-accent-soft p-3.5 text-sm" role="status">
          <CircleAlert className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
          <span>
            <b>Waiting on the shopper.</b> The question is showing on their order page. Keep packing the rest, and give them a call if it's urgent. If they answer by phone,
            record their answer below. No reply in {STORE.substitutionTimeoutMin} minutes removes the item.
          </span>
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="grid gap-4">
          {order.status === "packed" ? <DispatchPanel order={order} /> : null}
          {["out_for_delivery", "ready_for_pickup", "delivery_failed"].includes(order.status) ? <HandoverPanel order={order} /> : null}

          {packing ? (
            aisles.map((a) => {
              const rows = order.items.filter((i) => i.aisle === a && !i.substituteFor);
              if (!rows.length) return null;
              return (
                <section key={a} aria-labelledby={`aisle-${a}`} className="rounded-2xl bg-surface ring-1 ring-border">
                  <h2 id={`aisle-${a}`} className="border-b border-border px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-muted">
                    Aisle {a}
                  </h2>
                  <ul className="divide-y divide-border">
                    {rows.map((i) => (
                      <PackRow key={i.lineId} order={order} item={i} />
                    ))}
                  </ul>
                </section>
              );
            })
          ) : (
            <section className="rounded-2xl bg-surface p-4 ring-1 ring-border sm:p-5">
              <h2 className="mb-3 text-base font-semibold">Items</h2>
              <OrderItems order={order} />
            </section>
          )}
        </div>

        <aside className="grid gap-4 lg:sticky lg:top-5">
          <BillPreview order={order} />
          <section className="rounded-2xl bg-surface p-4 ring-1 ring-border">
            <h2 className="mb-2 text-base font-semibold">Activity</h2>
            <ol className="grid gap-2 text-sm">
              {[...order.timeline].reverse().map((t, idx) => (
                <li key={idx} className="flex gap-3">
                  <span className="w-16 shrink-0 text-muted tabular">{clock(t.at)}</span>
                  <span>
                    <b>{STATUS_META[t.status].label}</b>
                    {t.note ? <span className="text-muted"> · {t.note}</span> : null}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </div>
  </PackData.Provider>
  );
}

function BackLink() {
  return (
    <Link href="/console" className="inline-flex h-11 items-center gap-1.5 justify-self-start rounded-lg pr-3 font-semibold text-primary">
      <ArrowLeft className="size-4" aria-hidden /> All orders
    </Link>
  );
}

function PackRow({ order, item }: { order: Order; item: OrderItem }) {
  const STORE = useSettings();
  const { catalog } = usePackData();
  const pack = (o: string, l: string, q: number) => act(packItemAction(o, l, q));
  const unpack = (o: string, l: string) => act(unpackItemAction(o, l));
  const removeItem = (o: string, l: string) => act(removeItemAction(o, l));
  const resolveApproval = (o: string, l: string, d: "accept" | "remove") => act(resolveApprovalAction(o, l, d));
  const p = catalog.find((x) => x.id === item.productId) ?? { icon: item.icon ?? "Package", tint: item.tint ?? "green" };
  const sub = order.items.find((x) => x.substituteFor === item.lineId);
  const [qty, setQty] = useState(String(item.qtyOrdered));
  const [missingOpen, setMissingOpen] = useState(false);
  const loose = item.unitType === "weight";
  const n = Number(qty);
  const valid = Number.isFinite(n) && n > 0;
  const ok = !loose || (valid && withinTolerance(item.qtyOrdered, n, STORE.weightTolerance));

  const doPack = (amount: number) => {
    pack(order.id, item.lineId, amount);
  };

  return (
    <li className="p-3.5">
      <div className="flex flex-wrap items-center gap-3">
        {p ? <ProductArt icon={p.icon} tint={p.tint} dim={item.status === "removed" || item.status === "substituted"} className="w-12 shrink-0 rounded-xl" /> : null}
        <div className="min-w-0 flex-1 basis-48">
          <p className={cn("font-semibold leading-snug", (item.status === "removed" || item.status === "substituted") && "text-muted line-through")}>{item.name}</p>
          <p className="text-sm text-muted">
            Ordered <b className="text-fg">{loose ? grams(item.qtyOrdered) : `${item.qtyOrdered} × ${item.unitLabel}`}</b>
            {loose ? <span> · {rupees(item.unitPrice)}/kg</span> : null}
          </p>
        </div>

        {item.status === "pending" ? (
          <div className="flex flex-wrap items-center gap-2">
            {loose ? (
              <label className="flex h-11 items-center gap-1 rounded-xl bg-surface-2 pl-3 pr-2 ring-1 ring-border focus-within:ring-2 focus-within:ring-primary">
                <Scale className="size-4 text-accent" aria-hidden />
                <span className="sr-only">Weighed amount in grams for {item.name}</span>
                <input
                  inputMode="numeric"
                  value={qty}
                  onChange={(e) => setQty(e.target.value.replace(/\D/g, ""))}
                  className="w-16 bg-transparent text-right font-bold tabular outline-none"
                  aria-invalid={!ok}
                />
                <span className="text-sm text-muted">g</span>
              </label>
            ) : null}
            <Button size="sm" className="h-11" disabled={!ok} onClick={() => doPack(loose ? n : item.qtyOrdered)}>
              <Check className="size-4" aria-hidden /> Packed
            </Button>
            <Button size="sm" variant="outline" className="h-11" onClick={() => setMissingOpen(true)}>
              <PackageX className="size-4" aria-hidden /> Missing
            </Button>
          </div>
        ) : null}

        {item.status === "packed" ? (
          <div className="flex items-center gap-2">
            <Pill tone="good" icon="CircleCheck">
              {loose ? grams(item.qtyPacked ?? item.qtyOrdered) : `${item.qtyPacked ?? item.qtyOrdered} packed`}
            </Pill>
            <span className="w-16 text-right font-bold tabular">{rupees(itemBilled(item))}</span>
            <Button size="sm" variant="ghost" className="h-11" onClick={() => unpack(order.id, item.lineId)} aria-label={`Undo ${item.name}`}>
              <Undo2 className="size-4" aria-hidden />
            </Button>
          </div>
        ) : null}

        {item.status === "removed" ? (
          <div className="flex items-center gap-2">
            <Pill tone="bad">Removed, will be refunded</Pill>
            <Button size="sm" variant="ghost" className="h-11" onClick={() => unpack(order.id, item.lineId)} aria-label={`Undo removing ${item.name}`}>
              <Undo2 className="size-4" aria-hidden />
            </Button>
          </div>
        ) : null}

        {item.status === "substituted" ? (
          <Button size="sm" variant="ghost" className="h-11" onClick={() => unpack(order.id, item.lineId)}>
            <Undo2 className="size-4" aria-hidden /> Undo replacement
          </Button>
        ) : null}
      </div>

      {loose && item.status === "pending" && valid && !ok ? (
        <p className="mt-2 text-sm font-semibold text-danger" role="alert">
          Keep within ±{STORE.weightTolerance * 100}% ({grams(Math.ceil(item.qtyOrdered * (1 - STORE.weightTolerance)))}–{grams(Math.floor(item.qtyOrdered * (1 + STORE.weightTolerance)))}).
        </p>
      ) : null}

      {item.status === "awaiting" ? <AwaitingRow order={order} item={item} onDecide={(d) => resolveApproval(order.id, item.lineId, d)} onRemove={() => removeItem(order.id, item.lineId)} /> : null}

      {sub ? (
        <div className="ml-6 mt-3 rounded-xl border-l-4 border-primary bg-primary-soft/60 pl-1">
          <p className="px-3 pt-2 text-xs font-bold uppercase tracking-wide text-primary">Replacement</p>
          <ul>
            <PackRow order={order} item={sub} />
          </ul>
        </div>
      ) : null}

      <MissingSheet order={order} item={item} open={missingOpen} onOpenChange={setMissingOpen} />
    </li>
  );
}

function AwaitingRow({ order, item, onDecide, onRemove }: { order: Order; item: OrderItem; onDecide: (d: "accept" | "remove") => void; onRemove: () => void }) {
  const alt = item.proposed;
  const STORE = useSettings();
  const now = useNow();
  const mins = item.awaitingSince && now ? Math.max(0, Math.ceil(STORE.substitutionTimeoutMin - (now - item.awaitingSince) / 60_000)) : STORE.substitutionTimeoutMin;
  return (
    <div className="mt-3 grid gap-2 rounded-xl bg-accent-soft p-3 text-sm">
      <p className="flex items-center gap-2">
        <Hourglass className="size-4 shrink-0 text-accent" aria-hidden />
        <span>
          Asked {order.customer.name.split(" ")[0]} {alt ? <>about <b>{alt.name}</b></> : "whether to remove it"}. Auto-removes in {mins} min.
        </span>
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1 text-muted">
          <Phone className="size-3.5" aria-hidden /> Answered by phone?
        </span>
        {alt ? (
          <Button size="sm" variant="outline" onClick={() => onDecide("accept")}>
            They accepted
          </Button>
        ) : null}
        <Button size="sm" variant="outline" onClick={onRemove}>
          Remove it
        </Button>
      </div>
    </div>
  );
}

function MissingSheet({ order, item, open, onOpenChange }: { order: Order; item: OrderItem; open: boolean; onOpenChange: (v: boolean) => void }) {
  const markMissing = (o: string, l: string, pid?: string) => act(markMissingAction(o, l, pid));
  const removeItem = (o: string, l: string) => act(removeItemAction(o, l));
  const { catalog } = usePackData();
  const p = catalog.find((x) => x.id === item.productId);
  const inOrder = order.items.map((i) => i.productId);
  const live = (list: LiveProduct[]) => list.filter((x) => x.available);
  // true replacements (same kind of product) first; the rest of the category only as a manual fallback
  const matches = p ? live(substitutesFor(p, catalog, inOrder)).slice(0, 4) : [];
  const others = p ? live(similarTo(p, catalog, 12, inOrder)).filter((x) => !matches.some((m) => m.id === x.id)).slice(0, 4) : [];
  const paid = p ? comparablePrice({ unitType: item.unitType, price: item.unitPrice, netGrams: p.netGrams }) : item.unitPrice;
  const pct = (x: LiveProduct) => Math.round((comparablePrice(x) / paid - 1) * 100);
  const [pick, setPick] = useState<string | undefined>(undefined);
  const chosen = pick ?? matches.find((o) => pct(o) <= 10)?.id ?? matches[0]?.id;
  const options = [...matches, ...others];
  const pref = order.subPref;

  const desc =
    pref === "similar"
      ? "Shopper said: replace with similar. Pick the closest match. Keep it within 10% of the price."
      : pref === "ask"
        ? "Shopper said: ask me first. Your suggestion appears on their order page, where they can accept or remove it. Call them if they don't reply."
        : "Shopper said: remove it. The item comes off the bill and is refunded.";

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={`${item.name} is missing`}
      description={desc}
      footer={
        <div className="grid gap-2 sm:grid-cols-2">
          {pref !== "remove" && options.length ? (
            <Button
              disabled={!chosen}
              onClick={() => {
                markMissing(order.id, item.lineId, chosen);
                onOpenChange(false);
                toast.success(pref === "ask" ? "Sent to the shopper for approval" : "Replacement added. Pack it next.");
              }}
            >
              {pref === "ask" ? <Phone className="size-4" aria-hidden /> : <RefreshCcw className="size-4" aria-hidden />}
              {pref === "ask" ? "Ask shopper" : "Replace"}
            </Button>
          ) : null}
          <Button
            variant={pref === "remove" || !options.length ? "primary" : "outline"}
            onClick={() => {
              removeItem(order.id, item.lineId);
              onOpenChange(false);
              toast("Item removed. It will be refunded on the final bill.");
            }}
          >
            <Trash2 className="size-4" aria-hidden /> Remove item
          </Button>
        </div>
      }
    >
      {pref !== "remove" ? (
        options.length ? (
          <div role="radiogroup" aria-label="Replacement" className="grid gap-2">
            {matches.length ? null : (
              <p className="rounded-xl bg-surface-2 p-3 text-sm text-muted">
                Nothing of the same kind is in stock. Removing is usually best. Only pick a different item if you've spoken to the shopper.
              </p>
            )}
            {options.map((o, idx) => {
              const d = pct(o);
              const qty = p ? convertQty(p, item.qtyOrdered, o) : item.qtyOrdered;
              return (
                <div key={o.id} className="grid gap-2">
                  {idx === matches.length && others.length ? (
                    <p className="mt-1 text-xs font-bold uppercase tracking-wide text-muted">Different products in this category</p>
                  ) : null}
                  <button
                    role="radio"
                    aria-checked={chosen === o.id}
                    onClick={() => setPick(o.id)}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-xl p-2.5 text-left ring-1 transition-colors",
                      chosen === o.id ? "bg-primary-soft ring-2 ring-primary" : "ring-border hover:bg-surface-2",
                    )}
                  >
                    <ProductArt icon={o.icon} tint={o.tint} className="w-12 shrink-0 rounded-lg" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{o.brand ? `${o.brand} ` : ""}{o.name}</span>
                      <span className="block text-sm text-muted">
                        Send {o.unitType === "weight" ? grams(qty) : `${qty} × ${o.unitLabel}`} · aisle {o.aisle} · {o.stockLeft} in stock
                      </span>
                    </span>
                    <span className="text-right text-sm tabular">
                      <b className="block">{rupees(o.price)}{o.unitType === "weight" ? "/kg" : ""}</b>
                      <span className={cn(d > 10 ? "font-bold text-danger" : d > 0 ? "text-accent" : "text-primary")}>
                        {d === 0 ? "same per kg" : `${d > 0 ? "+" : "−"}${Math.abs(d)}% per kg`}
                      </span>
                    </span>
                  </button>
                </div>
              );
            })}
            {pref === "similar" && matches.length > 0 && matches.every((o) => pct(o) > 10) ? (
              <p className="text-sm text-danger">Every match is more than 10% dearer. Consider removing the item, or call the shopper.</p>
            ) : null}
          </div>
        ) : (
          <p className="rounded-xl bg-surface-2 p-3 text-sm text-muted">No similar items in stock. Remove the item; the shopper will be refunded.</p>
        )
      ) : null}
    </Sheet>
  );
}

function BillPreview({ order }: { order: Order }) {
  const itemsNow = order.items.reduce((s, i) => s + itemBilled(i), 0);
  const finalNow = order.totalFinal ?? Math.max(itemsNow + order.deliveryFee - order.walletUsed, 0);
  const prepaid = order.paymentStatus === "paid";
  const { absorbUpTo } = useSettings();
  const adj = order.adjustment ?? settle(order.totalEstimated, finalNow, prepaid, absorbUpTo);
  const due = order.totalFinal !== undefined ? amountDue(order) : prepaid ? adj.collectOnDelivery : finalNow;
  return (
    <section className="rounded-2xl bg-surface p-4 ring-1 ring-border">
      <h2 className="mb-2 text-base font-semibold">{order.totalFinal !== undefined ? "Final bill" : "Bill so far"}</h2>
      <dl className="grid gap-1.5 text-sm tabular">
        <Row k="Charged at checkout" v={rupees(order.totalEstimated)} muted />
        <Row k="Items as packed" v={rupees(itemsNow)} />
        <Row k="Delivery" v={order.deliveryFee ? rupees(order.deliveryFee) : "Free"} />
        {order.walletUsed ? <Row k="Wallet used" v={rupees(-order.walletUsed)} /> : null}
        <div className="mt-1 flex justify-between border-t border-dashed border-border pt-2 font-display text-base font-semibold">
          <dt>Final</dt>
          <dd>{rupees(finalNow)}</dd>
        </div>
      </dl>
      <div className="mt-3 grid gap-1.5 text-sm">
        {prepaid && adj.credited ? <p className="rounded-lg bg-primary-soft px-3 py-2 text-primary"><b className="tabular">{rupees(adj.credited)}</b> back to shopper's wallet</p> : null}
        {prepaid && adj.absorbed ? <p className="rounded-lg bg-surface-2 px-3 py-2 text-muted">Store absorbs {rupees(adj.absorbed)} overweight</p> : null}
        {due > 0 ? (
          <p className="rounded-lg bg-accent-soft px-3 py-2">
            Collect <b className="tabular">{rupees(due)}</b> {order.mode === "pickup" ? "at the counter" : "on delivery"}
          </p>
        ) : null}
        {order.fulfilment.riderName ? <p className="text-muted">Rider: {order.fulfilment.riderName}</p> : null}
      </div>
    </section>
  );
}

function Row({ k, v, muted }: { k: string; v: string; muted?: boolean }) {
  return (
    <div className={cn("flex justify-between gap-3", muted && "text-muted")}>
      <dt>{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}
