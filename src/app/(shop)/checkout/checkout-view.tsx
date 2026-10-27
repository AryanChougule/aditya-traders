"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Banknote, Bike, CreditCard, LoaderCircle, LogOut, PhoneCall, RefreshCcw, ShieldCheck, Smartphone, Store, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { placeOrderAction, setDefaultAddressAction, updateProfileAction } from "@/app/actions";
import { useSettings } from "@/components/providers";
import { Bill } from "@/components/shop/bill";
import { openGateway } from "@/components/shop/gateway";
import { PhoneLogin } from "@/components/shop/phone-login";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Switch } from "@/components/ui/field";
import { cartQuote, useCart, useHydrated } from "@/lib/cart-store";
import { rupees } from "@/lib/money";
import { deliveryFee } from "@/lib/settings";
import { deliverySlots, pickupSlots, type SlotOption } from "@/lib/slots";
import type { Address, FulfilmentMode, PaymentMethod, SubPref } from "@/lib/types";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";
import { AddressStep } from "./address-step";

export type CheckoutData = {
  customer: { name: string; phone: string; subPref: SubPref } | null;
  addresses: (Address & { isDefault: boolean })[];
  wallet: number;
  bookings: Record<string, number>;
  onlinePayments: boolean;
};

export function CheckoutView({ data }: { data: CheckoutData }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const settings = useSettings();
  const cart = useCart((s) => s.cart);
  const clearCart = useCart((s) => s.clear);
  const { customer, addresses, wallet: balance, bookings, onlinePayments } = data;

  const [mode, setModeRaw] = useState<FulfilmentMode>("delivery");
  const [addressChoice, setAddressId] = useState<string>();
  const [slotChoice, setSlotId] = useState<string>();
  const [dayChoice, setDay] = useState<number>();
  const [subPrefChoice, setSubPref] = useState<SubPref>();
  const [methodChoice, setMethod] = useState<PaymentMethod>();
  const [useWallet, setUseWallet] = useState(true);
  const [placing, setPlacing] = useState(false);
  const now = useNow();

  // Defaults come from the saved profile until the shopper picks something else.
  const addressId = addressChoice ?? addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id;
  const subPref = subPrefChoice ?? customer?.subPref ?? "similar";
  const method: PaymentMethod = onlinePayments ? (methodChoice ?? "upi") : "cod";
  const setMode = (m: FulfilmentMode) => {
    setModeRaw(m);
    setSlotId(undefined);
    setDay(undefined);
  };

  const address = addresses.find((a) => a.id === addressId);
  const km = address ? settings.serviceable[address.pincode] : undefined;
  const lines = cart.filter((l) => l.snap?.available);
  const q = cartQuote(cart, settings, { mode, km, wallet: useWallet ? balance : 0 });

  const days = useMemo(
    () => (now ? (mode === "delivery" ? deliverySlots(settings, bookings, now) : pickupSlots(settings, now)) : []),
    [mode, settings, bookings, now],
  );
  // fall back to the first open slot when nothing is chosen or the chosen one has filled up
  const firstOpenDay = days.findIndex((d) => d.slots.some((x) => !x.closed));
  const slot =
    days.flatMap((d) => d.slots).find((x) => x.id === slotChoice && !x.closed) ??
    (firstOpenDay >= 0 ? days[firstOpenDay].slots.find((x) => !x.closed) : undefined);
  const day = dayChoice ?? (slot ? days.findIndex((d) => d.slots.some((x) => x.id === slot.id)) : Math.max(firstOpenDay, 0));

  if (!hydrated || !now) return <div className="h-96 rounded-2xl bg-surface-2" aria-busy />;

  if (placing && !lines.length)
    return (
      <div className="grid justify-items-center gap-3 rounded-3xl bg-surface px-6 py-12 text-center ring-1 ring-border" role="status">
        <LoaderCircle className="size-8 animate-spin text-primary" aria-hidden />
        <p className="font-display text-lg font-semibold">Confirming your order…</p>
      </div>
    );

  if (!lines.length)
    return (
      <div className="grid justify-items-center gap-3 rounded-3xl bg-surface px-6 py-12 text-center ring-1 ring-border">
        <h1 className="text-xl font-semibold">Nothing to check out</h1>
        <p className="text-muted">Your cart is empty or the items in it just went out of stock.</p>
        <ButtonLink href="/">Back to shop</ButtonLink>
      </div>
    );

  const codBlocked = q.total > settings.codLimit;
  const missing: string[] = [];
  if (!customer) missing.push("log in");
  else if (!customer.name) missing.push("add your name");
  if (mode === "delivery" && !address) missing.push("add an address");
  if (!slot) missing.push(mode === "delivery" ? "choose a slot" : "choose a pickup time");
  if (!settings.acceptingOrders) missing.push("wait until the store reopens online orders");
  const ready = missing.length === 0 && !q.belowMinimum && !(method === "cod" && codBlocked);

  const place = async () => {
    if (!slot) return;
    setPlacing(true);
    const r = await placeOrderAction({
      lines: lines.map((l) => ({ productId: l.productId, qty: l.qty })),
      mode,
      addressId: mode === "delivery" ? address?.id : undefined,
      slotId: slot.id,
      subPref,
      paymentMethod: method,
      useWallet: useWallet && balance > 0,
    });
    if (!r.ok) {
      setPlacing(false);
      toast.error(r.error);
      router.refresh();
      return;
    }
    const { order, gateway } = r.value;
    clearCart();
    if (gateway) {
      openGateway(gateway, order, customer, {
        onPaid: () => router.replace(`/orders/${order.id}?placed=1`),
        onDismiss: () => router.replace(`/orders/${order.id}`),
      });
    } else router.replace(`/orders/${order.id}?placed=1`);
  };

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-8">
      <div className="grid gap-4">
        <h1 className="text-2xl font-semibold">Checkout</h1>

        <Step n={1} title="Your details" done={!!customer}>
          {customer ? (
            <div className="flex items-center justify-between gap-3">
              {customer.name ? (
                <p>
                  <b>{customer.name}</b> <span className="text-muted tabular">· {customer.phone}</span>
                </p>
              ) : (
                <NameForm phone={customer.phone} />
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await fetch("/api/session", { method: "DELETE" });
                  router.refresh();
                }}
              >
                <LogOut className="size-4" aria-hidden /> Not you?
              </Button>
            </div>
          ) : (
            <PhoneLogin />
          )}
        </Step>

        <Step n={2} title="Delivery or pickup" done>
          <div role="radiogroup" aria-label="How do you want your order" className="grid grid-cols-2 gap-2">
            <Choice checked={mode === "delivery"} onClick={() => setMode("delivery")} icon={<Bike className="size-5" />} title="Deliver to me" sub={q.subtotal >= settings.freeDeliveryAt ? "Free delivery" : `From ${rupees(deliveryFee(settings, 0))}`} />
            <Choice checked={mode === "pickup"} onClick={() => setMode("pickup")} icon={<Store className="size-5" />} title="I'll pick it up" sub="Free · at the counter" />
          </div>
          {mode === "pickup" ? <p className="mt-3 text-sm text-muted">Collect from {settings.address}. Show the pickup code we give you at the counter.</p> : null}
        </Step>

        {mode === "delivery" ? (
          <Step n={3} title="Delivery address" done={!!address}>
            {customer ? (
              <AddressStep
                addresses={addresses}
                selectedId={addressId}
                onSelect={(id) => {
                  setAddressId(id);
                  setDefaultAddressAction(id);
                }}
                onPickup={() => setMode("pickup")}
              />
            ) : (
              <p className="text-sm text-muted">Log in first so we can save your address.</p>
            )}
          </Step>
        ) : null}

        <Step n={mode === "delivery" ? 4 : 3} title={mode === "delivery" ? "Delivery slot" : "Pickup time"} done={!!slot}>
          <SlotPicker days={days} day={day} setDay={setDay} slotId={slot?.id} setSlotId={setSlotId} />
        </Step>

        <Step n={mode === "delivery" ? 5 : 4} title="If an item is out of stock" done>
          <div role="radiogroup" aria-label="If an item is out of stock" className="grid gap-2 sm:grid-cols-3">
            <Choice checked={subPref === "similar"} onClick={() => setSubPref("similar")} icon={<RefreshCcw className="size-5" />} title="Replace with similar" sub="Same type, never more than 10% dearer" />
            <Choice checked={subPref === "ask"} onClick={() => setSubPref("ask")} icon={<PhoneCall className="size-5" />} title="Ask me first" sub={`It shows on your order page and we may call. No reply in ${settings.substitutionTimeoutMin} min removes it.`} />
            <Choice checked={subPref === "remove"} onClick={() => setSubPref("remove")} icon={<Trash2 className="size-5" />} title="Remove it" sub="And refund the amount" />
          </div>
        </Step>

        <Step n={mode === "delivery" ? 6 : 5} title="Payment" done>
          <div role="radiogroup" aria-label="Payment method" className="grid gap-2">
            {onlinePayments ? (
              <>
                <Choice row checked={method === "upi"} onClick={() => setMethod("upi")} icon={<Smartphone className="size-5" />} title="UPI" sub="GPay, PhonePe, Paytm or any UPI app" badge="Fastest" />
                <Choice row checked={method === "card"} onClick={() => setMethod("card")} icon={<CreditCard className="size-5" />} title="Debit or credit card" sub="Visa, Mastercard, RuPay" />
              </>
            ) : null}
            <Choice
              row
              checked={method === "cod"}
              onClick={() => setMethod("cod")}
              disabled={codBlocked}
              icon={<Banknote className="size-5" />}
              title={mode === "pickup" ? "Pay at the counter" : "Cash or UPI on delivery"}
              sub={codBlocked ? `Available for orders up to ${rupees(settings.codLimit)}` : mode === "pickup" ? "Cash or UPI when you collect" : "Cash or scan-and-pay UPI when it arrives. You pay the exact final bill."}
            />
          </div>
          {balance > 0 ? (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-primary-soft px-3.5 py-1.5">
              <label htmlFor="use-wallet" className="flex items-center gap-2 text-sm">
                <Wallet className="size-4 text-primary" aria-hidden />
                Use wallet balance <b className="tabular">{rupees(balance)}</b>
              </label>
              <Switch id="use-wallet" checked={useWallet} onChange={setUseWallet} label="Use wallet balance" />
            </div>
          ) : null}
        </Step>
      </div>

      <aside className="grid gap-3 lg:sticky lg:top-32">
        <Bill
          rows={[
            { label: `Items (${q.itemCount})`, value: q.subtotal, strike: q.savings > 0 ? q.mrpTotal : undefined },
            {
              label: mode === "pickup" ? "Pickup" : km ? `Delivery · ${km} km` : "Delivery",
              value: q.deliveryFee === 0 ? "Free" : q.deliveryFee,
              tone: q.deliveryFee === 0 ? "save" : undefined,
            },
            ...(q.walletUsed ? [{ label: "Wallet", value: -q.walletUsed, tone: "save" as const }] : []),
          ]}
          total={q.total}
          totalLabel={q.hasLoose ? "To pay (estimated)" : "To pay"}
          note={
            q.hasLoose
              ? "Includes loose items at the weight you chose. If the packed weight is lower, the difference goes to your wallet."
              : "Prices include GST. You'll get a GST invoice once your order is packed."
          }
        />
        <p className="flex items-center gap-2 px-1 text-xs text-muted">
          <ShieldCheck className="size-4 shrink-0" aria-hidden /> Cancel free of charge until we start packing.
        </p>
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur lg:static lg:border-0 lg:bg-transparent lg:p-0">
          {!ready ? (
            <p className="mb-2 text-center text-sm text-muted lg:text-left" role="status">
              {q.belowMinimum ? `Minimum order is ${rupees(settings.minOrder)}` : codBlocked && method === "cod" ? `Cash on delivery is available up to ${rupees(settings.codLimit)}` : `To continue, ${missing.join(", ")}.`}
            </p>
          ) : null}
          <Button size="lg" className="w-full justify-between" disabled={!ready || placing} onClick={place}>
            <span className="tabular">{rupees(q.total)}</span>
            <span>{method === "cod" ? "Place order" : `Pay ${rupees(q.total)}`}</span>
          </Button>
          <p className="mt-2 hidden text-center text-xs text-muted lg:block">
            By placing the order you agree to our <Link href="/legal/terms" className="underline">terms</Link> and <Link href="/legal/privacy" className="underline">privacy policy</Link>.
          </p>
        </div>
        <div className="h-24 lg:hidden" aria-hidden />
      </aside>
    </div>
  );
}

function Step({ n, title, done, children }: { n: number; title: string; done: boolean; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`step-${n}`} className="rounded-2xl bg-surface p-4 ring-1 ring-border sm:p-5">
      <h2 id={`step-${n}`} className="mb-3 flex items-center gap-2.5 text-base font-semibold">
        <span
          className={cn(
            "grid size-7 place-items-center rounded-full font-display text-sm font-bold",
            done ? "bg-primary text-primary-fg" : "bg-surface-2 text-muted",
          )}
          aria-hidden
        >
          {n}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Choice({
  checked,
  onClick,
  icon,
  title,
  sub,
  badge,
  row,
  disabled,
}: {
  checked: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  sub?: string;
  badge?: string;
  row?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "relative flex cursor-pointer gap-3 rounded-xl p-3.5 text-left ring-1 transition-[box-shadow,background-color] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-55",
        row ? "items-center" : "flex-col",
        checked ? "bg-primary-soft ring-2 ring-primary" : "bg-surface ring-border hover:bg-surface-2",
      )}
    >
      <span className={cn("grid size-10 shrink-0 place-items-center rounded-lg", checked ? "bg-primary text-primary-fg" : "bg-surface-2 text-fg")} aria-hidden>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 font-bold">
          {title}
          {badge ? <span className="rounded-md bg-accent-soft px-1.5 py-0.5 text-[11px] font-bold text-accent">{badge}</span> : null}
        </span>
        {sub ? <span className="block text-sm text-muted">{sub}</span> : null}
      </span>
      {row ? (
        <span className={cn("grid size-5 shrink-0 place-items-center rounded-full ring-2", checked ? "ring-primary" : "ring-border")} aria-hidden>
          {checked ? <span className="size-2.5 rounded-full bg-primary" /> : null}
        </span>
      ) : null}
    </button>
  );
}

function SlotPicker({
  days,
  day,
  setDay,
  slotId,
  setSlotId,
}: {
  days: { day: string; slots: SlotOption[] }[];
  day: number;
  setDay: (n: number) => void;
  slotId?: string;
  setSlotId: (id: string) => void;
}) {
  const current = days[day];
  return (
    <div className="grid gap-3">
      <div role="tablist" aria-label="Day" className="inline-flex gap-1 justify-self-start rounded-xl bg-surface-2 p-1">
        {days.map((d, i) => {
          const open = d.slots.filter((x) => !x.closed).length;
          return (
            <button
              key={d.day}
              role="tab"
              aria-selected={i === day}
              onClick={() => setDay(i)}
              className={cn("h-10 cursor-pointer rounded-lg px-4 text-sm font-bold transition-colors", i === day ? "bg-surface shadow-sm" : "text-muted hover:text-fg")}
            >
              {d.day} <span className="font-normal text-muted">· {open} open</span>
            </button>
          );
        })}
      </div>
      {current ? (
        current.slots.some((x) => !x.closed) ? (
          <div role="radiogroup" aria-label={`${current.day} slots`} className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {current.slots.map((x) => {
              const left = x.capacity - x.booked;
              const checked = x.id === slotId;
              return (
                <button
                  key={x.id}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  disabled={x.closed}
                  onClick={() => setSlotId(x.id)}
                  className={cn(
                    "grid h-16 cursor-pointer content-center justify-items-center rounded-xl ring-1 transition-[box-shadow,background-color] active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-surface-2/60 disabled:text-muted disabled:ring-transparent",
                    checked ? "bg-primary-soft ring-2 ring-primary" : "bg-surface ring-border hover:bg-surface-2",
                  )}
                >
                  <span className="font-bold tabular">{x.label}</span>
                  <span className={cn("text-xs", x.closed ? "" : left <= 2 && x.capacity < 99 ? "font-bold text-accent" : "text-muted")}>
                    {x.closed ? x.reason : x.capacity >= 99 ? "Available" : left <= 2 ? `Only ${left} left` : "Available"}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="rounded-xl bg-surface-2 px-3.5 py-3 text-sm text-muted">No slots left {current.day.toLowerCase()}. Try the other day.</p>
        )
      ) : null}
    </div>
  );
}

/** For a customer who verified their number but never gave a name (the rider needs one). */
function NameForm({ phone }: { phone: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="flex flex-1 flex-wrap items-end gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const r = await updateProfileAction({ name });
        setBusy(false);
        if (!r.ok) return toast.error(r.error);
        router.refresh();
      }}
    >
      <Field id="checkout-name" label={`Your name (${phone})`} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className="min-w-48 flex-1" />
      <Button type="submit" disabled={busy || name.trim().length < 2} className="h-12">
        Save
      </Button>
    </form>
  );
}
