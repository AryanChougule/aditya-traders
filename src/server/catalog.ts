import "server-only";
import { asc, eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { DEFAULT_SETTINGS, settingsSchema, type StoreSettings } from "@/lib/settings";
import type { Category, LiveProduct, Tint } from "@/lib/types";
import { getDb, schema } from "./db";

export const TAGS = { catalog: "catalog", settings: "settings" } as const;

type ProductRow = typeof schema.products.$inferSelect;

export function toLiveProduct(r: ProductRow): LiveProduct {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    nameHi: r.nameHi,
    nameMr: r.nameMr,
    brand: r.brand ?? undefined,
    categoryId: r.categoryId,
    unitType: r.unitType,
    unitLabel: r.unitLabel,
    price: r.price,
    mrp: Math.max(r.mrp, r.price),
    hsn: r.hsn,
    gstRate: r.gstRate as LiveProduct["gstRate"],
    aisle: r.aisle,
    aliases: r.aliases,
    icon: r.icon,
    tint: r.tint as Tint,
    tags: r.tags as LiveProduct["tags"],
    group: r.group ?? undefined,
    netGrams: r.netGrams ?? undefined,
    description: r.description,
    stock: r.stock,
    available: r.active && r.available && r.stock > 0,
    stockLeft: r.stock,
  };
}

/** Store settings, merged over defaults so a newly added field never breaks an older saved row. */
export async function getSettings(): Promise<StoreSettings> {
  "use cache";
  cacheTag(TAGS.settings);
  cacheLife("hours");
  return readSettings();
}

/**
 * The saved settings straight from the database, for the form that edits them. A cached copy there can be hours
 * old, and saving it would quietly write the old values back over newer ones.
 */
export async function readSettings(): Promise<StoreSettings> {
  const db = await getDb();
  const [row] = await db.select().from(schema.settings).where(eq(schema.settings.id, 1));
  const parsed = settingsSchema.safeParse({ ...DEFAULT_SETTINGS, ...(row?.data as object) });
  return parsed.success ? parsed.data : DEFAULT_SETTINGS;
}

export async function getCategories(): Promise<Category[]> {
  "use cache";
  cacheTag(TAGS.catalog);
  cacheLife("hours");
  const db = await getDb();
  const rows = await db.select().from(schema.categories).orderBy(asc(schema.categories.sort));
  return rows.map((c) => ({ id: c.id, slug: c.slug, name: c.name, nameHi: c.nameHi, nameMr: c.nameMr, icon: c.icon, tint: c.tint as Tint }));
}

/** Every product on sale or temporarily out (inactive ones are hidden). Busted on any stock or price change. */
export async function getCatalog(): Promise<LiveProduct[]> {
  "use cache";
  cacheTag(TAGS.catalog);
  cacheLife("minutes");
  const db = await getDb();
  const rows = await db.select().from(schema.products).where(eq(schema.products.active, true)).orderBy(asc(schema.products.name));
  return rows.map(toLiveProduct);
}

/** Includes inactive products, for the console. */
export async function getAllProductsForConsole(): Promise<(LiveProduct & { active: boolean; enabled: boolean })[]> {
  const db = await getDb();
  const rows = await db.select().from(schema.products).orderBy(asc(schema.products.name));
  return rows.map((r) => ({ ...toLiveProduct(r), active: r.active, enabled: r.available }));
}

export async function getProductBySlug(slug: string) {
  return (await getCatalog()).find((p) => p.slug === slug);
}

export async function getCategory(slug: string) {
  return (await getCategories()).find((c) => c.slug === slug || c.id === slug);
}
