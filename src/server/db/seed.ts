import { sql } from "drizzle-orm";
import { CATEGORIES, PRODUCTS } from "@/lib/catalog";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import type { DB } from "./index";
import * as schema from "./schema";

/**
 * Idempotent: fills an empty database with the starter catalog, default settings and counters.
 * Never overwrites data the owner has entered.
 */
export async function seed(db: DB) {
  await db.insert(schema.settings).values({ id: 1, data: DEFAULT_SETTINGS }).onConflictDoNothing();
  await db.insert(schema.counters).values({ key: "order", value: 1000 }).onConflictDoNothing();

  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(schema.categories);
  if (count > 0) return;

  await db.insert(schema.categories).values(CATEGORIES.map((c, i) => ({ ...c, sort: i })));
  await db.insert(schema.products).values(
    PRODUCTS.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      nameHi: p.nameHi,
      brand: p.brand ?? null,
      categoryId: p.categoryId,
      unitType: p.unitType,
      unitLabel: p.unitLabel,
      price: p.price,
      mrp: p.mrp,
      hsn: p.hsn,
      gstRate: p.gstRate,
      aisle: p.aisle,
      aliases: p.aliases,
      tags: p.tags ?? [],
      icon: p.icon,
      tint: p.tint,
      group: p.group ?? null,
      netGrams: p.netGrams ?? null,
      description: p.description,
      stock: p.stock,
      available: true,
    })),
  );
}
