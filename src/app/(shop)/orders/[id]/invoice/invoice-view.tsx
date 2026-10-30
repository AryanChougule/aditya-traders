import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { grams, rupees } from "@/lib/money";
import { gstBreakup, itemBilled } from "@/lib/pricing";
import type { StoreSettings } from "@/lib/settings";
import type { Order } from "@/lib/types";

/** GST tax invoice, generated when packing finishes (final amounts known). Numbering is gap-free per financial year. */
export function InvoiceView({ order, settings: STORE }: { order: Order | null; settings: StoreSettings }) {
  if (!order?.invoiceNumber) return <p className="rounded-2xl bg-surface p-6 text-center text-muted ring-1 ring-border">The invoice is generated once your order is packed.</p>;

  const billed = order.items.filter((i) => i.status === "packed");
  // only a regular GST registration may show tax collected; composition stores issue a bill of supply, unregistered ones a plain bill
  const gst = STORE.gstScheme === "regular" ? gstBreakup(billed) : [];
  const itemsTotal = billed.reduce((s, i) => s + itemBilled(i), 0);
  const packedAt = order.timeline.find((t) => t.status === "packed")?.at ?? order.createdAt;

  return (
    <div className="mx-auto grid max-w-3xl gap-4">
      <Link href={`/orders/${order.id}`} className="inline-flex h-11 items-center gap-1.5 justify-self-start rounded-lg pr-3 font-semibold text-primary">
        <ArrowLeft className="size-4" aria-hidden /> Back to order
      </Link>
      <article className="rounded-2xl bg-surface p-5 text-sm ring-1 ring-border sm:p-8">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
          <div>
            <p className="font-display text-xl font-bold">{STORE.name}</p>
            <p className="text-muted">{STORE.address}</p>
            {STORE.gstin ? <p className="text-muted">GSTIN {STORE.gstin}</p> : null}
          </div>
          <div className="text-right">
            <h1 className="font-display text-lg font-semibold uppercase tracking-wide">
              {STORE.gstScheme === "regular" ? "Tax invoice" : STORE.gstScheme === "composition" ? "Bill of supply" : "Bill"}
            </h1>
            <p className="tabular">{order.invoiceNumber}</p>
            <p className="text-muted">{new Date(packedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
          </div>
        </header>

        <div className="grid gap-4 border-b border-border py-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted">Billed to</p>
            <p className="font-semibold">{order.customer.name}</p>
            <p className="text-muted">{order.customer.phone}</p>
            {order.address ? (
              <p className="text-muted">
                {order.address.line1}, {order.address.area}, {order.address.pincode}
              </p>
            ) : null}
          </div>
          <div className="sm:text-right">
            <p className="text-xs font-bold uppercase tracking-wide text-muted">Order</p>
            <p className="font-semibold">{order.number}</p>
            <p className="text-muted">
              Place of supply: {STORE.stateName} ({STORE.stateCode})
            </p>
          </div>
        </div>

        <div className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[520px] border-collapse">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="py-2 pr-2 font-bold">Item</th>
                <th className="py-2 pr-2 font-bold">HSN</th>
                <th className="py-2 pr-2 text-right font-bold">Qty</th>
                <th className="py-2 pr-2 text-right font-bold">Rate</th>
                <th className="py-2 pr-2 text-right font-bold">GST</th>
                <th className="py-2 text-right font-bold">Amount</th>
              </tr>
            </thead>
            <tbody className="tabular">
              {billed.map((i) => (
                <tr key={i.lineId} className="border-b border-border/70">
                  <td className="py-2 pr-2">{i.name}</td>
                  <td className="py-2 pr-2 text-muted">{i.hsn}</td>
                  <td className="py-2 pr-2 text-right">{i.unitType === "weight" ? grams(i.qtyPacked ?? i.qtyOrdered) : (i.qtyPacked ?? i.qtyOrdered)}</td>
                  <td className="py-2 pr-2 text-right">
                    {rupees(i.unitPrice)}
                    {i.unitType === "weight" ? "/kg" : ""}
                  </td>
                  <td className="py-2 pr-2 text-right">{i.gstRate}%</td>
                  <td className="py-2 text-right">{rupees(itemBilled(i))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs tabular">
              <thead>
                <tr className="text-left uppercase tracking-wide text-muted">
                  <th className="py-1 pr-2 font-bold">GST rate</th>
                  <th className="py-1 pr-2 text-right font-bold">Taxable</th>
                  <th className="py-1 pr-2 text-right font-bold">CGST</th>
                  <th className="py-1 text-right font-bold">SGST</th>
                </tr>
              </thead>
              <tbody>
                {gst.map((g) => (
                  <tr key={g.rate} className="border-t border-border/70">
                    <td className="py-1 pr-2">{g.rate}%</td>
                    <td className="py-1 pr-2 text-right">{rupees(g.taxable)}</td>
                    <td className="py-1 pr-2 text-right">{rupees(Math.floor(g.tax / 2))}</td>
                    <td className="py-1 text-right">{rupees(g.tax - Math.floor(g.tax / 2))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <dl className="grid content-start gap-1 tabular">
            <div className="flex justify-between">
              <dt className="text-muted">Items</dt>
              <dd>{rupees(itemsTotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Delivery</dt>
              <dd>{rupees(order.deliveryFee)}</dd>
            </div>
            {order.walletUsed ? (
              <div className="flex justify-between">
                <dt className="text-muted">Wallet</dt>
                <dd>{rupees(-order.walletUsed)}</dd>
              </div>
            ) : null}
            <div className="mt-1 flex justify-between border-t border-border pt-2 font-display text-base font-semibold">
              <dt>Total</dt>
              <dd>{rupees(order.totalFinal ?? order.totalEstimated)}</dd>
            </div>
          </dl>
        </div>
        <p className="mt-6 text-xs text-muted">
          {STORE.gstScheme === "unregistered" ? "Seller not registered under GST; no GST charged on this bill." : "Prices are inclusive of GST."} This is a computer-generated{" "}
          {STORE.gstScheme === "regular" ? "invoice" : "bill"} and does not need a signature.
          {STORE.gstScheme === "composition" ? " Composition taxable person, not eligible to collect tax on supplies." : ""}
        </p>
      </article>
    </div>
  );
}
