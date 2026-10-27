"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { ConfirmationResult } from "@firebase/auth";
import { KeyRound, LoaderCircle, ShieldCheck } from "lucide-react";
import { updateProfileAction } from "@/app/actions";
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

  const digits = phone.replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "");
  const pretty = `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;

  const finish = () => {
    router.refresh();
    onDone?.();
  };

  const send = async () => {
    if (!/^[6-9]\d{9}$/.test(digits)) return setErr("Enter a 10-digit mobile number starting with 6, 7, 8 or 9");
    setErr(undefined);
    if (!firebaseEnabled) return setStep("code");
    setBusy(true);
    try {
      confirmation.current = await sendOtp(`+91${digits}`, "send-code");
      setStep("code");
    } catch (e) {
      setErr(otpErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (!/^\d{6}$/.test(code) && !(!firebaseEnabled && /^\d{4}$/.test(code))) return setErr("Enter the code from the SMS");
    setBusy(true);
    setErr(undefined);
    try {
      const body = firebaseEnabled ? { idToken: await confirmOtp(confirmation.current!, code) } : { devPhone: digits, devCode: code };
      const res = await fetch("/api/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = (await res.json()) as { ok?: boolean; needsName?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "We couldn't log you in. Please try again.");
      if (data.needsName) setStep("name");
      else finish();
    } catch (e) {
      setErr((e as { code?: string }).code ? otpErrorMessage(e) : (e as Error).message);
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
          label="Mobile number"
          prefix="+91"
          inputMode="numeric"
          autoComplete="tel-national"
          maxLength={14}
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/[^\d ]/g, ""))}
          placeholder="98765 43210"
          error={err}
          hint="We'll send a one-time code by SMS. No password needed."
        />
        <Button id="send-code" type="submit" disabled={busy} className="w-full sm:w-auto sm:justify-self-start">
          {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <KeyRound className="size-4" aria-hidden />} Send code
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
          Code sent to <b className="tabular">{pretty}</b>{" "}
          <button
            type="button"
            onClick={() => {
              setStep("phone");
              setCode("");
              setErr(undefined);
            }}
            className="cursor-pointer font-bold text-primary underline-offset-2 hover:underline"
          >
            Change
          </button>
        </p>
        {!firebaseEnabled ? (
          <p className="flex items-center gap-2 rounded-lg bg-info-soft px-3 py-2 text-sm text-info">
            <ShieldCheck className="size-4 shrink-0" aria-hidden /> Developer test mode: use code <b className="tabular">1234</b>. Real SMS turns on with Firebase.
          </p>
        ) : null}
        <Field
          id="otp"
          label={firebaseEnabled ? "6-digit code" : "Code"}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          error={err}
          className="max-w-xs tabular"
        />
        <Button type="submit" disabled={busy} className="w-full sm:w-auto sm:justify-self-start">
          {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null} Verify and continue
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
      <p className="text-sm text-muted">Welcome! What should our delivery staff call you?</p>
      <Field id="name" label="Your name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} error={err} placeholder="e.g. Sunita Deshmukh" className="max-w-sm" />
      <Button type="submit" disabled={busy || name.trim().length < 2} className="w-full sm:w-auto sm:justify-self-start">
        Continue
      </Button>
    </form>
  );
}
