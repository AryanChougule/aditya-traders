import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PhoneLogin } from "@/components/shop/phone-login";
import { PageSkeleton } from "@/components/ui/skeleton";
import { getCurrentUser } from "@/server/auth";

export const metadata: Metadata = { title: "Log in", robots: { index: false } };

export default function LoginPage(props: PageProps<"/login">) {
  return (
    <Suspense fallback={<PageSkeleton className="mx-auto max-w-md" />}>
      <Login {...props} />
    </Suspense>
  );
}

async function Login(props: PageProps<"/login">) {
  const { next } = await props.searchParams;
  // only same-site paths, so the login page can't be used to bounce people to another website
  const dest = typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/";
  if (await getCurrentUser()) redirect(dest);
  return (
    <div className="mx-auto grid max-w-md gap-4">
      <h1 className="text-2xl font-semibold">Log in</h1>
      <div className="rounded-2xl bg-surface p-5 ring-1 ring-border">
        <PhoneLogin />
      </div>
    </div>
  );
}
