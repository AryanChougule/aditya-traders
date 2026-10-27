"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense } from "react";
import { ChartColumn, ClipboardList, ExternalLink, LogOut, Package, Settings, TriangleAlert } from "lucide-react";
import { Brand } from "@/components/brand";
import { useSettings } from "@/components/providers";
import { StoreStatus } from "@/components/shop/chrome";
import { missingSetup } from "@/lib/settings";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/console", label: "Orders", icon: ClipboardList, match: (p: string) => p === "/console" || p.startsWith("/console/orders") },
  { href: "/console/products", label: "Products & stock", icon: Package, match: (p: string) => p.startsWith("/console/products") },
  { href: "/console/reports", label: "Reports", icon: ChartColumn, match: (p: string) => p.startsWith("/console/reports") },
  { href: "/console/settings", label: "Settings", icon: Settings, match: (p: string) => p.startsWith("/console/settings") },
];

function ConsoleNav({ pathname }: { pathname: string }) {
  return (
    <nav aria-label="Console" className="no-scrollbar ml-auto flex gap-1 overflow-x-auto lg:ml-0 lg:flex-col">
      {NAV.map(({ href, label, icon: I, match }) => {
        const active = match(pathname);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            aria-label={label}
            className={cn(
              "flex h-11 shrink-0 items-center gap-2.5 rounded-xl px-3 text-sm font-bold transition-colors",
              active ? "bg-primary-soft text-primary" : "text-muted hover:bg-surface-2 hover:text-fg",
            )}
          >
            <I className="size-5" aria-hidden />
            <span className="hidden sm:inline">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function LiveConsoleNav() {
  return <ConsoleNav pathname={usePathname()} />;
}

export function ConsoleShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const settings = useSettings();
  const todo = missingSetup(settings);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="sticky top-0 z-30 border-b border-border bg-surface pt-[env(safe-area-inset-top)] lg:h-dvh lg:border-b-0 lg:border-r">
        <div className="flex items-center gap-3 px-4 py-3 lg:h-full lg:flex-col lg:items-stretch lg:gap-5 lg:py-5">
          <Brand href="/console" sub="Store console" />
          {/* the active tab needs the URL; keep it inside Suspense so the shell still prerenders */}
          <Suspense fallback={<ConsoleNav pathname="" />}>
            <LiveConsoleNav />
          </Suspense>
          <div className="hidden gap-1 lg:mt-auto lg:grid">
            <StoreStatus audience="store" className="px-3 pb-2" />
            <Link href="/" className="flex h-11 items-center gap-2.5 rounded-xl px-3 text-sm font-semibold text-muted hover:bg-surface-2 hover:text-fg">
              <ExternalLink className="size-5" aria-hidden /> Open the shop
            </Link>
            <Link href="/rider" className="flex h-11 items-center gap-2.5 rounded-xl px-3 text-sm font-semibold text-muted hover:bg-surface-2 hover:text-fg">
              <ExternalLink className="size-5" aria-hidden /> Rider view
            </Link>
            <button
              onClick={async () => {
                await fetch("/api/session", { method: "DELETE" });
                router.push("/login?next=/console");
              }}
              className="flex h-11 cursor-pointer items-center gap-2.5 rounded-xl px-3 text-sm font-semibold text-muted hover:bg-surface-2 hover:text-fg"
            >
              <LogOut className="size-5" aria-hidden /> Log out
            </button>
          </div>
        </div>
      </aside>
      <div className="min-w-0">
        {todo.length ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border bg-accent-soft px-4 py-2 text-sm">
            <TriangleAlert className="size-4 shrink-0 text-accent" aria-hidden />
            <span>
              <b>Finish setting up before customers order:</b> {todo.join(", ")}.
            </span>
            <Link href="/console/settings" className="font-bold text-accent underline underline-offset-2">
              Open settings
            </Link>
          </div>
        ) : null}
        {!settings.acceptingOrders ? (
          <p className="border-b border-border bg-danger-soft px-4 py-2 text-sm font-semibold text-danger">Online orders are paused. Shoppers can browse but not check out.</p>
        ) : null}
        <main className="mx-auto w-full max-w-[1400px] px-4 py-5 pb-[max(20px,env(safe-area-inset-bottom))]">{children}</main>
      </div>
    </div>
  );
}
