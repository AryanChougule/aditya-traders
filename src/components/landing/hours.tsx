"use client";

import { useLang, useT } from "@/components/i18n";
import { useSettings } from "@/components/providers";
import { hoursText } from "@/lib/i18n";

export function LandingHours() {
  const s = useSettings();
  const lang = useLang();
  return <>{useT()("landing.hours", { hours: hoursText(lang, s) })}</>;
}
