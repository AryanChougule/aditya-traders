"use client";

import { useState } from "react";
import { Plus, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { saveSettingsAction, saveStaffAction, setStaffRoleAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Field, Switch } from "@/components/ui/field";
import { Pill } from "@/components/ui/pill";
import type { StoreSettings } from "@/lib/settings";

type Staff = { id: string; name: string; email: string; phone: string; role: "customer" | "owner" | "packer" | "rider" };

const rs = (p: number) => String(p / 100);
const ps = (r: string) => Math.round(Number(r || 0) * 100);

/** Everything the owner configures. Rupee fields are edited in rupees and stored in paise. */
export function SettingsForm({ initial, gatewayReady, staff, meId }: { initial: StoreSettings; gatewayReady: boolean; staff: Staff[]; meId: string }) {
  const [s, setS] = useState(initial);
  const [money, setMoney] = useState({ minOrder: rs(initial.minOrder), freeDeliveryAt: rs(initial.freeDeliveryAt), codLimit: rs(initial.codLimit), absorbUpTo: rs(initial.absorbUpTo) });
  const [areas, setAreas] = useState(Object.entries(initial.serviceable).map(([pin, km]) => ({ pin, km: String(km) })));
  const [bands, setBands] = useState(initial.feeBands.map((b) => ({ upToKm: String(b.upToKm), fee: rs(b.fee) })));
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof StoreSettings>(k: K, v: StoreSettings[K]) => setS({ ...s, [k]: v });

  const save = async () => {
    const bad = areas.find((a) => !/^\d{6}$/.test(a.pin.trim()) || !(Number(a.km) >= 0));
    if (bad) return toast.error(`Check the delivery area "${bad.pin}": pincode must be 6 digits and distance a number.`);
    setBusy(true);
    const r = await saveSettingsAction({
      ...s,
      minOrder: ps(money.minOrder),
      freeDeliveryAt: ps(money.freeDeliveryAt),
      codLimit: ps(money.codLimit),
      absorbUpTo: ps(money.absorbUpTo),
      serviceable: Object.fromEntries(areas.map((a) => [a.pin.trim(), Number(a.km)])),
      feeBands: bands.map((b) => ({ upToKm: Number(b.upToKm), fee: ps(b.fee) })),
    });
    setBusy(false);
    if (r.ok) toast.success("Settings saved. The shop updates straight away.");
    else toast.error(r.error);
  };

  return (
    <div className="grid max-w-3xl gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <Button onClick={save} disabled={busy}>
          Save settings
        </Button>
      </div>

      <AnnouncementCard value={s.announcement} onChange={(a) => set("announcement", a)} />

      <Card title="Taking orders">
        <ToggleRow label="Accept online orders" hint="Turn off to pause checkout (holiday, stock-taking). Shoppers can still browse." checked={s.acceptingOrders} onChange={(v) => set("acceptingOrders", v)} />
        <ToggleRow
          label="Online payments (UPI and cards)"
          hint={gatewayReady ? "Razorpay keys are set up. Turn on to offer UPI and card at checkout." : "Add RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET and RAZORPAY_WEBHOOK_SECRET in Vercel first. Until then, customers pay on delivery or at the counter."}
          checked={s.onlinePayments}
          disabled={!gatewayReady}
          onChange={(v) => set("onlinePayments", v)}
        />
      </Card>

      <Card title="Store details" sub="Shown in the shop footer and on invoices.">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="st-name" label="Store name" value={s.name} onChange={(e) => set("name", e.target.value)} />
          <Field id="st-short" label="Short name (home-screen icon)" value={s.shortName} onChange={(e) => set("shortName", e.target.value)} />
        </div>
        <Field id="st-addr" label="Shop address" value={s.address} onChange={(e) => set("address", e.target.value)} placeholder="Shop no., street, area, city, pincode" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="st-phone" label="Store phone" inputMode="tel" value={s.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+91 98765 43210" />
          <Field id="st-tagline" label="Tagline" value={s.tagline} onChange={(e) => set("tagline", e.target.value)} />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="grid gap-1.5 text-sm font-semibold">
            GST registration
            <select className="h-12 rounded-xl border border-border bg-surface px-3 text-base" value={s.gstScheme} onChange={(e) => set("gstScheme", e.target.value as StoreSettings["gstScheme"])}>
              <option value="regular">Regular (tax invoice)</option>
              <option value="composition">Composition (bill of supply)</option>
              <option value="unregistered">Not registered (plain bill, no GST)</option>
            </select>
          </label>
          <Field id="st-gstin" label="GSTIN" value={s.gstin} onChange={(e) => set("gstin", e.target.value.toUpperCase())} maxLength={15} placeholder="27ABCDE1234F1Z5" />
          <div className="grid grid-cols-[1fr_72px] gap-2">
            <Field id="st-state" label="State" value={s.stateName} onChange={(e) => set("stateName", e.target.value)} />
            <Field id="st-code" label="Code" inputMode="numeric" value={s.stateCode} onChange={(e) => set("stateCode", e.target.value)} maxLength={2} />
          </div>
        </div>
      </Card>

      <Card title="Hours and slots" sub="Hours in 24-hour time: 8 = 8 am, 13 = 1 pm, 22 = 10 pm. For an afternoon break, e.g. closed 1 pm – 4 pm, enter 13 and 16; use 0 and 0 for no break. No delivery slots are offered during the break.">
        <div className="grid gap-3 sm:grid-cols-4">
          <Field id="st-open" label="Opens (hour, 24h)" inputMode="numeric" value={String(s.opensAt)} onChange={(e) => set("opensAt", Number(e.target.value) || 0)} />
          <Field id="st-close" label="Closes (hour, 24h)" inputMode="numeric" value={String(s.closesAt)} onChange={(e) => set("closesAt", Number(e.target.value) || 0)} />
          <Field id="st-bstart" label="Break from (hour)" inputMode="numeric" value={String(s.breakStart)} onChange={(e) => set("breakStart", Number(e.target.value) || 0)} />
          <Field id="st-bend" label="Break until (hour)" inputMode="numeric" value={String(s.breakEnd)} onChange={(e) => set("breakEnd", Number(e.target.value) || 0)} />
          <Field id="st-cap" label="Orders per 2-hour slot" inputMode="numeric" value={String(s.slotCapacity)} onChange={(e) => set("slotCapacity", Number(e.target.value) || 1)} />
          <Field id="st-cut" label="Slot cut-off (minutes)" inputMode="numeric" value={String(s.slotCutoffMinutes)} onChange={(e) => set("slotCutoffMinutes", Number(e.target.value) || 0)} />
        </div>
      </Card>

      <Card title="Delivery area" sub="Pincodes you deliver to and roughly how far each is from the shop. Anything else can only order for pickup.">
        <div className="grid gap-2">
          {areas.map((a, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_44px] items-end gap-2">
              <Field id={`pin-${i}`} label={i === 0 ? "Pincode" : ""} aria-label="Pincode" inputMode="numeric" maxLength={6} value={a.pin} onChange={(e) => setAreas(areas.map((x, j) => (j === i ? { ...x, pin: e.target.value.replace(/\D/g, "") } : x)))} />
              <Field id={`km-${i}`} label={i === 0 ? "Distance (km)" : ""} aria-label="Distance in km" inputMode="decimal" value={a.km} onChange={(e) => setAreas(areas.map((x, j) => (j === i ? { ...x, km: e.target.value } : x)))} />
              <Button variant="ghost" aria-label={`Remove ${a.pin}`} onClick={() => setAreas(areas.filter((_, j) => j !== i))} className="h-12">
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" className="justify-self-start" onClick={() => setAreas([...areas, { pin: "", km: "2" }])}>
            <Plus className="size-4" aria-hidden /> Add pincode
          </Button>
        </div>
      </Card>

      <Card title="Fees and limits" sub="Amounts in rupees.">
        <div className="grid gap-3 sm:grid-cols-4">
          <Field id="m-min" label="Minimum order" prefix="₹" inputMode="decimal" value={money.minOrder} onChange={(e) => setMoney({ ...money, minOrder: e.target.value })} />
          <Field id="m-free" label="Free delivery above" prefix="₹" inputMode="decimal" value={money.freeDeliveryAt} onChange={(e) => setMoney({ ...money, freeDeliveryAt: e.target.value })} />
          <Field id="m-cod" label="Cash on delivery up to" prefix="₹" inputMode="decimal" value={money.codLimit} onChange={(e) => setMoney({ ...money, codLimit: e.target.value })} />
          <Field id="m-abs" label="Absorb overweight up to" prefix="₹" inputMode="decimal" value={money.absorbUpTo} onChange={(e) => setMoney({ ...money, absorbUpTo: e.target.value })} />
        </div>
        <p className="text-sm font-semibold">Delivery fee by distance (below the free-delivery amount)</p>
        <div className="grid gap-2">
          {bands.map((b, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_44px] items-end gap-2">
              <Field id={`band-km-${i}`} label={i === 0 ? "Up to (km)" : ""} aria-label="Up to km" inputMode="decimal" value={b.upToKm} onChange={(e) => setBands(bands.map((x, j) => (j === i ? { ...x, upToKm: e.target.value } : x)))} />
              <Field id={`band-fee-${i}`} label={i === 0 ? "Fee" : ""} aria-label="Fee" prefix="₹" inputMode="decimal" value={b.fee} onChange={(e) => setBands(bands.map((x, j) => (j === i ? { ...x, fee: e.target.value } : x)))} />
              <Button variant="ghost" aria-label="Remove band" disabled={bands.length === 1} onClick={() => setBands(bands.filter((_, j) => j !== i))} className="h-12">
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" className="justify-self-start" onClick={() => setBands([...bands, { upToKm: "10", fee: "50" }])}>
            <Plus className="size-4" aria-hidden /> Add distance band
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="st-tol" label="Weighing tolerance (%)" inputMode="numeric" value={String(Math.round(s.weightTolerance * 100))} onChange={(e) => set("weightTolerance", (Number(e.target.value) || 0) / 100)} />
          <Field id="st-sub" label="Wait for shopper's reply (minutes)" inputMode="numeric" value={String(s.substitutionTimeoutMin)} onChange={(e) => set("substitutionTimeoutMin", Number(e.target.value) || 1)} />
        </div>
      </Card>

      <div className="flex justify-end">
        <Button size="lg" onClick={save} disabled={busy}>
          Save settings
        </Button>
      </div>

      <StaffCard staff={staff} meId={meId} />
    </div>
  );
}

function Card({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-3 rounded-2xl bg-surface p-4 ring-1 ring-border sm:p-5">
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        {sub ? <p className="text-sm text-muted">{sub}</p> : null}
      </div>
      {children}
    </section>
  );
}

function ToggleRow({ label, hint, checked, onChange, disabled }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="font-semibold">{label}</p>
        <p className="text-sm text-muted">{hint}</p>
      </div>
      <div className={disabled ? "pointer-events-none opacity-50" : undefined}>
        <Switch checked={checked} onChange={onChange} label={label} />
      </div>
    </div>
  );
}

const ROLE_LABEL = { owner: "Owner", packer: "Packer", rider: "Rider", customer: "No access" } as const;

function StaffCard({ staff, meId }: { staff: Staff[]; meId: string }) {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Staff["role"]>("packer");

  const report = (r: { ok: boolean; error?: string }, done: string) => {
    if (r.ok) toast.success(done);
    else toast.error(r.error);
    return r.ok;
  };

  return (
    <Card
      title="Staff"
      sub="Staff log in with their own Google account, the same way customers do. Add them by the Gmail address on their phone. Packers can pack and update stock; riders see only their drops; owners see everything. Give riders a mobile number: customers see it to call them."
    >
      <ul className="divide-y divide-border">
        {staff.map((u) => (
          <li key={u.id} className="flex flex-wrap items-center gap-3 py-2.5">
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">
                {u.name || "No name yet"} {u.id === meId ? <Pill>You</Pill> : null}
              </span>
              <span className="block text-sm text-muted">{[u.email, u.phone].filter(Boolean).join(" · ") || "No contact yet"}</span>
            </span>
            <select
              aria-label={`Role for ${u.name || u.email}`}
              className="h-10 rounded-lg border border-border bg-surface px-2 text-sm"
              value={u.role}
              disabled={u.id === meId}
              onChange={async (e) => report(await setStaffRoleAction({ userId: u.id, role: e.target.value as Staff["role"] }), "Role updated")}
            >
              {(["owner", "packer", "rider", "customer"] as const).map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </select>
          </li>
        ))}
      </ul>
      <form
        className="grid gap-2 rounded-xl bg-surface-2/60 p-3 sm:grid-cols-2 lg:grid-cols-[1fr_1.3fr_1fr_auto_auto] lg:items-end"
        onSubmit={async (e) => {
          e.preventDefault();
          if (report(await saveStaffAction({ email, name, phone, role }), `${name} added as ${ROLE_LABEL[role].toLowerCase()}`)) {
            setEmail("");
            setPhone("");
            setName("");
          }
        }}
      >
        <Field id="sf-name" label="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <Field id="sf-email" label="Gmail address" type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@gmail.com" />
        <Field id="sf-phone" label={role === "rider" ? "Mobile number" : "Mobile (optional)"} prefix="+91" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <label className="grid gap-1.5 text-sm font-semibold">
          Role
          <select className="h-12 rounded-xl border border-border bg-surface px-3 text-base" value={role} onChange={(e) => setRole(e.target.value as Staff["role"])}>
            <option value="packer">Packer</option>
            <option value="rider">Rider</option>
            <option value="owner">Owner</option>
          </select>
        </label>
        <Button type="submit" className="h-12">
          <UserPlus className="size-4" aria-hidden /> Add
        </Button>
      </form>
    </Card>
  );
}

type Announcement = StoreSettings["announcement"];

/** The big message on the landing page, written in both languages. */
function AnnouncementCard({ value: a, onChange }: { value: Announcement; onChange: (a: Announcement) => void }) {
  const set = <K extends keyof Announcement>(k: K, v: Announcement[K]) => onChange({ ...a, [k]: v });
  return (
    <Card title="Landing page announcement" sub="The big banner customers see first on your website, with an Order now button. Use it for an offer or festival wishes. Write both languages; if Marathi is empty, English is shown.">
      <ToggleRow label="Show the announcement" hint="When off, the landing page shows a plain welcome instead." checked={a.enabled} onChange={(v) => set("enabled", v)} />
      <div role="radiogroup" aria-label="Style" className="flex flex-wrap gap-2">
        {(
          [
            ["festival", "Festival wishes", "A festive banner: the Diwali scene, or deep red"],
            ["offer", "Offer", "Bold turmeric, big badge for the offer"],
          ] as const
        ).map(([k, label, hint]) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={a.kind === k}
            onClick={() => set("kind", k)}
            className={`grid cursor-pointer rounded-xl px-4 py-2.5 text-left ring-1 transition-colors ${a.kind === k ? "bg-primary-soft ring-2 ring-primary" : "ring-border hover:bg-surface-2"}`}
          >
            <span className="font-bold">{label}</span>
            <span className="text-sm text-muted">{hint}</span>
          </button>
        ))}
      </div>
      {a.kind === "festival" ? (
        <div role="radiogroup" aria-label="Artwork" className="grid gap-1.5">
          <span className="text-sm font-semibold">Artwork</span>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["diwali", "Diwali scene", "Animated diyas, rangoli, akash kandil and fireworks, with शुभ दीपावली"],
                ["simple", "Simple", "Just the colours, for any other festival"],
              ] as const
            ).map(([k, label, hint]) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={a.art === k}
                onClick={() => set("art", k)}
                className={`grid max-w-xs cursor-pointer rounded-xl px-4 py-2.5 text-left ring-1 transition-colors ${a.art === k ? "bg-primary-soft ring-2 ring-primary" : "ring-border hover:bg-surface-2"}`}
              >
                <span className="font-bold">{label}</span>
                <span className="text-sm text-muted">{hint}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="an-title-en" label="Heading (English)" value={a.titleEn} maxLength={80} onChange={(e) => set("titleEn", e.target.value)} placeholder="Happy Diwali from Aditya Traders" />
        <Field id="an-title-mr" label="Heading (मराठी)" value={a.titleMr} maxLength={80} onChange={(e) => set("titleMr", e.target.value)} lang="mr" placeholder="दिवाळीच्या हार्दिक शुभेच्छा!" />
        <TextArea id="an-msg-en" label="Message (English)" value={a.messageEn} onChange={(v) => set("messageEn", v)} />
        <TextArea id="an-msg-mr" label="Message (मराठी)" value={a.messageMr} onChange={(v) => set("messageMr", v)} lang="mr" />
        <Field id="an-badge-en" label="Badge (English, optional)" value={a.badgeEn} maxLength={24} onChange={(e) => set("badgeEn", e.target.value)} placeholder={a.kind === "offer" ? "10% off" : "Diwali"} hint="A few words, shown big above the heading." />
        <Field id="an-badge-mr" label="Badge (मराठी, optional)" value={a.badgeMr} maxLength={24} onChange={(e) => set("badgeMr", e.target.value)} lang="mr" placeholder={a.kind === "offer" ? "10% सूट" : "दिवाळी"} />
      </div>
      <Field
        id="an-ends"
        label="Show until (optional)"
        type="date"
        value={a.endsOn}
        onChange={(e) => set("endsOn", e.target.value)}
        hint="After this day it hides by itself, so an expired offer never stays up. Leave empty to keep it on."
        className="max-w-xs"
      />
      <p className="rounded-lg bg-surface-2 px-3 py-2 text-sm text-muted">
        Only announce offers you've actually set up. The website doesn't apply discounts by itself: change product prices in Products & stock.
      </p>
    </Card>
  );
}

function TextArea({ id, label, value, onChange, lang }: { id: string; label: string; value: string; onChange: (v: string) => void; lang?: string }) {
  return (
    <label htmlFor={id} className="grid gap-1.5 text-sm font-semibold">
      {label}
      <textarea
        id={id}
        lang={lang}
        rows={3}
        maxLength={240}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border border-border bg-surface p-3 text-base font-normal outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
      <span className="text-xs font-normal text-muted">{value.length}/240</span>
    </label>
  );
}
