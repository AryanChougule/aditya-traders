import Link from "next/link";
import { T } from "@/components/i18n";
import { rupees } from "@/lib/money";
import type { StoreSettings } from "@/lib/settings";

/** Store details, delivery terms and policy links, shared by the landing page and the shop. */
export function SiteFooter({ s, className }: { s: StoreSettings; className?: string }) {
  return (
    <footer className={`border-t border-border bg-surface ${className ?? ""}`}>
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 text-sm text-muted md:grid-cols-4">
        <div>
          <p className="font-display text-base font-semibold text-fg">{s.name}</p>
          <p>{s.address}</p>
          <p>
            <T k="footer.call" /> <span className="select-all font-semibold text-fg">{s.phone}</span>
          </p>
          {s.gstin ? <p>GSTIN {s.gstin}</p> : null}
        </div>
        <div>
          <p className="font-semibold text-fg">
            <T k="footer.delivery" />
          </p>
          <p>
            <T k="footer.terms" v={{ free: rupees(s.freeDeliveryAt), min: rupees(s.minOrder) }} />
          </p>
          <p>
            <T k="footer.slots" />
          </p>
        </div>
        <nav aria-label="Policies" className="flex flex-col gap-1">
          <p className="font-semibold text-fg">
            <T k="footer.policies" />
          </p>
          {/* the policy pages themselves stay in English: they're legal text and should match what was reviewed */}
          <Link className="hover:text-primary" href="/legal/terms">Terms of service</Link>
          <Link className="hover:text-primary" href="/legal/privacy">Privacy policy</Link>
          <Link className="hover:text-primary" href="/legal/refunds">Cancellations and refunds</Link>
          <Link className="hover:text-primary" href="/legal/shipping">Delivery policy</Link>
        </nav>
        <nav aria-label="Staff" className="flex flex-col gap-1">
          <p className="font-semibold text-fg">
            <T k="footer.staff" />
          </p>
          <Link className="hover:text-primary" href="/console">Store console</Link>
          <Link className="hover:text-primary" href="/rider">Rider view</Link>
        </nav>
      </div>
    </footer>
  );
}
