"use client";

import type { ConfirmationResult } from "@firebase/auth";

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

/** Firebase error codes → something a shopper can act on. */
export function otpErrorMessage(e: unknown): string {
  const code = (e as { code?: string })?.code ?? "";
  if (code.includes("invalid-verification-code")) return "That code isn't right. Check the SMS and try again.";
  if (code.includes("code-expired")) return "That code has expired. Request a new one.";
  if (code.includes("too-many-requests")) return "Too many attempts from this phone. Please wait a while and try again.";
  if (code.includes("invalid-phone-number")) return "That doesn't look like a valid mobile number.";
  if (code.includes("quota-exceeded")) return "We can't send SMS right now. Please call the store to place your order.";
  return "We couldn't send or check the code. Please try again.";
}
