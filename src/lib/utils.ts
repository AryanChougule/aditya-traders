import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Store time zone; all displayed times are IST regardless of the server or phone setting. */
const TZ = "Asia/Kolkata";

export function timeAgo(at: number, now = Date.now()) {
  const m = Math.round((now - at) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return new Date(at).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: TZ });
}

/** Shoppers often type "Near…" or "Opp…" themselves; only add "Near" when they didn't. */
export function landmarkText(l: string) {
  return /^(near|opp|opposite|behind|beside|next to|in front|above|below|corner)\b/i.test(l.trim()) ? l.trim() : `Near ${l.trim()}`;
}

export function clock(at: number) {
  return new Date(at).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: TZ });
}

export function dayLabel(at: number) {
  return new Date(at).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: TZ });
}
