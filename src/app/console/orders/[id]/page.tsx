import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { listRiders } from "@/app/actions";
import { AutoRefresh } from "@/components/auto-refresh";
import { PageSkeleton } from "@/components/ui/skeleton";
import { displayPhone, requireStaff } from "@/server/auth";
import { getCatalog } from "@/server/catalog";
import { getOrderFor, listConsoleOrders } from "@/server/orders";
import { PackOrder } from "./pack-order";

export const metadata: Metadata = { title: "Pack order" };

export default function ConsoleOrderPage(props: PageProps<"/console/orders/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Pack {...props} />
    </Suspense>
  );
}

async function Pack(props: PageProps<"/console/orders/[id]">) {
  const { id } = await props.params;
  const user = await requireStaff(`/console/orders/${id}`, ["owner", "packer"]);
  const order = await getOrderFor(user, id);
  if (!order)
    return (
      <p className="rounded-2xl bg-surface p-6 text-muted ring-1 ring-border">
        Order not found. <Link href="/console" className="font-bold text-primary">Back to all orders</Link>
      </p>
    );
  const [catalog, riders, open] = await Promise.all([getCatalog(), listRiders(), listConsoleOrders()]);
  const busy = (rid: string) => open.filter((o) => o.status === "out_for_delivery" && o.fulfilment.riderId === rid).length;
  return (
    <>
      {/* the shopper may answer a substitution from their phone while this page is open */}
      {order.status === "needs_approval" ? <AutoRefresh every={8_000} /> : null}
      <PackOrder order={order} catalog={catalog} riders={riders.map((r) => ({ id: r.id, name: r.name, phone: displayPhone(r.phone), busy: busy(r.id) }))} />
    </>
  );
}
