"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { KeyRound, LoaderCircle, ShieldCheck } from "lucide-react";
import { useT } from "@/components/i18n";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { firebaseEnabled, googleSignIn, loginErrorMessage, signInCancelled } from "@/lib/firebase-client";

async function startSession(body: object): Promise<string | null> {
  const res = await fetch("/api/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (res.ok) return null;
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  return data.error ?? "";
}

/**
 * The whole sign-up: one tap on "Continue with Google". Name comes from Google; the mobile number the rider
 * calls is asked for at checkout. Without Firebase (a developer's machine) it falls back to the test login.
 */
export function Login({ onDone }: { onDone?: () => void }) {
  return firebaseEnabled ? <GoogleLogin onDone={onDone} /> : <TestLogin onDone={onDone} />;
}

function GoogleLogin({ onDone }: { onDone?: () => void }) {
  const router = useRouter();
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>();

  const go = async () => {
    setBusy(true);
    setErr(undefined);
    try {
      const error = await startSession({ idToken: await googleSignIn() });
      if (error !== null) return setErr(error || t("login.failed"));
      router.refresh();
      onDone?.();
    } catch (e) {
      if (!signInCancelled(e)) setErr(t(loginErrorMessage(e)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-3">
      <button
        type="button"
        onClick={go}
        disabled={busy}
        className="inline-flex h-13 w-full cursor-pointer items-center justify-center gap-3 rounded-xl border border-border bg-white px-5 text-base font-bold text-[#1f1f1f] shadow-sm transition-transform hover:bg-[#f8f9fa] active:scale-[0.98] disabled:opacity-70 sm:w-auto sm:justify-self-start"
      >
        {busy ? <LoaderCircle className="size-5 animate-spin" aria-hidden /> : <GoogleMark />}
        {t("login.google")}
      </button>
      {err ? (
        <p role="alert" className="text-sm font-semibold text-danger">
          {err}
        </p>
      ) : (
        <p className="text-sm text-muted">{t("login.googleHint")}</p>
      )}
    </div>
  );
}

/** Google's "G", in its own colours as their brand rules ask. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="size-5" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

/** Developer test login: any mobile number and the code 1234. The server refuses it in production or once Firebase is set up. */
function TestLogin({ onDone }: { onDone?: () => void }) {
  const router = useRouter();
  const t = useT();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string>();
  const [busy, setBusy] = useState(false);
  const digits = phone.replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "");

  return (
    <form
      className="grid gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!/^[6-9]\d{9}$/.test(digits)) return setErr(t("login.errPhone"));
        if (!/^\d{4}$/.test(code)) return setErr(t("login.errCode"));
        setBusy(true);
        setErr(undefined);
        const error = await startSession({ devPhone: digits, devCode: code });
        setBusy(false);
        if (error !== null) return setErr(error || t("login.failed"));
        router.refresh();
        onDone?.();
      }}
    >
      <p className="flex items-center gap-2 rounded-lg bg-info-soft px-3 py-2 text-sm text-info">
        <ShieldCheck className="size-4 shrink-0" aria-hidden /> {t("login.devMode")} <b className="tabular">1234</b>
      </p>
      <Field
        id="phone"
        label={t("login.mobile")}
        prefix="+91"
        inputMode="numeric"
        autoComplete="tel-national"
        maxLength={14}
        value={phone}
        onChange={(e) => setPhone(e.target.value.replace(/[^\d ]/g, ""))}
        placeholder="98765 43210"
      />
      <Field
        id="otp"
        label={t("login.code")}
        inputMode="numeric"
        maxLength={4}
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
        error={err}
        className="max-w-xs tabular"
      />
      <Button type="submit" disabled={busy} className="w-full sm:w-auto sm:justify-self-start">
        {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <KeyRound className="size-4" aria-hidden />} {t("login.verify")}
      </Button>
    </form>
  );
}
