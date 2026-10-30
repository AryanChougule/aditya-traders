import { describe, expect, it } from "vitest";
import { hourLabel, hoursText, missingMarathi, slotText, translate } from "./i18n";
import { activeAnnouncement, DEFAULT_SETTINGS } from "./settings";
import { deliverySlots, isStoreOpen, istInstant, pickupSlots, storeClock } from "./slots";

describe("translations", () => {
  it("has a Marathi line for every English string", () => {
    expect(missingMarathi()).toEqual([]);
  });
  it("fills placeholders and falls back to English", () => {
    expect(translate("en", "common.items", { n: 3 })).toBe("3 items");
    expect(translate("mr", "chrome.saving", { amount: "₹20" })).toBe("₹20 ची बचत");
  });
});

describe("times in Marathi", () => {
  it("names the part of the day instead of am/pm", () => {
    expect(hourLabel("en", 9)).toBe("9 am");
    expect(hourLabel("mr", 9)).toBe("सकाळी 9");
    expect(hourLabel("mr", 13)).toBe("दुपारी 1");
    expect(hourLabel("mr", 21)).toBe("रात्री 9");
  });
  it("words slot windows naturally", () => {
    const slot = (h: number, len = 2) => ({ id: `2026-10-28-${h}`, start: istInstant(2026, 9, 28, h), end: istInstant(2026, 9, 28, h + len) });
    expect(slotText("en", slot(9))).toBe("9 am – 11 am");
    expect(slotText("mr", slot(9))).toBe("सकाळी 9 – 11");
    expect(slotText("mr", slot(11))).toBe("सकाळी 11 – दुपारी 1");
    expect(slotText("mr", { ...slot(17, 1), id: "pickup-2026-10-28-17" })).toBe("संध्याकाळी 5 पर्यंत ready");
  });
});

describe("landing announcement", () => {
  it("shows until its end date, then hides itself", () => {
    expect(activeAnnouncement(DEFAULT_SETTINGS, "2026-11-08")).not.toBeNull();
    expect(activeAnnouncement(DEFAULT_SETTINGS, "2026-11-12")).not.toBeNull();
    expect(activeAnnouncement(DEFAULT_SETTINGS, "2026-11-13")).toBeNull();
  });
  it("hides when switched off or empty", () => {
    expect(activeAnnouncement({ ...DEFAULT_SETTINGS, announcement: { ...DEFAULT_SETTINGS.announcement, enabled: false } }, "2026-11-01")).toBeNull();
    expect(activeAnnouncement({ ...DEFAULT_SETTINGS, announcement: { ...DEFAULT_SETTINGS.announcement, titleEn: "", titleMr: "" } }, "2026-11-01")).toBeNull();
  });
});

describe("hours with an afternoon break", () => {
  // the store's real hours: 8 am – 1 pm, then 4 pm – 10 pm
  const S = { ...DEFAULT_SETTINGS, opensAt: 8, closesAt: 22, breakStart: 13, breakEnd: 16 };
  const at = (h: number, min = 0) => istInstant(2026, 9, 28, h) + min * 60_000;

  it("offers no delivery or pickup slots during the break", () => {
    const today = deliverySlots(S, {}, at(6))[0].slots.map((x) => x.id.split("-").pop());
    expect(today).toEqual(["9", "11", "17", "19"]);
    const pickup = pickupSlots(S, at(6))[0].slots.map((x) => Number(x.id.split("-").pop()));
    expect(pickup.some((h) => h >= 13 && h < 17)).toBe(false);
  });
  it("is closed during the break and says when it reopens", () => {
    expect(isStoreOpen(S, at(14))).toBe(false);
    expect(storeClock(S, at(14))).toEqual({ open: false, opensAt: 16, tomorrow: false });
    expect(storeClock(S, at(10))).toEqual({ open: true, until: 13 });
    expect(storeClock(S, at(23))).toEqual({ open: false, opensAt: 8, tomorrow: true });
  });
  it("words both sessions", () => {
    expect(hoursText("en", S)).toBe("8 am – 1 pm, 4 pm – 10 pm");
    expect(hoursText("mr", S)).toBe("सकाळी 8 – दुपारी 1, संध्याकाळी 4 – रात्री 10");
    expect(hoursText("en", DEFAULT_SETTINGS)).toBe("8 am – 9 pm");
  });
});
