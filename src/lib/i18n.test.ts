import { describe, expect, it } from "vitest";
import { hourLabel, missingMarathi, slotText, translate } from "./i18n";
import { activeAnnouncement, DEFAULT_SETTINGS } from "./settings";
import { istInstant } from "./slots";

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
