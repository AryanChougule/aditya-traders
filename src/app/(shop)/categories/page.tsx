import type { Metadata } from "next";
import { CategoryTile } from "@/components/shop/category-tile";
import { getCatalog, getCategories } from "@/server/catalog";

export const metadata: Metadata = { title: "Categories" };

export default async function CategoriesPage() {
  const [categories, catalog] = await Promise.all([getCategories(), getCatalog()]);
  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold">All categories</h1>
      <div className="grid grid-cols-3 gap-x-2 gap-y-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
        {categories.map((c) => (
          <CategoryTile key={c.id} c={c} count={catalog.filter((p) => p.categoryId === c.id).length} />
        ))}
      </div>
    </div>
  );
}
