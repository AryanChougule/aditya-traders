import type { Metadata } from "next";
import { Suspense } from "react";
import { AutoRefresh } from "@/components/auto-refresh";
import { PageSkeleton } from "@/components/ui/skeleton";
import { requireStaff } from "@/server/auth";
import { listRiderOrders } from "@/server/orders";
import { RiderView } from "./rider-view";

export const metadata: Metadata = { title: "Rider", robots: { index: false } };

export default function RiderPage() {
  return (
    <Suspense fallback={<PageSkeleton className="mx-auto max-w-lg p-4" />}>
      <Rider />
    </Suspense>
  );
}

async function Rider() {
  const user = await requireStaff("/rider", ["rider", "owner"]);
  return (
    <>
      <AutoRefresh every={20_000} />
      <RiderView rider={{ id: user.id, name: user.name || "Rider" }} orders={await listRiderOrders(user.id)} />
    </>
  );
}
