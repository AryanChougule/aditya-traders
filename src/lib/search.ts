import type { Category, Product } from "./types";

/*
 * Search the way shoppers type: "aata", "dahi", "biscut".
 * Trigram similarity over name, Hindi name, brand, aliases and category — the same idea as Postgres pg_trgm,
 * so moving this into the database later is a like-for-like swap.
 */

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9ऀ-ॿ ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function trigrams(s: string): Set<string> {
  const t = new Set<string>();
  const padded = `  ${s} `;
  for (let i = 0; i < padded.length - 2; i++) t.add(padded.slice(i, i + 3));
  return t;
}

export function similarity(a: string, b: string): number {
  const A = trigrams(a);
  const B = trigrams(b);
  let shared = 0;
  for (const g of A) if (B.has(g)) shared++;
  return shared / (A.size + B.size - shared || 1);
}

/** Ranks `products` against what the shopper typed. Fast enough to run per request for a few thousand items. */
export function search<T extends Product>(query: string, products: T[], categories: Category[], limit = 40): T[] {
  const q = norm(query);
  if (!q) return [];
  const words = q.split(" ");
  const catName = new Map(categories.map((c) => [c.id, c.name]));
  const scored: { p: T; score: number }[] = [];

  for (const p of products) {
    const fields = [p.name, p.nameHi, p.brand ?? "", catName.get(p.categoryId) ?? "", ...p.aliases].map(norm).filter(Boolean);
    let best = 0;
    for (const f of fields) {
      if (f === q) best = Math.max(best, 3);
      else if (f.startsWith(q)) best = Math.max(best, 2.2);
      else if (f.includes(q)) best = Math.max(best, 1.6);
      else {
        // per-word fuzzy match so "toor dal" and "dal toor" both work
        const wordScore =
          words.reduce((acc, w) => {
            const fw = f.split(" ");
            return acc + Math.max(...fw.map((x) => (x.startsWith(w) ? 1 : similarity(w, x))));
          }, 0) / words.length;
        best = Math.max(best, wordScore);
      }
    }
    if (best >= 0.45) scored.push({ p, score: best + (p.tags?.includes("bestseller") ? 0.05 : 0) });
  }

  return scored.sort((a, b) => b.score - a.score).slice(0, limit).map((s) => s.p);
}

export const TRENDING = ["atta", "toor dal", "milk", "onion", "tomato", "tea", "oil", "biscuit"];
