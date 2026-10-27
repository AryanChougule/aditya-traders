import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/server/auth";
import { getSettings } from "@/server/catalog";
import { getOrderFor } from "@/server/orders";
import { InvoiceView } from "./invoice-view";

export const metadata: Metadata = { title: "Invoice", robots: { index: false } };

export default function InvoicePage(props: PageProps<"/orders/[id]/invoice">) {
  return (
    <Suspense fallback={<PageSkeleton className="mx-auto max-w-3xl" />}>
      <Invoice {...props} />
    </Suspense>
  );
}

async function Invoice(props: PageProps<"/orders/[id]/invoice">) {
  const { id } = await props.params;
  const user = await requireUser(`/orders/${id}/invoice`);
  const [order, settings] = await Promise.all([getOrderFor(user, id), getSettings()]);
  return <InvoiceView order={order} settings={settings} />;
}
