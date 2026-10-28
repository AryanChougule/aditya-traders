"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { LANGS, translate, type Key, type Lang, type Vars } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/*
 * The shopper's language lives in this browser (localStorage, mirrored to a cookie for later server use).
 * Pages render in English on the server so they stay static and fast; Marathi swaps in on the phone.
 */

const STORAGE_KEY = "at-lang";
const listeners = new Set<() => void>();

function read(): Lang {
  try {
    return localStorage.getItem(STORAGE_KEY) === "mr" ? "mr" : "en";
  } catch {
    return "en";
  }
}

export function setLang(lang: Lang) {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* private mode: the choice lasts for this page only */
  }
  document.cookie = `lang=${lang}; path=/; max-age=31536000; samesite=lax`;
  listeners.forEach((f) => f());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => e.key === STORAGE_KEY && cb();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function useLang(): Lang {
  return useSyncExternalStore(subscribe, read, () => "en");
}

export function useT() {
  const lang = useLang();
  return useCallback((k: Key, v?: Vars, force?: Lang) => translate(force ?? lang, k, v), [lang]);
}

/** A translated string, usable from server components too. */
export function T({ k, v }: { k: Key; v?: Vars }) {
  return <>{useT()(k, v)}</>;
}

/** Store data that has both an English and a Marathi version (product names, the announcement). */
export function Pick({ en, mr }: { en: string; mr?: string | null }) {
  return <>{useLang() === "mr" && mr ? mr : en}</>;
}

export function pick(lang: Lang, en: string, mr?: string | null) {
  return lang === "mr" && mr ? mr : en;
}

/** Keeps <html lang> right for screen readers and Devanagari font fallback. */
export function LangEffect() {
  const lang = useLang();
  useEffect(() => {
    document.documentElement.lang = lang === "mr" ? "mr-IN" : "en-IN";
  }, [lang]);
  return null;
}

/** English first, then मराठी. */
export function LangSwitch({ className }: { className?: string }) {
  const lang = useLang();
  return (
    <div role="radiogroup" aria-label="Language / भाषा" className={cn("inline-flex shrink-0 rounded-xl bg-surface-2 p-1 ring-1 ring-border", className)}>
      {LANGS.map((l) => (
        <button
          key={l.code}
          type="button"
          role="radio"
          aria-checked={lang === l.code}
          lang={l.code === "mr" ? "mr" : "en"}
          onClick={() => setLang(l.code)}
          className={cn(
            "h-9 min-w-11 cursor-pointer rounded-lg px-2.5 text-sm font-bold transition-colors",
            lang === l.code ? "bg-surface text-primary shadow-sm" : "text-muted hover:text-fg",
          )}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
