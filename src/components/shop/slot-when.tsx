"use client";

import { useLang, useT } from "@/components/i18n";
import { dayText, slotText } from "@/lib/i18n";
import type { FulfilmentMode, Slot } from "@/lib/types";

/** "Arriving tomorrow, 9 am – 11 am" / "उद्या, सकाळी 9 – 11 ला येईल", for order lists rendered on the server. */
export function SlotWhen({ slot, mode }: { slot: Slot; mode: FulfilmentMode }) {
  const lang = useLang();
  const t = useT();
  const when = `${dayText(lang, slot)}, ${slotText(lang, slot)}`;
  return <>{mode === "delivery" ? t("orders.arriving", { when }) : t("orders.pickupWhen", { when })}</>;
}
