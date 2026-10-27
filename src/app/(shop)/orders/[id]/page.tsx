import type { Metadata } from "next";
import { Suspense } from "react";
import { AutoRefresh } from "@/components/auto-refresh";
import { ButtonLink } from "@/components/ui/button";
import { PageSkeleton } from "@/components/ui/skeleton";
import { isTerminal } from "@/lib/order-flow";
import { requireUser } from "@/server/auth";
import { getOrderFor } from "@/server/orders";
import { gatewayEnabled } from "@/server/razorpay";
import { OrderView } from "./order-view";

export const metadata: Metadata = { title: "Order", robots: { index: false } };

export default function OrderPage(props: PageProps<"/orders/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton className="mx-auto max-w-3xl" />}>
      <Order {...props} />
    </Suspense>
  );
}

async function Order(props: PageProps<"/orders/[id]">) {
  const { id } = await props.params;
  const { placed } = await props.searchParams;
  const user = await requireUser(`/orders/${id}`);
  const order = await getOrderFor(user, id);
  if (!order)
    return (
      <div className="grid justify-items-center gap-3 rounded-3xl bg-surface px-6 py-12 text-center ring-1 ring-border">
        <h1 className="text-xl font-semibold">We couldn't find that order</h1>
        <p className="text-muted">It may belong to a different phone number.</p>
        <ButtonLink href="/orders">See your orders</ButtonLink>
      </div>
    );
  return (
    <>
      {!isTerminal(order.status) ? <AutoRefresh every={20_000} /> : null}
      <OrderView order={order} justPlaced={placed === "1"} canPay={await gatewayEnabled()} customer={{ name: user.name, phone: user.phone }} />
    </>
  );
}
