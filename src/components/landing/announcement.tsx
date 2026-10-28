"use client";

import Link from "next/link";
import { ArrowRight, Store } from "lucide-react";
import { pick, useLang, useT } from "@/components/i18n";
import { useSettings } from "@/components/providers";
import { activeAnnouncement } from "@/lib/settings";
import { istDateKey } from "@/lib/slots";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";

/** A small oil lamp, drawn rather than an emoji so it themes and scales cleanly. */
function Diya({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden>
      <path d="M60 18c9 14 14 23 14 32a14 14 0 0 1-28 0c0-9 5-18 14-32Z" fill="var(--marigold)" />
      <path d="M60 34c4 7 6 11 6 16a6 6 0 0 1-12 0c0-5 2-9 6-16Z" fill="#fff3c4" />
      <path d="M18 70h84c-4 18-20 30-42 30S22 88 18 70Z" fill="#c2410c" />
      <path d="M18 70h84" stroke="#fde68a" strokeWidth="4" strokeLinecap="round" />
      <circle cx="40" cy="84" r="3.5" fill="#fde68a" />
      <circle cx="60" cy="88" r="3.5" fill="#fde68a" />
      <circle cx="80" cy="84" r="3.5" fill="#fde68a" />
    </svg>
  );
}

/** Marigold garland along the top edge of a festival banner. */
function Garland() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-between px-2" aria-hidden>
      {Array.from({ length: 18 }, (_, i) => (
        <span key={i} className="flex flex-col items-center">
          <span className="h-3 w-px bg-marigold/60" style={{ height: 8 + (i % 3) * 6 }} />
          <span className="size-3 rounded-full bg-marigold shadow-[0_0_0_2px_rgb(255_255_255/0.15)] sm:size-4" />
        </span>
      ))}
    </div>
  );
}

/**
 * The landing hero. Shows the owner's announcement (an offer or festival wishes) while it's switched on
 * and before its end date; otherwise a plain welcome. Both lead to the shop.
 */
export function AnnouncementHero() {
  const s = useSettings();
  const lang = useLang();
  const t = useT();
  const now = useNow();
  // until the clock is known (first paint), trust the switch; the end date is applied right after
  const a = now ? activeAnnouncement(s, istDateKey(now)) : s.announcement.enabled ? s.announcement : null;

  if (!a)
    return (
      <section className="relative overflow-hidden rounded-3xl bg-primary px-5 py-10 text-primary-fg sm:px-10 sm:py-14">
        <span className="absolute -right-10 -top-10 size-48 rounded-full bg-white/10" aria-hidden />
        <div className="relative grid max-w-2xl gap-4">
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-black/15 px-3 py-1 text-sm font-bold">
            <Store className="size-4" aria-hidden /> {s.name}
          </span>
          <h1 className="text-3xl font-bold leading-tight sm:text-5xl">{t("landing.heroTitle")}</h1>
          <p className="text-lg opacity-90">{t("landing.heroBody", { store: s.name })}</p>
          <OrderButtons variant="light" />
        </div>
      </section>
    );

  const festival = a.kind === "festival";
  const title = pick(lang, a.titleEn, a.titleMr);
  const message = pick(lang, a.messageEn, a.messageMr);
  const badge = pick(lang, a.badgeEn, a.badgeMr);
  const ends = a.endsOn
    ? new Date(`${a.endsOn}T12:00:00+05:30`).toLocaleDateString(lang === "mr" ? "mr-IN-u-nu-latn" : "en-IN", { day: "numeric", month: "long", timeZone: "Asia/Kolkata" })
    : null;

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-3xl px-5 pb-10 pt-14 sm:px-10 sm:pb-14 sm:pt-16",
        festival ? "bg-festive text-festive-fg" : "bg-offer text-offer-fg",
      )}
      aria-label={title}
    >
      {festival ? <Garland /> : null}
      {festival ? (
        <Diya className="pointer-events-none absolute -bottom-4 right-2 w-32 opacity-90 sm:right-10 sm:w-52" />
      ) : (
        <span className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full border-[28px] border-white/10" aria-hidden />
      )}
      <div className="relative grid max-w-2xl gap-4">
        {badge ? (
          <span
            className={cn(
              "inline-flex w-fit items-center rounded-full px-4 py-1.5 font-display font-bold",
              festival ? "bg-marigold text-[#3b0d14] text-base" : "bg-white text-offer text-2xl sm:text-3xl",
            )}
          >
            {badge}
          </span>
        ) : null}
        <h1 className="text-3xl font-bold leading-tight sm:text-5xl">{title}</h1>
        {message ? <p className="max-w-xl text-lg opacity-90">{message}</p> : null}
        <OrderButtons variant={festival ? "festive" : "light"} />
        {ends ? <p className="text-sm font-semibold opacity-80">{t("landing.endsOn", { date: ends })}</p> : null}
      </div>
    </section>
  );
}

export function OrderButtons({ variant }: { variant: "light" | "festive" | "primary" }) {
  const t = useT();
  const main =
    variant === "festive" ? "bg-marigold text-[#3b0d14] hover:brightness-105" : variant === "light" ? "bg-white text-fg hover:bg-white/90 dark:text-[#04241a]" : "bg-primary text-primary-fg hover:bg-primary-strong";
  const ghost = variant === "primary" ? "text-primary hover:bg-primary-soft" : "text-current ring-1 ring-current/40 hover:bg-white/10";
  return (
    <div className="flex flex-wrap gap-2.5 pt-1">
      <Link href="/shop" className={cn("inline-flex h-13 items-center gap-2 rounded-xl px-6 text-lg font-bold transition-transform active:scale-[0.97]", main)}>
        {t("landing.orderNow")} <ArrowRight className="size-5" aria-hidden />
      </Link>
      <Link href="/categories" className={cn("inline-flex h-13 items-center rounded-xl px-5 font-bold transition-colors", ghost)}>
        {t("landing.browse")}
      </Link>
    </div>
  );
}
