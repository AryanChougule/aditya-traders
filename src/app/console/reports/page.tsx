import type { Metadata } from "next";
import { Suspense } from "react";
import { listRiders } from "@/app/actions";
import { PageSkeleton } from "@/components/ui/skeleton";
import { requireStaff } from "@/server/auth";
import { listOrdersSince, listZeroSearches } from "@/server/orders";
import { Reports } from "./reports";

export const metadata: Metadata = { title: "Reports" };

export default function ReportsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ReportsData />
    </Suspense>
  );
}

async function ReportsData() {
  await requireStaff("/console/reports", ["owner"]);
  const [orders, zero, riders] = await Promise.all([listOrdersSince(30), listZeroSearches(30), listRiders()]);
  return <Reports orders={orders} zero={zero} riders={riders} />;
}
