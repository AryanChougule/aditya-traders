import { History } from "lucide-react";
import { ProductCard } from "./product-card";
import { SectionHeader } from "./product-rail";
import { RepeatOrderButton } from "./repeat-order-button";
import { getCurrentUser } from "@/server/auth";
import { getCatalog } from "@/server/catalog";
import { listCustomerOrders } from "@/server/orders";
import { T } from "@/components/i18n";
import { dayLabel } from "@/lib/utils";

/** The retention feature that matters most for groceries: your usual items, one tap away. */
export async function BuyAgain() {
  const user = await getCurrentUser();
  if (!user) return <HowItWorks />;
  const mine = (await listCustomerOrders(user.id)).filter((o) => o.status !== "cancelled" && o.status !== "placed");
  if (!mine.length) return <HowItWorks />;

  const counts = new Map<string, number>();
  for (const o of mine) for (const i of o.items) if (i.status !== "removed" && i.status !== "substituted") counts.set(i.productId, (counts.get(i.productId) ?? 0) + 1);
  const catalog = new Map((await getCatalog()).map((p) => [p.id, p]));
  const products = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => catalog.get(id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));
  const last = mine[0];

  return (
    <section aria-label="Buy again" className="grid min-w-0 grid-cols-1 gap-3">
      <div className="flex flex-col gap-3 rounded-2xl bg-primary-soft p-4 sm:flex-row sm:items-center">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-surface text-primary">
          <History className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display font-semibold">
            <T k="buyAgain.lastOrder" v={{ date: dayLabel(last.createdAt) }} />
          </p>
          <p className="text-sm text-muted">
            <T k="common.items" v={{ n: last.items.filter((i) => !i.substituteFor).length }} /> · {last.number}
          </p>
        </div>
        <RepeatOrderButton orderId={last.id} repeatLast />
      </div>
      {products.length ? (
        <>
          <SectionHeader title={<T k="buyAgain.title" />} sub={<T k="buyAgain.sub" />} />
          <div className="no-scrollbar -mx-4 flex snap-x gap-2.5 overflow-x-auto scroll-px-4 px-4 pb-1">
            {products.slice(0, 12).map((p) => (
              <ProductCard key={p.id} product={p} className="w-[44vw] max-w-[180px] shrink-0 snap-start sm:w-[180px]" />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}

export function HowItWorks() {
  const steps = [
    ["how.1t", "how.1d"],
    ["how.2t", "how.2d"],
    ["how.3t", "how.3d"],
  ] as const;
  return (
    <section aria-label="How it works" className="rounded-2xl bg-surface p-4 ring-1 ring-border">
      <ol className="grid gap-4 sm:grid-cols-3">
        {steps.map(([t, d], i) => (
          <li key={t} className="flex gap-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-soft font-display text-sm font-bold text-primary">{i + 1}</span>
            <span className="min-w-0">
              <span className="block font-semibold">
                <T k={t} />
              </span>
              <span className="block text-sm text-muted">
                <T k={d} />
              </span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
