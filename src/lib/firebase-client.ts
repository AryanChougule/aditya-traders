"use client";

import type { ConfirmationResult } from "@firebase/auth";
import type { Key } from "./i18n";

/*
 * Firebase only sends and checks the SMS code. The server then verifies the resulting ID token and issues
 * our own session cookie, so Firebase holds no session state for the app. Loaded on demand to keep it
 * out of every other page's JavaScript.
 */

export const firebaseEnabled = Boolean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);

let verifier: { clear: () => void } | null = null;

async function auth() {
  const [{ getApp, getApps, initializeApp }, { getAuth }] = await Promise.all([import("@firebase/app"), import("@firebase/auth")]);
  const app = getApps().length
    ? getApp()
    : initializeApp({
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      });
  const a = getAuth(app);
  a.languageCode = "en";
  return a;
}

/** Sends the SMS. `anchorId` is the element the invisible reCAPTCHA attaches to (the send button). */
export async function sendOtp(phoneE164: string, anchorId: string): Promise<ConfirmationResult> {
  const a = await auth();
  const { RecaptchaVerifier, signInWithPhoneNumber } = await import("@firebase/auth");
  verifier?.clear();
  const v = new RecaptchaVerifier(a, anchorId, { size: "invisible" });
  verifier = v;
  try {
    return await signInWithPhoneNumber(a, phoneE164, v);
  } catch (e) {
    v.clear();
    verifier = null;
    throw e;
  }
}

export async function confirmOtp(confirmation: ConfirmationResult, code: string): Promise<string> {
  const cred = await confirmation.confirm(code);
  const token = await cred.user.getIdToken();
  await (await auth()).signOut();
  return token;
}

/** Firebase error codes → a message key the shopper can act on. */
export function otpErrorMessage(e: unknown): Key {
  const code = (e as { code?: string })?.code ?? "";
  if (code.includes("invalid-verification-code")) return "login.wrongCode";
  if (code.includes("code-expired")) return "login.expired";
  if (code.includes("too-many-requests")) return "login.tooMany";
  if (code.includes("invalid-phone-number")) return "login.errPhone";
  if (code.includes("quota-exceeded")) return "login.quota";
  // the store's Firebase setup, not the shopper: billing off, Phone sign-in off, or this domain not authorised
  if (/billing-not-enabled|operation-not-allowed|unauthorized-domain|captcha-check-failed|invalid-app-credential/.test(code)) {
    console.error(`Firebase phone login is not set up correctly: ${code}`);
    return "login.notReady";
  }
  if (code) console.error(`Firebase phone login failed: ${code}`);
  return "login.failed";
}
