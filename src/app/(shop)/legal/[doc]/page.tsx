import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { rupees } from "@/lib/money";
import type { StoreSettings } from "@/lib/settings";
import { getSettings } from "@/server/catalog";

/*
 * Policy pages that payment gateways (Razorpay) and the DPDP Act 2023 expect a store to publish.
 * Written from how this app actually behaves and filled from the store settings. They are a sound
 * starting point, not legal advice: the owner should have them reviewed before launch.
 */

type Doc = { title: string; body: (s: StoreSettings) => React.ReactNode };

const DOCS: Record<string, Doc> = {
  terms: {
    title: "Terms of service",
    body: (s) => (
      <>
        <p>
          These terms apply when you order from {s.name} ("we", "us") at {s.address}, through this website. By placing an order you agree to them.
        </p>
        <h2>Orders and prices</h2>
        <p>
          Prices include GST. An order is accepted when we confirm it on your order page. Loose items (vegetables, atta, dal and similar) are sold by
          weight: we pack within ±{Math.round(s.weightTolerance * 100)}% of the weight you choose and bill the exact packed weight. If the final bill
          is lower than what you paid, the difference is added to your store wallet.
        </p>
        <h2>Out-of-stock items</h2>
        <p>
          If an item runs out after you order, we follow the choice you made at checkout: replace it with a similar item (never more than 10% dearer
          per kg), ask you first, or remove it and refund it.
        </p>
        <h2>Payment</h2>
        <p>
          You can pay by cash or UPI on delivery or at the counter, and by UPI or card online where offered. Online payments are processed by our
          payment partner; we never see or store your card details.
        </p>
        <h2>Delivery and pickup</h2>
        <p>See our delivery policy. Please share the 4-digit code from your order page only after you have received your bags.</p>
        <h2>Your account</h2>
        <p>
          You log in with your mobile number and a one-time code. Keep your phone secure. We may refuse or cancel orders that look fraudulent or that
          we cannot fulfil, and will refund any amount paid.
        </p>
        <h2>Contact</h2>
        <p>
          Questions or complaints: call {s.phone} or visit the store at {s.address}.
        </p>
      </>
    ),
  },
  privacy: {
    title: "Privacy policy",
    body: (s) => (
      <>
        <p>
          {s.name} collects only what it needs to deliver your groceries, in line with India's Digital Personal Data Protection Act, 2023.
        </p>
        <h2>What we collect</h2>
        <ul>
          <li>Your mobile number, to log you in and contact you about an order.</li>
          <li>Your name and delivery addresses, so our staff can deliver.</li>
          <li>Your orders, payments and store-wallet history, to run your account and keep tax records.</li>
          <li>Searches that returned no results (without your identity), to decide what to stock.</li>
        </ul>
        <h2>Who sees it</h2>
        <p>
          Our staff, to pack and deliver your order. Our service providers, only as needed: our hosting and database provider, Google Firebase (to
          send the login code by SMS), and our payment partner when you pay online. If a delivery partner carries your order, they receive your name,
          phone and address for that delivery. We do not sell your data or use it for advertising.
        </p>
        <h2>How long we keep it</h2>
        <p>
          While your account is active. Invoices are kept for the period tax law requires (currently up to 8 years); if you delete your account we
          remove your name and address from them.
        </p>
        <h2>Your choices</h2>
        <p>
          You can see and edit your addresses on the Account page, and delete your account there at any time. To ask what data we hold or to raise a
          concern, contact our grievance officer at the store: {s.phone}, {s.address}.
        </p>
        <h2>Cookies</h2>
        <p>We use one essential cookie to keep you logged in, and your browser's storage to remember your cart. No tracking or advertising cookies.</p>
      </>
    ),
  },
  refunds: {
    title: "Cancellations and refunds",
    body: (s) => (
      <>
        <h2>Cancelling</h2>
        <p>
          You can cancel free of charge from your order page until we start packing. After that, please call {s.phone}. Unpaid online orders are
          cancelled automatically after 15 minutes.
        </p>
        <h2>Refunds</h2>
        <ul>
          <li>Cancelled or removed items on an order you paid for are credited to your store wallet immediately, and used on your next order.</li>
          <li>If you'd rather have the money back to your original payment method, call the store. Online refunds reach your bank in 5–7 working days.</li>
          <li>If loose items weigh less than you paid for, the difference goes to your wallet automatically.</li>
        </ul>
        <h2>Damaged, wrong or not fresh</h2>
        <p>
          Tell the delivery person at the door, or call us within 24 hours of delivery. We will replace the item or refund it. Perishables can't be
          returned once accepted unless they were spoiled on arrival.
        </p>
      </>
    ),
  },
  shipping: {
    title: "Delivery policy",
    body: (s) => (
      <>
        <p>
          We deliver from {s.address} using our own delivery staff, or a delivery partner at busy times, to these pincodes:{" "}
          {Object.keys(s.serviceable).join(", ") || "none set yet"}. Anyone can order for pickup at the counter.
        </p>
        <h2>Slots</h2>
        <p>
          Choose a two-hour slot at checkout between {s.opensAt}:00 and {s.closesAt}:00. Slots close {s.slotCutoffMinutes} minutes before they start.
          If we're running late we'll call you.
        </p>
        <h2>Charges</h2>
        <p>
          Minimum order {rupees(s.minOrder)}. Delivery is free above {rupees(s.freeDeliveryAt)}; below that the fee depends on distance:{" "}
          {s.feeBands
            .slice()
            .sort((a, b) => a.upToKm - b.upToKm)
            .map((b) => `${rupees(b.fee)} up to ${b.upToKm} km`)
            .join(", ")}
          . Pickup is free.
        </p>
        <h2>If we can't deliver</h2>
        <p>
          If we can't reach you, we'll call, then bring the order back to the store and arrange another time. Orders we can't deliver are refunded to
          your wallet.
        </p>
      </>
    ),
  },
};

export function generateStaticParams() {
  return Object.keys(DOCS).map((doc) => ({ doc }));
}

export async function generateMetadata(props: PageProps<"/legal/[doc]">): Promise<Metadata> {
  const { doc } = await props.params;
  return { title: DOCS[doc]?.title ?? "Policy" };
}

export default async function LegalPage(props: PageProps<"/legal/[doc]">) {
  const { doc } = await props.params;
  const d = DOCS[doc];
  if (!d) notFound();
  const s = await getSettings();
  return (
    <article className="mx-auto grid max-w-2xl gap-3 rounded-2xl bg-surface p-5 ring-1 ring-border sm:p-8 [&_h2]:mt-3 [&_h2]:text-lg [&_h2]:font-semibold [&_li]:my-1 [&_p]:text-[15px] [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5">
      <h1 className="text-2xl font-semibold">{d.title}</h1>
      <p className="text-sm text-muted">{s.name}</p>
      {d.body(s)}
    </article>
  );
}
