import type { Metadata } from "next";
import { and, eq, isNull } from "drizzle-orm";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/skeleton";
import { deliverySlots } from "@/lib/slots";
import { getCurrentUser } from "@/server/auth";
import { getSettings } from "@/server/catalog";
import { getDb, schema } from "@/server/db";
import { slotBookings, walletBalance } from "@/server/orders";
import { gatewayEnabled } from "@/server/razorpay";
import { CheckoutView, type CheckoutData } from "./checkout-view";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default function CheckoutPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Checkout />
    </Suspense>
  );
}

async function Checkout() {
  const [user, settings] = await Promise.all([getCurrentUser(), getSettings()]);
  const slotIds = deliverySlots(settings, {}).flatMap((d) => d.slots.map((s) => s.id));
  const [bookings, onlinePayments] = await Promise.all([slotBookings(slotIds), gatewayEnabled()]);

  let data: CheckoutData = { customer: null, addresses: [], wallet: 0, bookings, onlinePayments };
  if (user) {
    const db = await getDb();
    const [rows, wallet] = await Promise.all([
      db
        .select()
        .from(schema.addresses)
        .where(and(eq(schema.addresses.userId, user.id), isNull(schema.addresses.deletedAt)))
        .orderBy(schema.addresses.createdAt),
      walletBalance(user.id),
    ]);
    data = {
      ...data,
      customer: { name: user.name, phone: user.phone, subPref: user.subPref },
      addresses: rows.map((a) => ({ id: a.id, label: a.label, line1: a.line1, area: a.area, landmark: a.landmark, pincode: a.pincode, isDefault: a.isDefault })),
      wallet,
    };
  }
  return <CheckoutView data={data} />;
}
