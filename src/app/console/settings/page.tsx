import type { Metadata } from "next";
import { ne } from "drizzle-orm";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/skeleton";
import { displayPhone, requireStaff } from "@/server/auth";
import { getSettings } from "@/server/catalog";
import { getDb, schema } from "@/server/db";
import { gatewayEnabled } from "@/server/razorpay";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Settings />
    </Suspense>
  );
}

async function Settings() {
  const me = await requireStaff("/console/settings", ["owner"]);
  const db = await getDb();
  const [settings, staff, gatewayReady] = await Promise.all([
    getSettings(),
    db.select().from(schema.users).where(ne(schema.users.role, "customer")).orderBy(schema.users.createdAt),
    gatewayEnabled({ ignoreSetting: true }),
  ]);
  return (
    <SettingsForm
      initial={settings}
      gatewayReady={gatewayReady}
      meId={me.id}
      staff={staff.map((u) => ({ id: u.id, name: u.name, phone: displayPhone(u.phone), role: u.role }))}
    />
  );
}
