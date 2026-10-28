import { z } from "zod";
import type { Paise } from "./types";

/*
 * Everything the owner configures in Console → Settings. Stored as one JSON row in the database,
 * validated with this schema on every save. Defaults are placeholders until the owner fills them in.
 */
export const settingsSchema = z.object({
  name: z.string().min(2).max(60),
  shortName: z.string().min(1).max(20),
  tagline: z.string().max(120),
  address: z.string().min(5).max(200),
  phone: z.string().min(8).max(20),
  /** shown on invoices; empty until the owner adds it */
  gstin: z.string().max(15),
  /** composition-scheme stores issue a bill of supply instead of a tax invoice */
  gstScheme: z.enum(["regular", "composition"]),
  stateName: z.string().max(40),
  stateCode: z.string().max(2),
  opensAt: z.number().int().min(0).max(23),
  closesAt: z.number().int().min(1).max(24),
  /** pincode → approximate distance from the store in km */
  serviceable: z.record(z.string().regex(/^\d{6}$/), z.number().min(0).max(30)),
  minOrder: z.number().int().min(0),
  freeDeliveryAt: z.number().int().min(0),
  feeBands: z.array(z.object({ upToKm: z.number().min(0), fee: z.number().int().min(0) })).min(1),
  codLimit: z.number().int().min(0),
  slotCapacity: z.number().int().min(1).max(100),
  slotCutoffMinutes: z.number().int().min(0).max(600),
  weightTolerance: z.number().min(0).max(0.5),
  absorbUpTo: z.number().int().min(0),
  substitutionTimeoutMin: z.number().int().min(1).max(120),
  acceptingOrders: z.boolean(),
  onlinePayments: z.boolean(),
  /** the big message on the landing page: an offer or festival wishes, in both languages */
  announcement: z.object({
    enabled: z.boolean(),
    kind: z.enum(["offer", "festival"]),
    /** festival artwork: the animated Diwali scene, or just the colours (for other festivals) */
    art: z.enum(["diwali", "simple"]).default("diwali"),
    titleEn: z.string().max(80),
    titleMr: z.string().max(80),
    messageEn: z.string().max(240),
    messageMr: z.string().max(240),
    /** optional: the offer or occasion in a few words, shown as a big badge (e.g. "10% off", "दिवाळी") */
    badgeEn: z.string().max(24),
    badgeMr: z.string().max(24),
    /** last day to show it (YYYY-MM-DD, IST); empty means no end date */
    endsOn: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/, "Use a date like 2026-11-12, or leave it empty"),
  }),
});

export type StoreSettings = z.infer<typeof settingsSchema>;

export const DEFAULT_SETTINGS: StoreSettings = {
  name: "Aditya Traders",
  shortName: "Aditya",
  tagline: "Your neighbourhood kirana, now at your door",
  address: "Shop address not set yet",
  phone: "Not set",
  gstin: "",
  gstScheme: "regular",
  stateName: "Maharashtra",
  stateCode: "27",
  opensAt: 8,
  closesAt: 21,
  serviceable: { "411001": 1.5, "411002": 2.5, "411011": 3.5, "411042": 4.5 },
  minOrder: 19900,
  freeDeliveryAt: 49900,
  feeBands: [
    { upToKm: 2, fee: 2000 },
    { upToKm: 4, fee: 3000 },
    { upToKm: 30, fee: 4000 },
  ],
  codLimit: 200000,
  slotCapacity: 6,
  slotCutoffMinutes: 60,
  weightTolerance: 0.1,
  absorbUpTo: 1000,
  substitutionTimeoutMin: 10,
  acceptingOrders: true,
  onlinePayments: false,
  // Diwali 2026 is on 8 November. Festival wishes only: offers are for the owner to set, not to be invented.
  announcement: {
    enabled: true,
    kind: "festival",
    art: "diwali",
    titleEn: "Happy Diwali from Aditya Traders",
    titleMr: "आदित्य ट्रेडर्सकडून दिवाळीच्या हार्दिक शुभेच्छा!",
    messageEn: "Get your faral ingredients, oil, ghee and puja essentials from your neighbourhood store, delivered to your door or ready at the counter.",
    messageMr: "फराळाचं सामान, तेल, तूप आणि पूजेचं साहित्य आता घरबसल्या order करा. घरपोच delivery, किंवा counter वरून pickup.",
    badgeEn: "Diwali",
    badgeMr: "दिवाळी",
    endsOn: "2026-11-12",
  },
};

/** The announcement if it should be showing today (IST), otherwise null. */
export function activeAnnouncement(s: StoreSettings, todayKey: string) {
  const a = s.announcement;
  if (!a.enabled || !(a.titleEn || a.titleMr)) return null;
  if (a.endsOn && todayKey > a.endsOn) return null;
  return a;
}

export function deliveryFee(s: Pick<StoreSettings, "feeBands">, km: number): Paise {
  const bands = [...s.feeBands].sort((a, b) => a.upToKm - b.upToKm);
  return (bands.find((b) => km <= b.upToKm) ?? bands[bands.length - 1]).fee;
}

/** Settings fields that are still placeholders; the console nags until these are filled. */
export function missingSetup(s: StoreSettings): string[] {
  const out: string[] = [];
  if (s.address === DEFAULT_SETTINGS.address) out.push("Store address");
  if (s.phone === DEFAULT_SETTINGS.phone) out.push("Store phone number");
  if (s.gstScheme === "regular" && !s.gstin) out.push("GSTIN");
  return out;
}
