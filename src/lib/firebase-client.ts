"use client";

import type { Key } from "./i18n";

/*
 * Firebase only proves who the shopper is (Google sign-in). The server then verifies the resulting ID token and
 * issues our own session cookie, so Firebase holds no session state for the app. Loaded on demand to keep it
 * out of every other page's JavaScript.
 */

export const firebaseEnabled = Boolean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);

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
  return getAuth(app);
}

/** Opens Google's account picker and returns a Firebase ID token for the server to verify. */
export async function googleSignIn(): Promise<string> {
  const a = await auth();
  const { GoogleAuthProvider, signInWithPopup } = await import("@firebase/auth");
  const provider = new GoogleAuthProvider();
  // always show the picker, so a shared family phone can choose the right account
  provider.setCustomParameters({ prompt: "select_account" });
  const cred = await signInWithPopup(a, provider);
  const token = await cred.user.getIdToken();
  await a.signOut();
  return token;
}

/** The shopper closed Google's window themselves: not an error worth showing. */
export const signInCancelled = (e: unknown) => /popup-closed-by-user|cancelled-popup-request|user-cancelled/.test((e as { code?: string })?.code ?? "");

/** Firebase error codes → a message key the shopper can act on. */
export function loginErrorMessage(e: unknown): Key {
  const code = (e as { code?: string })?.code ?? "";
  if (code.includes("popup-blocked")) return "login.popupBlocked";
  // in-app browsers (Instagram, Facebook) can't show Google's sign-in; Chrome can
  if (/operation-not-supported-in-this-environment|web-storage-unsupported|disallowed/.test(code)) return "login.openInBrowser";
  if (code.includes("too-many-requests")) return "login.tooMany";
  if (code.includes("network-request-failed")) return "login.offline";
  // the store's Firebase setup, not the shopper: Google sign-in off, or this domain not authorised
  if (/operation-not-allowed|unauthorized-domain|configuration-not-found|invalid-api-key/.test(code)) {
    console.error(`Google sign-in is not set up correctly: ${code}`);
    return "login.notReady";
  }
  if (code) console.error(`Google sign-in failed: ${code}`);
  return "login.failed";
}
