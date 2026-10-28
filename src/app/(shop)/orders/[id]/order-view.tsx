"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bike, CircleAlert, CircleCheck, ExternalLink, FileText, MapPin, Phone, Store, Wallet, X } from "lucide-react";
import { toast } from "sonner";
import { Bill, type BillRow } from "@/components/shop/bill";
import { OrderItems } from "@/components/shop/order-items";
import { cancelOrderAction, resolveApprovalAction, retryPaymentAction } from "@/app/actions";
import { useLang, useT } from "@/components/i18n";
import { useSettings } from "@/components/providers";
import { openGateway } from "@/components/shop/gateway";
import { RepeatOrderButton } from "@/components/shop/repeat-order-button";
import { ProductArt } from "@/components/shop/product-art";
import { Tracker } from "@/components/shop/tracker";
import { Button, ButtonLink } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { StatusPill } from "@/components/ui/pill";
import { dayText, slotText, type Key, type Lang } from "@/lib/i18n";
import { rupees } from "@/lib/money";
import { STATUS_META, isCancellable } from "@/lib/order-flow";
import { amountDue, itemBilled, itemEstimated } from "@/lib/pricing";
import type { Order } from "@/lib/types";
import { useNow } from "@/lib/use-now";
import { clock, landmarkText } from "@/lib/utils";

type TFn = ReturnType<typeof useT>;

export function OrderView({
  order,
  justPlaced,
  canPay,
  customer,
}: {
  order: Order;
  justPlaced: boolean;
  canPay: boolean;
  customer: { name: string; phone: string };
}) {
  const router = useRouter();
  const STORE = useSettings();
  const t = useT();
  const lang = useLang();
  const [cancelling, setCancelling] = useState(false);
  const [paying, setPaying] = useState(false);

  const pay = async () => {
    setPaying(true);
    const r = await retryPaymentAction(order.id);
    setPaying(false);
    if (!r.ok) return toast.error(r.error);
    openGateway(r.value, order, customer, { onPaid: () => router.refresh(), onDismiss: () => router.refresh() });
  };

  const meta = STATUS_META[order.status];
  const due = amountDue(order);
  const awaiting = order.items.filter((i) => i.status === "awaiting");
  const offPath = ["delivery_failed", "returned", "cancelled", "placed"].includes(order.status);

  return (
    <div className="mx-auto grid max-w-3xl gap-4">
      {justPlaced && order.status !== "placed" ? <PlacedBanner order={order} /> : null}

      <header className="grid gap-3 rounded-2xl bg-surface p-4 ring-1 ring-border sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <StatusPill status={order.status} audience="shopper" />
          <span className="text-sm text-muted">{t("order.placedAt", { n: order.number, time: clock(order.createdAt) })}</span>
        </div>
        <div>
          <h1 className="text-2xl font-semibold">{headline(order, t)}</h1>
          <p className="text-muted">{subline(order, t, lang)}</p>
        </div>
        {!offPath ? <Tracker order={order} /> : null}
      </header>

      {order.status === "placed" ? (
        <Callout tone="warn" icon={<CircleAlert className="size-5" />} title={order.paymentStatus === "failed" ? t("order.payFailed") : t("order.payPending")}>
          <p>{t("order.holding")}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {canPay ? (
              <Button onClick={pay} disabled={paying}>
                {t("checkout.pay", { amount: rupees(order.totalEstimated) })}
              </Button>
            ) : null}
            <Button variant="ghost" onClick={() => setCancelling(true)}>
              {t("order.cancel")}
            </Button>
          </div>
        </Callout>
      ) : null}

      {awaiting.length ? <ApprovalCard order={order} /> : null}

      <CodeCard order={order} />

      {order.status === "out_for_delivery" ? <RiderCard order={order} /> : null}

      <section aria-label={t("order.items")} className="rounded-2xl bg-surface p-4 ring-1 ring-border sm:p-5">
        <h2 className="mb-3 text-base font-semibold">{t("order.items")}</h2>
        <OrderItems order={order} />
      </section>

      <OrderBill order={order} due={due} />

      <section aria-label="Details" className="grid gap-3 rounded-2xl bg-surface p-4 text-sm ring-1 ring-border sm:grid-cols-2 sm:p-5">
        <div className="flex gap-3">
          {order.mode === "delivery" ? <MapPin className="size-5 shrink-0 text-muted" aria-hidden /> : <Store className="size-5 shrink-0 text-muted" aria-hidden />}
          <div>
            <p className="font-semibold">{order.mode === "delivery" ? t("order.deliveringTo") : t("order.pickupFrom")}</p>
            {order.address ? (
              <p className="text-muted">
                {order.address.line1}, {order.address.area}, {order.address.pincode}
                {order.address.landmark ? ` · ${landmarkText(order.address.landmark)}` : ""}
              </p>
            ) : (
              <p className="text-muted">{STORE.address}</p>
            )}
          </div>
        </div>
        <div className="flex gap-3">
          <Phone className="size-5 shrink-0 text-muted" aria-hidden />
          <div>
            <p className="font-semibold">{t("order.help")}</p>
            <p className="text-muted">
              {t("footer.call")} <span className="select-all font-semibold text-fg">{STORE.phone}</span>
            </p>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        {order.invoiceNumber ? (
          <ButtonLink href={`/orders/${order.id}/invoice`} variant="outline">
            <FileText className="size-4" aria-hidden /> {t("order.invoice")}
          </ButtonLink>
        ) : null}
        {isCancellable(order.status) && order.status !== "placed" ? (
          <Button variant="ghost" onClick={() => setCancelling(true)} className="text-danger">
            <X className="size-4" aria-hidden /> {t("order.cancel")}
          </Button>
        ) : null}
        {order.customer.id && order.status !== "placed" ? <RepeatOrderButton orderId={order.id} variant="ghost" /> : null}
      </div>

      {meta.tone === "bad" && order.fulfilment.failReason ? <p className="text-sm text-muted">{t("order.riderReason", { reason: order.fulfilment.failReason })}</p> : null}

      <CancelSheet order={order} open={cancelling} onOpenChange={setCancelling} />
    </div>
  );
}

function headline(o: Order, t: TFn) {
  switch (o.status) {
    case "out_for_delivery":
      return t("order.hOnWay");
    case "ready_for_pickup":
      return t("order.hReady");
    case "delivered":
      return t("order.hDelivered");
    case "picked_up":
      return t("order.hPickedUp");
    default:
      return t(`status.${o.status}` as Key);
  }
}

function subline(o: Order, t: TFn, lang: Lang) {
  const when = `${dayText(lang, o.slot)}, ${slotText(lang, o.slot)}`;
  if (o.status === "cancelled") return t("order.sCancelled");
  if (o.status === "delivery_failed") return t("order.sFailed");
  if (o.status === "returned") return t("order.sReturned");
  if (o.status === "delivered" || o.status === "picked_up")
    return `${t("common.items", { n: o.items.filter((i) => i.status === "packed").length })} · ${rupees(o.totalFinal ?? o.totalEstimated)}`;
  return o.mode === "delivery" ? t("order.sSlot", { when }) : t("order.sPickup", { when });
}

function PlacedBanner({ order }: { order: Order }) {
  const t = useT();
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-primary p-4 text-primary-fg animate-sheet-up" role="status">
      <span className="grid size-12 shrink-0 place-items-center rounded-full bg-black/15 animate-pop">
        <CircleCheck className="size-7" aria-hidden />
      </span>
      <div>
        <p className="font-display text-lg font-semibold">{t("order.placedTitle")}</p>
        <p className="text-sm opacity-90">{t("order.placedBody", { n: order.number })}</p>
      </div>
    </div>
  );
}

function Callout({ tone, icon, title, children }: { tone: "warn" | "info" | "good"; icon: React.ReactNode; title: string; children: React.ReactNode }) {
  const cls = { warn: "bg-accent-soft ring-accent/30 [&_.ic]:text-accent", info: "bg-info-soft ring-info/30 [&_.ic]:text-info", good: "bg-primary-soft ring-primary/30 [&_.ic]:text-primary" }[tone];
  return (
    <section className={`flex gap-3 rounded-2xl p-4 ring-1 ${cls}`}>
      <span className="ic mt-0.5 shrink-0" aria-hidden>
        {icon}
      </span>
      <div className="min-w-0 flex-1 text-sm">
        <h2 className="mb-1 font-display text-base font-semibold">{title}</h2>
        {children}
      </div>
    </section>
  );
}

function useMinutesLeft(since?: number) {
  const now = useNow();
  const { substitutionTimeoutMin } = useSettings();
  if (!since || !now) return substitutionTimeoutMin;
  return Math.max(0, Math.ceil(substitutionTimeoutMin - (now - since) / 60_000));
}

function ApprovalCard({ order }: { order: Order }) {
  const t = useT();
  const awaiting = order.items.filter((i) => i.status === "awaiting");
  return (
    <Callout tone="warn" icon={<CircleAlert className="size-5" />} title={awaiting.length > 1 ? t("approve.titleMany", { n: awaiting.length }) : t("approve.titleOne")}>
      <ul className="mt-2 grid gap-3">
        {awaiting.map((i) => (
          <ApprovalRow
            key={i.lineId}
            item={i}
            onDecide={async (d) => {
              const r = await resolveApprovalAction(order.id, i.lineId, d);
              if (r.ok) toast.success(d === "accept" ? t("approve.accepted") : t("approve.removed"));
              else toast.error(r.error);
            }}
          />
        ))}
      </ul>
    </Callout>
  );
}

function ApprovalRow({ item, onDecide }: { item: Order["items"][number]; onDecide: (d: "accept" | "remove") => void }) {
  const t = useT();
  const left = useMinutesLeft(item.awaitingSince);
  const alt = item.proposed;
  return (
    <li className="rounded-xl bg-surface p-3 ring-1 ring-border">
      <p className="text-fg">
        {t("approve.unavailable", { name: item.name })}{" "}
        {alt
          ? t("approve.offer", { name: alt.name, unit: alt.unitLabel, price: `${rupees(alt.price)}${alt.unitType === "weight" ? "/kg" : ""}` })
          : t("approve.noAlt")}
      </p>
      {alt ? (
        <div className="mt-2 flex items-center gap-3">
          <ProductArt icon={alt.icon} tint={alt.tint} className="w-12 rounded-lg" />
          <span className="text-sm text-muted">{t("approve.was", { price: `${rupees(item.unitPrice)}${item.unitType === "weight" ? "/kg" : ""}` })}</span>
        </div>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {alt ? (
          <Button size="sm" onClick={() => onDecide("accept")}>
            {t("approve.accept")}
          </Button>
        ) : null}
        <Button size="sm" variant="outline" onClick={() => onDecide("remove")}>
          {t("approve.remove")}
        </Button>
        <span className="text-xs text-muted">{t("approve.timeout", { n: left })}</span>
      </div>
    </li>
  );
}

function CodeCard({ order }: { order: Order }) {
  const t = useT();
  const show = ["packed", "out_for_delivery", "ready_for_pickup"].includes(order.status);
  if (!show) return null;
  const pickup = order.mode === "pickup";
  return (
    <section aria-label={pickup ? t("code.pickup") : t("code.delivery")} className="flex items-center gap-4 rounded-2xl bg-surface p-4 ring-1 ring-border sm:p-5">
      <div className="min-w-0 flex-1">
        <h2 className="font-display text-base font-semibold">{pickup ? t("code.pickup") : t("code.delivery")}</h2>
        <p className="text-sm text-muted">{pickup ? t("code.pickupHint") : t("code.deliveryHint")}</p>
      </div>
      <p className="flex gap-1.5 font-display text-3xl font-bold tracking-[0.2em] tabular" aria-label={order.fulfilment.code.split("").join(" ")}>
        {order.fulfilment.code}
      </p>
    </section>
  );
}

function RiderCard({ order }: { order: Order }) {
  const f = order.fulfilment;
  const STORE = useSettings();
  const t = useT();
  return (
    <section aria-label={t("rider.label")} className="flex items-center gap-3 rounded-2xl bg-surface p-4 ring-1 ring-border">
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
        <Bike className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1 text-sm">
        {f.kind === "own" ? (
          <>
            <p className="font-semibold">{t("rider.from", { name: f.riderName || t("rider.ourStaff"), store: STORE.name })}</p>
            {f.riderPhone ? (
              <p className="text-muted">
                <span className="select-all">{f.riderPhone}</span>
              </p>
            ) : null}
          </>
        ) : (
          <>
            <p className="font-semibold">{t("rider.partner", { name: f.partnerName ?? t("rider.ourPartner") })}</p>
            <p className="text-muted">{t("rider.partnerTracking")}</p>
          </>
        )}
      </div>
      {f.kind === "partner" && f.trackingUrl ? (
        <a href={f.trackingUrl} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center gap-1.5 rounded-xl px-3 font-bold text-primary hover:bg-primary-soft">
          {t("rider.track")} <ExternalLink className="size-4" aria-hidden />
        </a>
      ) : null}
    </section>
  );
}

function OrderBill({ order, due }: { order: Order; due: number }) {
  const t = useT();
  const final = order.totalFinal !== undefined;
  const items = order.items.reduce((s, i) => s + (final ? itemBilled(i) : itemEstimated(i)), 0);
  const rows: BillRow[] = [
    { label: final ? t("bill.itemsPacked") : t("bill.itemsEst"), value: items },
    { label: order.mode === "pickup" ? t("bill.pickup") : t("bill.delivery"), value: order.deliveryFee === 0 ? t("common.free") : order.deliveryFee, tone: order.deliveryFee === 0 ? "save" : undefined },
  ];
  if (order.walletUsed) rows.push({ label: t("bill.paidWallet"), value: -order.walletUsed, tone: "save" });
  if (final && order.totalFinal !== order.totalEstimated) rows.push({ label: t("bill.chargedAtCheckout"), value: order.totalEstimated, tone: "muted" });

  const adj = order.adjustment;
  return (
    <div className="grid gap-2">
      <Bill rows={rows} total={order.totalFinal ?? order.totalEstimated} totalLabel={final ? t("bill.final") : t("bill.estimated")} />
      {adj?.credited ? (
        <p className="flex items-center gap-2 rounded-xl bg-primary-soft px-3.5 py-2.5 text-sm">
          <Wallet className="size-4 shrink-0 text-primary" aria-hidden />
          <span>{t("bill.credited", { amount: rupees(adj.credited) })}</span>
        </p>
      ) : null}
      {adj?.absorbed ? <p className="rounded-xl bg-surface-2 px-3.5 py-2.5 text-sm text-muted">{t("bill.absorbed", { amount: rupees(adj.absorbed) })}</p> : null}
      {due > 0 && !["delivered", "picked_up", "cancelled", "returned"].includes(order.status) ? (
        <p className="flex items-center justify-between gap-3 rounded-xl bg-accent-soft px-3.5 py-2.5 text-sm">
          <span>{order.paymentStatus === "cod_due" ? (order.mode === "pickup" ? t("checkout.payCounter") : t("bill.payOnDelivery")) : t("bill.balanceOnDelivery")}</span>
          <b className="font-display text-base tabular">{rupees(due)}</b>
        </p>
      ) : null}
    </div>
  );
}

const REASONS: Key[] = ["cancel.r1", "cancel.r2", "cancel.r3", "cancel.r4"];

function CancelSheet({ order, open, onOpenChange }: { order: Order; open: boolean; onOpenChange: (v: boolean) => void }) {
  const t = useT();
  const [reason, setReason] = useState<Key>(REASONS[0]);
  const refund = (order.paymentStatus === "paid" ? order.totalEstimated : 0) + order.walletUsed;
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={t("cancel.title", { n: order.number })}
      description={refund ? t("cancel.refund", { amount: rupees(refund) }) : t("cancel.nothingCharged")}
      footer={
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancel.keep")}
          </Button>
          <Button
            variant="danger"
            onClick={async () => {
              // the store reads reasons in English, whatever language the shopper chose
              const r = await cancelOrderAction(order.id, t(reason, undefined, "en"));
              if (r.ok) {
                toast.success(t("cancel.done"));
                onOpenChange(false);
              } else toast.error(r.error);
            }}
          >
            {t("order.cancel")}
          </Button>
        </div>
      }
    >
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-semibold">{t("cancel.why")}</legend>
        {REASONS.map((r) => (
          <label key={r} className="flex h-12 cursor-pointer items-center gap-3 rounded-xl px-3 ring-1 ring-border has-[:checked]:bg-primary-soft has-[:checked]:ring-2 has-[:checked]:ring-primary">
            <input type="radio" name="cancel-reason" value={r} checked={reason === r} onChange={() => setReason(r)} className="size-4 accent-[var(--primary)]" />
            {t(r)}
          </label>
        ))}
      </fieldset>
    </Sheet>
  );
}
