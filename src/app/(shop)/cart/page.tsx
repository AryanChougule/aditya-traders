import type { Metadata } from "next";
import { getCatalog } from "@/server/catalog";
import { CartView } from "./cart-view";

export const metadata: Metadata = { title: "Cart" };

export default async function CartPage() {
  const essentials = (await getCatalog()).filter((p) => p.tags?.includes("essential") && p.available);
  return <CartView essentials={essentials} />;
}
