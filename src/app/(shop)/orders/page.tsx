import type { Metadata } from "next";
import { Suspense } from "react";
import { T } from "@/components/i18n";
import { PhoneLogin } from "@/components/shop/phone-login";
import { PageSkeleton } from "@/components/ui/skeleton";
import { getCurrentUser } from "@/server/auth";
import { listCustomerOrders } from "@/server/orders";
import { OrdersView } from "./orders-view";

export const metadata: Metadata = { title: "Your orders", robots: { index: false } };

export default function OrdersPage() {
  return (
    <Suspense fallback={<PageSkeleton className="mx-auto max-w-2xl" />}>
      <Orders />
    </Suspense>
  );
}

async function Orders() {
  const user = await getCurrentUser();
  if (!user)
    return (
      <div className="mx-auto grid max-w-md gap-4">
        <h1 className="text-2xl font-semibold">
          <T k="orders.title" />
        </h1>
        <div className="rounded-2xl bg-surface p-5 ring-1 ring-border">
          <p className="mb-4 text-muted">
            <T k="orders.loginPrompt" />
          </p>
          <PhoneLogin />
        </div>
      </div>
    );
  return <OrdersView orders={await listCustomerOrders(user.id)} />;
}
