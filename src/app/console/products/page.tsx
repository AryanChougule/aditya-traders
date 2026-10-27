import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/skeleton";
import { requireStaff } from "@/server/auth";
import { getAllProductsForConsole, getCategories } from "@/server/catalog";
import { ProductsManager } from "./products-manager";

export const metadata: Metadata = { title: "Products & stock" };

export default function ProductsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Products />
    </Suspense>
  );
}

async function Products() {
  const user = await requireStaff("/console/products", ["owner", "packer"]);
  const [products, categories] = await Promise.all([getAllProductsForConsole(), getCategories()]);
  return <ProductsManager products={products} categories={categories} isOwner={user.role === "owner"} />;
}
