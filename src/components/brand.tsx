"use client";

import Link from "next/link";
import { useSettings } from "@/components/providers";
import { cn } from "@/lib/utils";

/** Placeholder mark: a basket under a rising sun ("Aditya" = the sun). Replace with the store's logo when available. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("size-9", className)} aria-hidden>
      <rect width="40" height="40" rx="11" fill="var(--primary)" />
      <circle cx="20" cy="17" r="6.5" fill="#fbbf24" />
      <path d="M8 19.5h24l-2.6 11.2a2.5 2.5 0 0 1-2.44 1.95H13.04a2.5 2.5 0 0 1-2.44-1.95L8 19.5Z" fill="var(--primary-fg)" />
      <path d="M14.5 24v4.5M20 24v4.5M25.5 24v4.5" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function Brand({ href = "/", sub }: { href?: string; sub?: string }) {
  const STORE = useSettings();
  return (
    <Link href={href} className="flex min-w-0 items-center gap-2.5 rounded-xl" aria-label={`${STORE.name} home`}>
      <LogoMark />
      <span className="min-w-0 leading-tight">
        <span className="block truncate font-display text-[17px] font-bold tracking-tight">{STORE.name}</span>
        {sub ? <span className="block truncate text-xs font-semibold text-muted">{sub}</span> : null}
      </span>
    </Link>
  );
}
