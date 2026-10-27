"use client";

import { useEffect } from "react";
import { LogoMark } from "@/components/brand";

/** Shown when a page fails to load. The details go to the server logs, not to the shopper. */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="grid min-h-[60dvh] place-items-center px-4">
      <div className="grid max-w-sm justify-items-center gap-3 text-center">
        <LogoMark className="size-14" />
        <h1 className="text-2xl font-semibold">Something went wrong</h1>
        <p className="text-muted">Your cart is safe. Please try again. If it keeps happening, call the store.</p>
        <button onClick={reset} className="inline-flex h-11 cursor-pointer items-center rounded-xl bg-primary px-5 font-bold text-primary-fg">
          Try again
        </button>
        {error.digest ? <p className="text-xs text-muted">Reference: {error.digest}</p> : null}
      </div>
    </main>
  );
}
