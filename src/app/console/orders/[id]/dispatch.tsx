"use client";

import { useState } from "react";
import { Bike, KeyRound, RotateCcw, Store, Truck, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import {
  completeHandoverAction,
  dispatchAction,
  failDeliveryAction,
  retryDeliveryAction,
  returnToStoreAction,
} from "@/app/actions";
import { amountDue } from "@/lib/pricing";
import { rupees } from "@/lib/money";
import type { Order } from "@/lib/types";
import { cn } from "@/lib/utils";
import { usePackData } from "./pack-order";

const PARTNERS = ["Porter", "Shadowfax", "Other courier"];
export const FAIL_REASONS = ["Customer not reachable", "Wrong or incomplete address", "Customer asked to come later", "Customer refused the order"];

/** Own rider for nearby drops, a partner for far or overflow orders (design doc §09). */
export function DispatchPanel({ order }: { order: Order }) {
  const { riders } = usePackData();
  const [kind, setKind] = useState<"own" | "partner">("own");
  const [riderId, setRiderId] = useState(riders[0]?.id ?? "");
  const [partner, setPartner] = useState(PARTNERS[0]);
  const [tracking, setTracking] = useState("");

  if (order.mode === "pickup")
    return (
      <section className="grid gap-3 rounded-2xl bg-surface p-4 ring-2 ring-primary sm:p-5">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Store className="size-5 text-primary" aria-hidden /> Put it on the pickup shelf
        </h2>
        <p className="text-sm text-muted">The shopper sees their pickup code on their order page. Check it at the counter.</p>
        <Button
          size="lg"
          className="sm:justify-self-start"
          onClick={async () => {
            const r = await dispatchAction(order.id, { kind: "pickup" });
            if (r.ok) toast.success("Marked ready for pickup");
            else toast.error(r.error);
          }}
        >
          Ready for pickup
        </Button>
      </section>
    );

  const busy = (id: string) => riders.find((r) => r.id === id)?.busy ?? 0;

  return (
    <section className="grid gap-4 rounded-2xl bg-surface p-4 ring-2 ring-primary sm:p-5">
      <h2 className="text-base font-semibold">Send it out</h2>
      <div role="radiogroup" aria-label="Delivery method" className="grid grid-cols-2 gap-2">
        {(
          [
            ["own", "Our rider", "Cheapest; can collect cash", <Bike key="b" className="size-5" />],
            ["partner", "Delivery partner", "For far or busy times", <Truck key="t" className="size-5" />],
          ] as const
        ).map(([k, t, d, icon]) => (
          <button
            key={k}
            role="radio"
            aria-checked={kind === k}
            onClick={() => setKind(k)}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-xl p-3 text-left ring-1 transition-colors",
              kind === k ? "bg-primary-soft ring-2 ring-primary" : "ring-border hover:bg-surface-2",
            )}
          >
            <span className="mt-0.5 text-primary" aria-hidden>{icon}</span>
            <span>
              <span className="block font-bold">{t}</span>
              <span className="block text-sm text-muted">{d}</span>
            </span>
          </button>
        ))}
      </div>

      {kind === "own" ? (
        <fieldset className="grid gap-2">
          <legend className="mb-1 text-sm font-semibold">Who's taking it?</legend>
          <div className="flex flex-wrap gap-2">
            {riders.map((r) => (
              <button
                key={r.id}
                aria-pressed={riderId === r.id}
                onClick={() => setRiderId(r.id)}
                className={cn(
                  "inline-flex h-11 cursor-pointer items-center gap-2 rounded-full px-4 text-sm font-bold ring-1 transition-colors",
                  riderId === r.id ? "bg-fg text-bg ring-fg" : "ring-border hover:bg-surface-2",
                )}
              >
                {r.name}
                <span className={cn("text-xs font-semibold", riderId === r.id ? "opacity-75" : "text-muted")}>
                  {busy(r.id) ? `${busy(r.id)} on the road` : "free"}
                </span>
              </button>
            ))}
          </div>
        </fieldset>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <fieldset>
            <legend className="mb-1.5 text-sm font-semibold">Partner</legend>
            <div className="flex flex-wrap gap-2">
              {PARTNERS.map((p) => (
                <button
                  key={p}
                  aria-pressed={partner === p}
                  onClick={() => setPartner(p)}
                  className={cn("h-11 cursor-pointer rounded-full px-4 text-sm font-bold ring-1", partner === p ? "bg-fg text-bg ring-fg" : "ring-border hover:bg-surface-2")}
                >
                  {p}
                </button>
              ))}
            </div>
          </fieldset>
          <Field
            id="tracking"
            label="Tracking link (optional)"
            type="url"
            value={tracking}
            onChange={(e) => setTracking(e.target.value)}
            placeholder="Paste from the partner app"
            hint="Book in the partner's app until the API is connected."
          />
        </div>
      )}

      <Button
        size="lg"
        className="sm:justify-self-start"
        onClick={async () => {
          const r = await dispatchAction(order.id, kind === "own" ? { kind: "own", riderId } : { kind: "partner", partnerName: partner, trackingUrl: tracking.trim() || undefined });
          if (r.ok) toast.success(kind === "own" ? `Assigned to ${riders.find((x) => x.id === riderId)?.name}` : `Booked with ${partner}`);
          else toast.error(r.error);
        }}
      >
        Send out
      </Button>
    </section>
  );
}

/** Confirms handover with the shopper's 4-digit code, or records a failed delivery. Shared by console and rider view. */
export function HandoverPanel({ order, compact }: { order: Order; compact?: boolean }) {
  const complete = completeHandoverAction;
  const fail = failDeliveryAction;
  const retry = retryDeliveryAction;
  const giveBack = returnToStoreAction;
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string>();
  const [failing, setFailing] = useState(false);
  const due = amountDue(order);
  const pickup = order.status === "ready_for_pickup";

  if (order.status === "delivery_failed" && compact)
    return (
      <p className="rounded-xl bg-danger-soft p-3 text-sm">
        <b>Marked as not delivered</b> ({order.fulfilment.failReason ?? "no reason"}). Bring it back to the store. The store will call the customer and send it again.
      </p>
    );

  if (order.status === "delivery_failed")
    return (
      <section className={cn("grid gap-3 rounded-2xl bg-danger-soft p-4 ring-1 ring-danger/30", compact && "p-3")}>
        <p className="text-sm">
          <b>Delivery failed:</b> {order.fulfilment.failReason ?? "no reason given"}. Call the customer, then try again or bring it back.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={async () => { const r = await retry(order.id); if (!r.ok) toast.error(r.error); }}>
            <RotateCcw className="size-4" aria-hidden /> Try again
          </Button>
          <Button variant="outline" onClick={async () => { const r = await giveBack(order.id); if (r.ok) toast("Returned to store. Prepaid amount refunded to the wallet."); else toast.error(r.error); }}>
            <Undo2 className="size-4" aria-hidden /> Return to store
          </Button>
        </div>
      </section>
    );

  return (
    <section className={cn("grid gap-3 rounded-2xl bg-surface p-4 ring-2 ring-primary sm:p-5", compact && "p-3 ring-1 ring-border sm:p-3")}>
      {!compact ? (
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <KeyRound className="size-5 text-primary" aria-hidden /> {pickup ? "Hand over at the counter" : "Confirm delivery"}
        </h2>
      ) : null}
      {due > 0 ? (
        <p className="flex items-center justify-between rounded-xl bg-accent-soft px-3.5 py-2.5">
          <span className="text-sm font-semibold">Collect first (cash or UPI)</span>
          <b className="font-display text-xl tabular">{rupees(due)}</b>
        </p>
      ) : (
        <p className="text-sm font-semibold text-primary">Fully paid. Nothing to collect.</p>
      )}
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await complete(order.id, code);
          if (r.ok) {
            toast.success(pickup ? "Handed over" : "Delivered");
            setErr(undefined);
          } else setErr(r.error);
        }}
      >
        <Field
          id={`code-${order.id}`}
          label="Customer's 4-digit code"
          inputMode="numeric"
          maxLength={4}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          error={err}
          className="w-44"
        />
        <Button type="submit" size="lg" disabled={code.length !== 4}>
          {pickup ? "Hand over" : "Delivered"}
        </Button>
      </form>
      {!pickup ? (
        failing ? (
          <div className="grid gap-2">
            <p className="text-sm font-semibold">What happened?</p>
            <div className="flex flex-wrap gap-2">
              {FAIL_REASONS.map((r) => (
                <Button key={r} size="sm" variant="outline" onClick={async () => { await fail(order.id, r); setFailing(false); toast("Marked as failed. The store will follow up."); }}>
                  {r}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <button onClick={() => setFailing(true)} className="h-11 cursor-pointer justify-self-start rounded-lg text-sm font-bold text-danger underline-offset-2 hover:underline">
            Couldn't deliver?
          </button>
        )
      ) : (
        <button
          onClick={async () => { const r = await giveBack(order.id); if (r.ok) toast("Returned to shelf. Prepaid amount refunded to the wallet."); else toast.error(r.error); }}
          className="h-11 cursor-pointer justify-self-start rounded-lg text-sm font-bold text-muted underline-offset-2 hover:underline"
        >
          Not collected by closing? Return to shelf
        </button>
      )}
    </section>
  );
}
