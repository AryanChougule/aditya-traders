import Link from "next/link";
import { LogoMark } from "@/components/brand";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="grid max-w-sm justify-items-center gap-3 text-center">
        <LogoMark className="size-14" />
        <h1 className="text-2xl font-semibold">We couldn't find that page</h1>
        <p className="text-muted">The link may be old, or the product is no longer sold online.</p>
        <Link href="/shop" className="inline-flex h-11 items-center rounded-xl bg-primary px-5 font-bold text-primary-fg">
          Go to the shop
        </Link>
      </div>
    </main>
  );
}
