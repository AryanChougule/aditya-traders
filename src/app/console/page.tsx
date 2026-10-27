import type { Metadata } from "next";
import { Suspense } from "react";
import { AutoRefresh } from "@/components/auto-refresh";
import { PageSkeleton } from "@/components/ui/skeleton";
import { requireStaff } from "@/server/auth";
import { listConsoleOrders } from "@/server/orders";
import { OrdersBoard } from "./orders-board";

export const metadata: Metadata = { title: "Orders" };

export default function ConsoleHome() {
  return (
    <Suspense fallback={<PageSkeleton variant="grid" />}>
      <Board />
    </Suspense>
  );
}

async function Board() {
  await requireStaff("/console", ["owner", "packer"]);
  return (
    <>
      <AutoRefresh every={10_000} />
      <OrdersBoard orders={await listConsoleOrders()} />
    </>
  );
}
