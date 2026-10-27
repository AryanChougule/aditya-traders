import { describe, expect, it } from "vitest";
import { PRODUCTS, comparablePrice, convertQty, substitutesFor } from "./catalog";
import { deliverySlots, fyLabel, ist, isStoreOpen, istInstant, slotFromId } from "./slots";
import { DEFAULT_SETTINGS as S } from "./settings";

const bySlug = (s: string) => PRODUCTS.find((p) => p.slug.startsWith(s))!;
const subs = (s: string) => substitutesFor(bySlug(s), PRODUCTS).map((p) => p.slug);

describe("substitutions", () => {
  it("replaces packed atta with atta, never with rice or dal", () => {
    expect(subs("aashirvaad-shudh")).toEqual(["chakki-atta-loose"]);
  });
  it("keeps different dals apart", () => {
    expect(subs("toor-dal")).toEqual([]);
  });
  it("offers nothing automatic for fresh produce", () => {
    expect(subs("tomato")).toEqual([]);
  });
  it("groups the two teas and the biscuits", () => {
    expect(subs("tata-tea-premium")).toContain("brooke-bond-red-label-tea-500-g");
    expect(subs("parle-parle-g").length).toBe(2);
  });
});

describe("per-kg comparison and quantity conversion", () => {
  const pack = bySlug("aashirvaad-shudh"); // ₹285 for 5 kg
  const loose = bySlug("chakki-atta-loose"); // ₹42/kg
  it("compares a pack and a loose item per kg", () => {
    expect(comparablePrice(pack)).toBe(5700);
    expect(comparablePrice(loose)).toBe(4200);
  });
  it("converts a 5 kg pack into 5000 g loose, and back", () => {
    expect(convertQty(pack, 1, loose)).toBe(5000);
    expect(convertQty(loose, 5000, pack)).toBe(1);
  });
});

describe("IST time handling (servers run in UTC)", () => {
  // 27 Oct 2026, 10:30 IST = 05:00 UTC
  const morning = Date.UTC(2026, 9, 27, 5, 0);
  it("reads wall-clock time in IST", () => {
    expect(ist(morning)).toMatchObject({ y: 2026, m: 9, d: 27, h: 10, min: 30 });
    expect(istInstant(2026, 9, 27, 10, 30)).toBe(morning);
  });
  it("knows when the store is open", () => {
    expect(isStoreOpen(S, morning)).toBe(true);
    expect(isStoreOpen(S, Date.UTC(2026, 9, 27, 17, 0))).toBe(false); // 22:30 IST
  });
  it("closes slots at the cut-off and when full", () => {
    const [today] = deliverySlots(S, { "2026-10-27-13": S.slotCapacity }, morning);
    const byId = Object.fromEntries(today.slots.map((s) => [s.id, s]));
    expect(byId["2026-10-27-9"].reason).toBe("Closed"); // 9 am already started
    expect(byId["2026-10-27-11"].reason).toBe("Closed"); // inside the 60-minute cut-off
    expect(byId["2026-10-27-13"].reason).toBe("Full");
    expect(byId["2026-10-27-15"].closed).toBe(false);
  });
  it("re-derives a slot from its id on the server and rejects made-up ones", () => {
    expect(slotFromId(S, "2026-10-27-15", {}, morning)?.closed).toBe(false);
    expect(slotFromId(S, "2026-10-27-14", {}, morning)).toBeUndefined();
  });
  it("labels the Indian financial year", () => {
    expect(fyLabel(Date.UTC(2026, 9, 27))).toBe("26-27");
    expect(fyLabel(Date.UTC(2027, 2, 31, 12))).toBe("26-27");
    expect(fyLabel(Date.UTC(2027, 3, 1, 12))).toBe("27-28");
  });
});
