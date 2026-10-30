import { openRanges, type StoreSettings } from "./settings";
import type { Slot } from "./types";

/*
 * All store time is India Standard Time (UTC+5:30, no daylight saving). Servers run in UTC and
 * shoppers' phones may not, so every calculation goes through these helpers instead of local Date methods.
 */
const IST_OFFSET = 330 * 60_000;
const DAY = 86_400_000;
const HOUR = 3_600_000;

/** Wall-clock parts in IST for an instant. */
export function ist(ms: number) {
  const d = new Date(ms + IST_OFFSET);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate(), h: d.getUTCHours(), min: d.getUTCMinutes() };
}

/** The instant of an IST wall-clock time. */
export function istInstant(y: number, m: number, d: number, h = 0, min = 0) {
  return Date.UTC(y, m, d, h, min) - IST_OFFSET;
}

export function istDateKey(ms: number) {
  const p = ist(ms);
  return `${p.y}-${String(p.m + 1).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
}

export function istStartOfDay(ms: number) {
  const p = ist(ms);
  return istInstant(p.y, p.m, p.d);
}

const hourLabel = (h: number) => `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? "am" : "pm"}`;

export type SlotOption = Slot & { booked: number; capacity: number; closed: boolean; reason?: string };
export type SlotDay = { day: string; dateKey: string; slots: SlotOption[] };

type Hours = Pick<StoreSettings, "opensAt" | "closesAt" | "breakStart" | "breakEnd" | "slotCapacity" | "slotCutoffMinutes">;

/** Two-hour delivery windows for today and tomorrow. `booked` maps slot id → orders already in it. */
export function deliverySlots(s: Hours, booked: Record<string, number>, now = Date.now()): SlotDay[] {
  const out: SlotDay[] = [];
  for (let d = 0; d < 2; d++) {
    const base = ist(istStartOfDay(now) + d * DAY);
    const key = istDateKey(istStartOfDay(now) + d * DAY);
    const slots: SlotOption[] = [];
    // the first hour of each session is for packing, so delivery windows start an hour after opening
    for (const [from, to] of openRanges(s))
      for (let h = from + 1; h + 2 <= to; h += 2) {
        const start = istInstant(base.y, base.m, base.d, h);
        const id = `${key}-${h}`;
        const n = booked[id] ?? 0;
        const past = now > start - s.slotCutoffMinutes * 60_000;
        const full = n >= s.slotCapacity;
        slots.push({
          id,
          date: key,
          label: `${hourLabel(h)} – ${hourLabel(h + 2)}`,
          start,
          end: start + 2 * HOUR,
          booked: n,
          capacity: s.slotCapacity,
          closed: past || full,
          reason: past ? "Closed" : full ? "Full" : undefined,
        });
      }
    out.push({ day: d === 0 ? "Today" : "Tomorrow", dateKey: key, slots });
  }
  return out;
}

/** Pickup "ready by" times: hourly, at least an hour from now, until an hour before closing. */
export function pickupSlots(s: Pick<StoreSettings, "opensAt" | "closesAt" | "breakStart" | "breakEnd">, now = Date.now()): SlotDay[] {
  const out: SlotDay[] = [];
  for (let d = 0; d < 2; d++) {
    const base = ist(istStartOfDay(now) + d * DAY);
    const key = istDateKey(istStartOfDay(now) + d * DAY);
    const slots: SlotOption[] = [];
    for (const [from, to] of openRanges(s))
      for (let h = from + 1; h <= to - 1; h++) {
        const start = istInstant(base.y, base.m, base.d, h);
        const closed = start - HOUR < now;
        slots.push({
          id: `pickup-${key}-${h}`,
          date: key,
          label: `Ready by ${hourLabel(h)}`,
          start,
          end: start + HOUR,
          booked: 0,
          capacity: 999,
          closed,
          reason: closed ? "Closed" : undefined,
        });
      }
    out.push({ day: d === 0 ? "Today" : "Tomorrow", dateKey: key, slots });
  }
  return out;
}

/** Re-derives a slot from its id on the server, so a shopper can't send a made-up time. */
export function slotFromId(s: Hours, id: string, booked: Record<string, number>, now = Date.now()): SlotOption | undefined {
  const all = id.startsWith("pickup-") ? pickupSlots(s, now) : deliverySlots(s, booked, now);
  return all.flatMap((d) => d.slots).find((x) => x.id === id);
}

export function isStoreOpen(s: Pick<StoreSettings, "opensAt" | "closesAt" | "breakStart" | "breakEnd">, now = Date.now()) {
  const h = ist(now).h;
  return openRanges(s).some(([from, to]) => h >= from && h < to);
}

/** For the open/closed badge: when the current session ends, or when the store next opens (later today, or tomorrow). */
export function storeClock(s: Pick<StoreSettings, "opensAt" | "closesAt" | "breakStart" | "breakEnd">, now = Date.now()) {
  const h = ist(now).h;
  const ranges = openRanges(s);
  const current = ranges.find(([from, to]) => h >= from && h < to);
  if (current) return { open: true as const, until: current[1] };
  const later = ranges.find(([from]) => from > h);
  return later ? { open: false as const, opensAt: later[0], tomorrow: false } : { open: false as const, opensAt: ranges[0][0], tomorrow: true };
}

export function slotDayLabel(slot: Slot, now = Date.now()) {
  if (slot.date === istDateKey(now)) return "Today";
  if (slot.date === istDateKey(now + DAY)) return "Tomorrow";
  return new Date(slot.start).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
}

/** Indian financial year label for invoices, e.g. "26-27" for Apr 2026 – Mar 2027. */
export function fyLabel(ms: number) {
  const p = ist(ms);
  const y = p.m >= 3 ? p.y : p.y - 1;
  return `${String(y).slice(2)}-${String(y + 1).slice(2)}`;
}
