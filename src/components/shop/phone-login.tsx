"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { ConfirmationResult } from "@firebase/auth";
import { KeyRound, LoaderCircle, ShieldCheck } from "lucide-react";
import { updateProfileAction } from "@/app/actions";
import { useT } from "@/components/i18n";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { confirmOtp, firebaseEnabled, otpErrorMessage, sendOtp } from "@/lib/firebase-client";

type Step = "phone" | "code" | "name";

/** Phone + one-time code is the whole sign-up. New customers add their name once, after verifying. */
export function PhoneLogin({ onDone }: { onDone?: () => void }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState<string>();
  const [busy, setBusy] = useState(false);
  const confirmation = useRef<ConfirmationResult | null>(null);
  const t = useT();

  const digits = phone.replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "");
  const pretty = `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;

  const finish = () => {
    router.refresh();
    onDone?.();
  };

  const send = async () => {
    if (!/^[6-9]\d{9}$/.test(digits)) return setErr(t("login.errPhone"));
    setErr(undefined);
    if (!firebaseEnabled) return setStep("code");
    setBusy(true);
    try {
      confirmation.current = await sendOtp(`+91${digits}`, "send-code");
      setStep("code");
    } catch (e) {
      setErr(t(otpErrorMessage(e)));
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (!/^\d{6}$/.test(code) && !(!firebaseEnabled && /^\d{4}$/.test(code))) return setErr(t("login.errCode"));
    setBusy(true);
    setErr(undefined);
    try {
      const body = firebaseEnabled ? { idToken: await confirmOtp(confirmation.current!, code) } : { devPhone: digits, devCode: code };
      const res = await fetch("/api/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = (await res.json()) as { ok?: boolean; needsName?: boolean; error?: string };
      if (!res.ok) throw new Error(res.status === 401 ? t("login.wrongCode") : res.status === 429 ? t("login.tooMany") : (data.error ?? t("login.failed")));
      if (data.needsName) setStep("name");
      else finish();
    } catch (e) {
      setErr((e as { code?: string }).code ? t(otpErrorMessage(e)) : (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const saveName = async () => {
    setBusy(true);
    const r = await updateProfileAction({ name });
    setBusy(false);
    if (!r.ok) return setErr(r.error);
    finish();
  };

  if (step === "phone")
    return (
      <form
        className="grid gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
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
          error={err}
          hint={t("login.mobileHint")}
        />
        <Button id="send-code" type="submit" disabled={busy} className="w-full sm:w-auto sm:justify-self-start">
          {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <KeyRound className="size-4" aria-hidden />} {t("login.send")}
        </Button>
      </form>
    );

  if (step === "code")
    return (
      <form
        className="grid gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          verify();
        }}
      >
        <p className="text-sm">
          {t("login.sentTo")} <b className="tabular">{pretty}</b>{" "}
          <button
            type="button"
            onClick={() => {
              setStep("phone");
              setCode("");
              setErr(undefined);
            }}
            className="cursor-pointer font-bold text-primary underline-offset-2 hover:underline"
          >
            {t("common.change")}
          </button>
        </p>
        {!firebaseEnabled ? (
          <p className="flex items-center gap-2 rounded-lg bg-info-soft px-3 py-2 text-sm text-info">
            <ShieldCheck className="size-4 shrink-0" aria-hidden /> {t("login.devMode")} <b className="tabular">1234</b>
          </p>
        ) : null}
        <Field
          id="otp"
          label={firebaseEnabled ? t("login.code6") : t("login.code")}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          error={err}
          className="max-w-xs tabular"
        />
        <Button type="submit" disabled={busy} className="w-full sm:w-auto sm:justify-self-start">
          {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null} {t("login.verify")}
        </Button>
      </form>
    );

  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        saveName();
      }}
    >
      <p className="text-sm text-muted">{t("login.welcome")}</p>
      <Field id="name" label={t("login.yourName")} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} error={err} placeholder={t("login.namePlaceholder")} className="max-w-sm" />
      <Button type="submit" disabled={busy || name.trim().length < 2} className="w-full sm:w-auto sm:justify-self-start">
        {t("common.continue")}
      </Button>
    </form>
  );
}
