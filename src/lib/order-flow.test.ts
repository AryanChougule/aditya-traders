import { describe, expect, it } from "vitest";
import { canTransition, isCancellable, isTerminal, TRANSITIONS } from "./order-flow";
import { CATEGORIES, PRODUCTS } from "./catalog";
import { search as rank } from "./search";

const search = (q: string) => rank(q, PRODUCTS, CATEGORIES);

describe("order state machine", () => {
  it("follows the happy path for delivery and pickup", () => {
    expect(canTransition("placed", "confirmed")).toBe(true);
    expect(canTransition("confirmed", "packing")).toBe(true);
    expect(canTransition("packing", "packed")).toBe(true);
    expect(canTransition("packed", "out_for_delivery")).toBe(true);
    expect(canTransition("out_for_delivery", "delivered")).toBe(true);
    expect(canTransition("packed", "ready_for_pickup")).toBe(true);
    expect(canTransition("ready_for_pickup", "picked_up")).toBe(true);
  });
  it("never moves backwards or skips packing", () => {
    expect(canTransition("delivered", "placed")).toBe(false);
    expect(canTransition("confirmed", "out_for_delivery")).toBe(false);
    expect(canTransition("packed", "packing")).toBe(false);
  });
  it("only allows cancelling before packing", () => {
    expect(isCancellable("confirmed")).toBe(true);
    expect(isCancellable("packing")).toBe(false);
  });
  it("has terminal states with no exits", () => {
    for (const s of ["delivered", "picked_up", "returned", "cancelled"] as const) expect(isTerminal(s)).toBe(true);
    expect(Object.values(TRANSITIONS).flat().every((s) => s in TRANSITIONS)).toBe(true);
  });
});

describe("search", () => {
  const top = (q: string) => search(q)[0]?.slug ?? "";
  it("matches transliterations and aliases", () => {
    expect(top("aata")).toMatch(/atta/);
    expect(top("dahi")).toMatch(/dahi/);
    expect(top("pyaz")).toBe("onion");
  });
  it("tolerates typos", () => {
    expect(search("biscut").length).toBeGreaterThan(0);
    expect(top("tomatto")).toBe("tomato");
  });
  it("matches Hindi names", () => {
    expect(top("चीनी")).toMatch(/sugar/);
  });
  it("returns nothing for unrelated words", () => {
    expect(search("laptop")).toEqual([]);
  });
});
