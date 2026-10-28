"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { History, MessageSquareText, Search, TrendingUp, X } from "lucide-react";
import { CategoryTile } from "@/components/shop/category-tile";
import { ProductGrid } from "@/components/shop/product-card";
import { searchAction } from "@/app/actions";
import { useT } from "@/components/i18n";
import { useSettings } from "@/components/providers";
import { useCart, useHydrated } from "@/lib/cart-store";
import { TRENDING } from "@/lib/search";
import type { Category, LiveProduct } from "@/lib/types";

export function SearchView({ initialQuery, categories }: { initialQuery: string; categories: Category[] }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const [q, setQ] = useState(initialQuery);
  const [debounced, setDebounced] = useState(initialQuery);
  const inputRef = useRef<HTMLInputElement>(null);
  const settings = useSettings();
  const t = useT();
  const recent = useCart((s) => s.recentSearches);
  const remember = useCart((s) => s.rememberSearch);
  const clearRecent = useCart((s) => s.clearRecentSearches);
  const [results, setResults] = useState<LiveProduct[]>([]);
  const [searched, setSearched] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 150);
    return () => clearTimeout(t);
  }, [q]);

  // keep the URL shareable without stacking history entries per keystroke
  useEffect(() => {
    const url = debounced.trim() ? `/search?q=${encodeURIComponent(debounced.trim())}` : "/search";
    router.replace(url, { scroll: false });
  }, [debounced, router]);

  // the server ranks the live catalog and logs searches that found nothing, so the owner knows what to stock
  useEffect(() => {
    const term = debounced.trim();
    if (!term) return;
    let stale = false;
    searchAction(term).then((r) => {
      if (stale) return;
      setResults(r);
      setSearched(term);
      if (term.length >= 3) remember(term);
    });
    return () => {
      stale = true;
    };
  }, [debounced, remember]);

  const run = (term: string) => {
    setQ(term);
    setDebounced(term);
    inputRef.current?.focus();
  };

  return (
    <div className="grid grid-cols-1 gap-5">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          remember(q);
          inputRef.current?.blur();
        }}
        className="w-full"
      >
        <label htmlFor="search-input" className="sr-only">
          {t("search.label")}
        </label>
        <div className="flex h-13 items-center gap-2 rounded-2xl bg-surface px-4 ring-2 ring-primary/70 focus-within:ring-primary">
          <Search className="size-5 shrink-0 text-muted" aria-hidden />
          <input
            ref={inputRef}
            id="search-input"
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("search.tryPlaceholder")}
            className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted/70 [&::-webkit-search-cancel-button]:hidden"
          />
          {q ? (
            <button type="button" onClick={() => run("")} aria-label={t("search.clear")} className="-mr-2 grid size-11 cursor-pointer place-items-center rounded-full text-muted hover:bg-surface-2">
              <X className="size-5" />
            </button>
          ) : null}
        </div>
      </form>

      {!debounced.trim() ? (
        <>
          {hydrated && recent.length ? (
            <section aria-label="Recent searches">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-base font-semibold">
                  <History className="size-4 text-muted" aria-hidden /> {t("search.recent")}
                </h2>
                <button onClick={clearRecent} className="h-11 cursor-pointer rounded-lg px-2 text-sm font-semibold text-muted hover:text-fg">
                  {t("search.clearRecent")}
                </button>
              </div>
              <Chips items={recent} onPick={run} />
            </section>
          ) : null}
          <section aria-label="Popular searches">
            <h2 className="mb-2 flex items-center gap-2 text-base font-semibold">
              <TrendingUp className="size-4 text-muted" aria-hidden /> {t("search.popular")}
            </h2>
            <Chips items={TRENDING} onPick={run} />
          </section>
          <section aria-label="Categories">
            <h2 className="mb-2 text-base font-semibold">{t("search.browse")}</h2>
            <div className="grid grid-cols-4 gap-x-1.5 gap-y-3 sm:grid-cols-5 lg:grid-cols-10">
              {categories.map((c) => (
                <CategoryTile key={c.id} c={c} />
              ))}
            </div>
          </section>
        </>
      ) : searched !== debounced.trim() ? (
        <p className="text-sm text-muted" aria-live="polite">
          {t("search.searching")}
        </p>
      ) : results.length ? (
        <section aria-label="Results" className="grid gap-3">
          <p className="text-sm text-muted" aria-live="polite">
            {t(results.length > 1 ? "search.resultsMany" : "search.resultsOne", { n: results.length })} <b className="text-fg">“{debounced.trim()}”</b>
          </p>
          <ProductGrid products={results} />
        </section>
      ) : (
        <section className="grid justify-items-center gap-3 rounded-2xl bg-surface px-6 py-10 text-center ring-1 ring-border" aria-live="polite">
          <span className="grid size-14 place-items-center rounded-2xl bg-surface-2 text-muted">
            <MessageSquareText className="size-7" aria-hidden />
          </span>
          <h2 className="text-lg font-semibold">{t("search.noneTitle", { q: debounced.trim() })}</h2>
          <p className="max-w-sm text-sm text-muted">
            {t("search.noneBody")} <span className="select-all font-semibold text-fg">{settings.phone}</span>
          </p>
          <div className="mt-1">
            <p className="mb-2 text-sm font-semibold">{t("search.tryInstead")}</p>
            <Chips items={TRENDING.slice(0, 5)} onPick={run} />
          </div>
          <Link href="/categories" className="mt-1 inline-flex h-11 items-center rounded-xl px-4 font-bold text-primary hover:bg-primary-soft">
            {t("search.browseAll")}
          </Link>
        </section>
      )}
    </div>
  );
}

function Chips({ items, onPick }: { items: string[]; onPick: (s: string) => void }) {
  return (
    <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
      {items.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onPick(t)}
          className="inline-flex h-10 cursor-pointer items-center rounded-full bg-surface px-4 text-sm font-semibold ring-1 ring-border transition-colors hover:bg-surface-2 active:scale-[0.97]"
        >
          {t}
        </button>
      ))}
    </div>
  );
}
