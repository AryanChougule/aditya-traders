import type { MetadataRoute } from "next";
import { getCatalog, getCategories } from "@/server/catalog";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const [categories, products] = await Promise.all([getCategories(), getCatalog()]);
  return [
    { url: site, changeFrequency: "daily", priority: 1 },
    { url: `${site}/shop`, changeFrequency: "daily", priority: 0.9 },
    { url: `${site}/categories`, changeFrequency: "weekly" },
    ...categories.map((c) => ({ url: `${site}/c/${c.slug}`, changeFrequency: "daily" as const })),
    ...products.map((p) => ({ url: `${site}/p/${p.slug}`, changeFrequency: "weekly" as const })),
    ...["terms", "privacy", "refunds", "shipping"].map((d) => ({ url: `${site}/legal/${d}`, changeFrequency: "yearly" as const })),
  ];
}
