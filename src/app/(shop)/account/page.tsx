import type { Metadata } from "next";
import { and, eq, isNull } from "drizzle-orm";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/skeleton";
import { getCurrentUser } from "@/server/auth";
import { getDb, schema } from "@/server/db";
import { walletBalance, walletEntries } from "@/server/orders";
import { AccountView } from "./account-view";

export const metadata: Metadata = { title: "Account", robots: { index: false } };

export default function AccountPage() {
  return (
    <Suspense fallback={<PageSkeleton className="mx-auto max-w-2xl" />}>
      <Account />
    </Suspense>
  );
}

async function Account() {
  const user = await getCurrentUser();
  if (!user) return <AccountView user={null} addresses={[]} wallet={0} ledger={[]} />;
  const db = await getDb();
  const [addresses, wallet, ledger] = await Promise.all([
    db
      .select()
      .from(schema.addresses)
      .where(and(eq(schema.addresses.userId, user.id), isNull(schema.addresses.deletedAt)))
      .orderBy(schema.addresses.createdAt),
    walletBalance(user.id),
    walletEntries(user.id),
  ]);
  return (
    <AccountView
      user={user}
      addresses={addresses.map((a) => ({ id: a.id, label: a.label, line1: a.line1, area: a.area, landmark: a.landmark, pincode: a.pincode, isDefault: a.isDefault }))}
      wallet={wallet}
      ledger={ledger}
    />
  );
}
