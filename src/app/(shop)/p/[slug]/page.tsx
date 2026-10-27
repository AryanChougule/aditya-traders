import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ChevronRight } from "lucide-react";
import { ProductRail } from "@/components/shop/product-rail";
import { PageSkeleton } from "@/components/ui/skeleton";
import { similarTo } from "@/lib/catalog";
import { getCatalog, getCategory, getProductBySlug } from "@/server/catalog";
import { ProductDetail } from "./product-detail";

export async function generateStaticParams() {
  return (await getCatalog()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata(props: PageProps<"/p/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const p = await getProductBySlug(slug);
  return p ? { title: `${p.brand ? p.brand + " " : ""}${p.name}`, description: p.description } : { title: "Product" };
}

export default function ProductPage(props: PageProps<"/p/[slug]">) {
  return (
    <Suspense fallback={<PageSkeleton variant="detail" />}>
      <Product {...props} />
    </Suspense>
  );
}

async function Product(props: PageProps<"/p/[slug]">) {
  const { slug } = await props.params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();
  const [cat, catalog] = await Promise.all([getCategory(product.categoryId), getCatalog()]);

  return (
    <div className="grid grid-cols-1 gap-8">
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 text-sm text-muted">
        <Link href="/" className="hover:text-fg">Home</Link>
        <ChevronRight className="size-4 shrink-0" aria-hidden />
        {cat ? <Link href={`/c/${cat.slug}`} className="truncate hover:text-fg">{cat.name}</Link> : null}
      </nav>
      <ProductDetail product={product} categoryName={cat?.name ?? ""} />
      <ProductRail title="Similar items" href={cat ? `/c/${cat.slug}` : undefined} products={similarTo(product, catalog, 10)} />
    </div>
  );
}
