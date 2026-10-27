"use client";

import { useSyncExternalStore } from "react";

/*
 * Shared clock for time-dependent UI (slots, "5 min ago", countdowns).
 * Returns 0 during server render and hydration, so callers can show a placeholder instead of a mismatched time.
 */
let now = 0;
let timer: ReturnType<typeof setInterval> | undefined;
const subs = new Set<() => void>();

function subscribe(cb: () => void) {
  subs.add(cb);
  if (!timer) {
    now = Date.now();
    timer = setInterval(() => {
      now = Date.now();
      subs.forEach((f) => f());
    }, 15_000);
  }
  return () => {
    subs.delete(cb);
    if (!subs.size && timer) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

const getSnapshot = () => (now ||= Date.now());
const getServerSnapshot = () => 0;

export function useNow() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
