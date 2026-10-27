import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/skeleton";
import { getCategories } from "@/server/catalog";
import { SearchView } from "./search-view";

export const metadata: Metadata = { title: "Search" };

export default function SearchPage(props: PageProps<"/search">) {
  return (
    <Suspense fallback={<PageSkeleton variant="grid" />}>
      <Search {...props} />
    </Suspense>
  );
}

async function Search(props: PageProps<"/search">) {
  const [{ q }, categories] = await Promise.all([props.searchParams, getCategories()]);
  return <SearchView initialQuery={typeof q === "string" ? q : ""} categories={categories} />;
}
