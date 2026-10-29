"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bike, ChevronRight, LogOut, MapPin, Phone, RefreshCcw, ShieldCheck, Store, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { deleteAccountAction, deleteAddressAction, setDefaultAddressAction, updateProfileAction } from "@/app/actions";
import { useLang, useT } from "@/components/i18n";
import { useSettings } from "@/components/providers";
import { Login } from "@/components/shop/login";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { rupees } from "@/lib/money";
import { hourLabel, type Key } from "@/lib/i18n";
import type { Address, LedgerEntry, SubPref } from "@/lib/types";
import { cn, dayLabel } from "@/lib/utils";

const PREFS: { key: SubPref; label: Key; icon: React.ReactNode }[] = [
  { key: "similar", label: "sub.similar", icon: <RefreshCcw className="size-4" /> },
  { key: "ask", label: "sub.ask", icon: <Phone className="size-4" /> },
  { key: "remove", label: "sub.remove", icon: <Trash2 className="size-4" /> },
];

type User = { name: string; phone: string; email: string; role: string; subPref: SubPref };

export function AccountView({
  user,
  addresses,
  wallet,
  ledger,
}: {
  user: User | null;
  addresses: (Address & { isDefault: boolean })[];
  wallet: number;
  ledger: LedgerEntry[];
}) {
  const router = useRouter();
  const s = useSettings();
  const t = useT();
  const lang = useLang();
  const [deleting, setDeleting] = useState(false);

  const act = async (p: Promise<{ ok: boolean; error?: string }>, done?: string) => {
    const r = await p;
    if (!r.ok) toast.error(r.error);
    else if (done) toast.success(done);
  };
  const logout = async () => {
    await fetch("/api/session", { method: "DELETE" });
    router.refresh();
  };
  const staff = user && user.role !== "customer";

  return (
    <div className="mx-auto grid max-w-2xl gap-4">
      <h1 className="text-2xl font-semibold">{t("nav.account")}</h1>

      {user ? (
        <section className="flex items-center gap-3 rounded-2xl bg-surface p-4 ring-1 ring-border">
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-primary-soft font-display text-lg font-bold text-primary">
            {(user.name || "?").slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{user.name || t("account.noName")}</p>
            <p className="truncate text-sm text-muted">{[user.email, user.phone].filter(Boolean).join(" · ")}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={logout}>
            <LogOut className="size-4" aria-hidden /> {t("account.logout")}
          </Button>
        </section>
      ) : (
        <section className="rounded-2xl bg-surface p-5 ring-1 ring-border">
          <p className="mb-4 text-muted">{t("account.loginPrompt")}</p>
          <Login />
        </section>
      )}

      {user ? (
        <>
          <section aria-labelledby="wallet-h" className="rounded-2xl bg-surface p-4 ring-1 ring-border">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-xl bg-primary-soft text-primary">
                <Wallet className="size-5" aria-hidden />
              </span>
              <div className="flex-1">
                <h2 id="wallet-h" className="text-base font-semibold">{t("account.wallet")}</h2>
                <p className="text-sm text-muted">{t("account.walletBody")}</p>
              </div>
              <p className="font-display text-xl font-semibold tabular">{rupees(wallet)}</p>
            </div>
            {ledger.length ? (
              <ul className="mt-3 divide-y divide-border border-t border-border text-sm">
                {ledger.slice(0, 10).map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="min-w-0">
                      <span className="block font-semibold">{l.note}</span>
                      <span className="block text-muted">
                        {l.orderNumber} · {dayLabel(l.at)}
                      </span>
                    </span>
                    <span className={cn("shrink-0 font-bold tabular", l.amount > 0 ? "text-primary" : "text-fg")}>
                      {l.amount > 0 ? "+" : ""}
                      {rupees(l.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <section id="addresses" aria-labelledby="addr-h" className="scroll-mt-32 rounded-2xl bg-surface p-4 ring-1 ring-border">
            <h2 id="addr-h" className="mb-2 text-base font-semibold">{t("addr.saved")}</h2>
            {addresses.length ? (
              <ul className="grid gap-1">
                {addresses.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-start gap-3 rounded-xl p-2">
                    <MapPin className="mt-0.5 size-5 shrink-0 text-muted" aria-hidden />
                    <span className="min-w-0 flex-1 text-sm">
                      <b>{t(`addr.${a.label}` as Key)}</b>
                      {a.isDefault ? <span className="ml-2 rounded-md bg-primary-soft px-1.5 py-0.5 text-xs font-bold text-primary">{t("account.default")}</span> : null}
                      <span className="block text-muted">
                        {a.line1}, {a.area}, {a.pincode}
                      </span>
                    </span>
                    {!a.isDefault ? (
                      <Button variant="ghost" size="sm" onClick={() => act(setDefaultAddressAction(a.id))}>
                        {t("account.makeDefault")}
                      </Button>
                    ) : null}
                    <Button variant="ghost" size="sm" className="text-danger" onClick={() => act(deleteAddressAction(a.id), t("account.addressRemoved"))} aria-label={t("account.removeAddress")}>
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">{t("account.noAddress")}</p>
            )}
          </section>

          <section aria-labelledby="pref-h" className="rounded-2xl bg-surface p-4 ring-1 ring-border">
            <h2 id="pref-h" className="text-base font-semibold">{t("sub.title")}</h2>
            <p className="mb-3 text-sm text-muted">{t("account.prefBody")}</p>
            <div role="radiogroup" aria-labelledby="pref-h" className="flex flex-wrap gap-2">
              {PREFS.map((p) => (
                <button
                  key={p.key}
                  role="radio"
                  aria-checked={user.subPref === p.key}
                  onClick={() => act(updateProfileAction({ subPref: p.key }))}
                  className={cn(
                    "inline-flex h-11 cursor-pointer items-center gap-2 rounded-full px-4 text-sm font-bold ring-1 transition-colors",
                    user.subPref === p.key ? "bg-primary-soft text-primary ring-2 ring-primary" : "ring-border hover:bg-surface-2",
                  )}
                >
                  {p.icon}
                  {t(p.label)}
                </button>
              ))}
            </div>
          </section>
        </>
      ) : null}

      <section aria-label="Store" className="divide-y divide-border rounded-2xl bg-surface ring-1 ring-border">
        <Row icon={<Store className="size-5" />} title={s.name} sub={`${s.address} · ${t("account.hours", { open: hourLabel(lang, s.opensAt), close: hourLabel(lang, s.closesAt) })}`} />
        <Row icon={<Phone className="size-5" />} title={t("footer.call")} sub={s.phone} selectable />
        <Row icon={<Bike className="size-5" />} title={t("footer.delivery")} sub={t("footer.terms", { free: rupees(s.freeDeliveryAt), min: rupees(s.minOrder) })} />
        <div className="flex gap-3 p-4">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-muted" aria-hidden />
          <div className="text-sm">
            <p className="font-semibold">{t("footer.policies")}</p>
            <p className="flex flex-wrap gap-x-3 text-muted">
              <Link href="/legal/terms" className="underline-offset-2 hover:underline">Terms</Link>
              <Link href="/legal/privacy" className="underline-offset-2 hover:underline">Privacy</Link>
              <Link href="/legal/refunds" className="underline-offset-2 hover:underline">Refunds</Link>
              <Link href="/legal/shipping" className="underline-offset-2 hover:underline">Delivery</Link>
            </p>
          </div>
        </div>
      </section>

      {staff ? (
        <section aria-label="Staff" className="rounded-2xl bg-surface ring-1 ring-border">
          <p className="px-4 pt-3 text-xs font-bold uppercase tracking-wide text-muted">{t("footer.staff")}</p>
          {user.role !== "rider" ? (
            <Link href="/console" className="flex h-14 items-center justify-between px-4 font-semibold hover:bg-surface-2">
              Store console <ChevronRight className="size-5 text-muted" aria-hidden />
            </Link>
          ) : null}
          <Link href="/rider" className="flex h-14 items-center justify-between rounded-b-2xl border-t border-border px-4 font-semibold hover:bg-surface-2">
            Rider view <ChevronRight className="size-5 text-muted" aria-hidden />
          </Link>
        </section>
      ) : null}

      {user && user.role === "customer" ? (
        <button onClick={() => setDeleting(true)} className="h-11 cursor-pointer justify-self-start rounded-lg text-sm font-semibold text-muted underline-offset-2 hover:text-danger hover:underline">
          {t("account.delete")}
        </button>
      ) : null}

      <Sheet
        open={deleting}
        onOpenChange={setDeleting}
        title={t("account.deleteTitle")}
        description={t("account.deleteBody")}
        footer={
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => setDeleting(false)}>
              {t("account.keep")}
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                const r = await deleteAccountAction();
                if (!r.ok) return toast.error(r.error);
                toast(t("account.deleted"));
                router.push("/shop");
              }}
            >
              {t("account.deleteConfirm")}
            </Button>
          </div>
        }
      >
        {wallet > 0 ? <p className="text-sm font-semibold text-danger">{t("account.walletWarning", { amount: rupees(wallet) })}</p> : null}
      </Sheet>
    </div>
  );
}

function Row({ icon, title, sub, selectable }: { icon: React.ReactNode; title: string; sub: string; selectable?: boolean }) {
  return (
    <div className="flex gap-3 p-4">
      <span className="mt-0.5 shrink-0 text-muted" aria-hidden>
        {icon}
      </span>
      <span className="min-w-0 text-sm">
        <span className="block font-semibold">{title}</span>
        <span className={cn("block text-muted", selectable && "select-all")}>{sub}</span>
      </span>
    </div>
  );
}
