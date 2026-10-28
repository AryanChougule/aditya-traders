import Link from "next/link";
import { Bike, Clock, MapPin, Scale, Store } from "lucide-react";
import { Brand } from "@/components/brand";
import { LangSwitch, T } from "@/components/i18n";
import { AnnouncementHero, FestivalExtras, OrderButtons } from "@/components/landing/announcement";
import { HowItWorks } from "@/components/shop/buy-again";
import { CategoryTile } from "@/components/shop/category-tile";
import { StoreStatus } from "@/components/shop/chrome";
import { SiteFooter } from "@/components/shop/site-footer";
import { LandingHours } from "@/components/landing/hours";
import type { Key } from "@/lib/i18n";
import { rupees } from "@/lib/money";
import { getCategories, getSettings } from "@/server/catalog";

/*
 * What customers see when they open the domain: the owner's announcement (offer or festival wishes) with
 * "Order now", then the reasons to order, delivery area and categories. The shop itself lives at /shop.
 */
export default async function LandingPage() {
  const [s, categories] = await Promise.all([getSettings(), getCategories()]);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5">
          <Brand href="/" />
          <div className="ml-auto flex items-center gap-2">
            <LangSwitch />
            <Link href="/shop" className="hidden h-11 items-center rounded-xl bg-primary px-4 font-bold text-primary-fg transition-transform active:scale-[0.97] sm:inline-flex">
              <T k="landing.orderNow" />
            </Link>
          </div>
        </div>
      </header>

      <AnnouncementHero />

      <main className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 gap-10 px-4 pb-16 pt-4">
        <StoreStatus className="justify-self-start" />
        <FestivalExtras />

        <section aria-labelledby="why" className="grid gap-4">
          <h2 id="why" className="text-xl font-semibold sm:text-2xl">
            <T k="landing.whyTitle" />
          </h2>
          <div className="grid gap-2.5 sm:grid-cols-3">
            <Perk icon={<Bike className="size-6" />} title="perk.freeDelivery" vars={{ amount: rupees(s.freeDeliveryAt) }} body="perk.freeDeliveryBody" tone="bg-primary-soft text-primary" />
            <Perk icon={<Scale className="size-6" />} title="perk.weight" body="perk.weightBody" tone="bg-accent-soft text-accent" />
            <Perk icon={<Store className="size-6" />} title="perk.pickup" body="perk.pickupBody" tone="bg-info-soft text-info" />
          </div>
          <HowItWorks />
        </section>

        <section aria-labelledby="cats" className="grid gap-4">
          <h2 id="cats" className="text-xl font-semibold sm:text-2xl">
            <T k="home.categories" />
          </h2>
          <div className="grid grid-cols-4 gap-x-1.5 gap-y-3 sm:grid-cols-5 lg:grid-cols-10">
            {categories.map((c) => (
              <CategoryTile key={c.id} c={c} />
            ))}
          </div>
        </section>

        <section aria-labelledby="area" className="grid gap-3 rounded-3xl bg-surface p-5 ring-1 ring-border sm:grid-cols-2 sm:p-8">
          <div className="grid content-start gap-2">
            <h2 id="area" className="flex items-center gap-2 text-xl font-semibold">
              <MapPin className="size-5 text-primary" aria-hidden /> <T k="landing.areaTitle" />
            </h2>
            <p className="text-muted">
              <T k="landing.areaBody" v={{ list: Object.keys(s.serviceable).join(", ") || "—" }} />
            </p>
          </div>
          <div className="grid content-start gap-2">
            <p className="flex items-center gap-2 font-semibold">
              <Clock className="size-5 text-primary" aria-hidden /> <LandingHours />
            </p>
            <p className="text-muted">{s.address}</p>
            <p className="text-muted">
              <T k="footer.call" /> <span className="select-all font-semibold text-fg">{s.phone}</span>
            </p>
          </div>
        </section>

        <section className="grid justify-items-center gap-3 rounded-3xl bg-primary-soft px-5 py-10 text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">
            <T k="landing.ctaTitle" />
          </h2>
          <p className="text-muted">
            <T k="landing.ctaBody" v={{ min: rupees(s.minOrder), free: rupees(s.freeDeliveryAt) }} />
          </p>
          <OrderButtons variant="primary" />
        </section>
      </main>

      <SiteFooter s={s} />
    </div>
  );
}

function Perk({ icon, title, vars, body, tone }: { icon: React.ReactNode; title: Key; vars?: Record<string, string>; body: Key; tone: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-surface p-4 ring-1 ring-border">
      <span className={`grid size-12 shrink-0 place-items-center rounded-xl ${tone}`} aria-hidden>
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block font-display text-base font-semibold leading-snug">
          <T k={title} v={vars} />
        </span>
        <span className="block text-sm text-muted">
          <T k={body} />
        </span>
      </span>
    </div>
  );
}
