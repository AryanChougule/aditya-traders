"use client";

import { useLang, useT } from "@/components/i18n";
import { useSettings } from "@/components/providers";
import { hourLabel } from "@/lib/i18n";

export function LandingHours() {
  const s = useSettings();
  const lang = useLang();
  return <>{useT()("landing.hours", { open: hourLabel(lang, s.opensAt), close: hourLabel(lang, s.closesAt) })}</>;
}
