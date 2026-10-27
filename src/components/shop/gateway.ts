"use client";

import { toast } from "sonner";
import { verifyPaymentAction } from "@/app/actions";
import type { Order } from "@/lib/types";

type Gateway = { keyId: string; orderId: string; amount: number };
type RazorpayCtor = new (opts: Record<string, unknown>) => { open: () => void; on: (ev: string, fn: (r: unknown) => void) => void };

let loading: Promise<RazorpayCtor> | null = null;

function loadCheckout(): Promise<RazorpayCtor> {
  const w = window as unknown as { Razorpay?: RazorpayCtor };
  if (w.Razorpay) return Promise.resolve(w.Razorpay);
  loading ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => (w.Razorpay ? resolve(w.Razorpay) : reject(new Error("Razorpay failed to load")));
    s.onerror = () => {
      loading = null;
      reject(new Error("Razorpay failed to load"));
    };
    document.head.appendChild(s);
  });
  return loading;
}

/**
 * Opens Razorpay's checkout for an order. On success the signature is verified on the server;
 * the webhook confirms the same payment independently if the shopper closes the page early.
 */
export async function openGateway(
  g: Gateway,
  order: Pick<Order, "id" | "number">,
  customer: { name: string; phone: string } | null,
  cb: { onPaid: () => void; onDismiss: () => void },
) {
  try {
    const Razorpay = await loadCheckout();
    const rz = new Razorpay({
      key: g.keyId,
      order_id: g.orderId,
      amount: g.amount,
      currency: "INR",
      name: "Aditya Traders",
      description: `Order ${order.number}`,
      prefill: customer ? { name: customer.name, contact: customer.phone.replace(/\s/g, "") } : undefined,
      theme: { color: "#047857" },
      handler: async (res: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
        const r = await verifyPaymentAction({
          orderId: order.id,
          razorpayOrderId: res.razorpay_order_id,
          razorpayPaymentId: res.razorpay_payment_id,
          signature: res.razorpay_signature,
        });
        if (!r.ok) toast.error(r.error);
        cb.onPaid();
      },
      modal: { ondismiss: cb.onDismiss, confirm_close: true },
    });
    rz.on("payment.failed", () => toast.error("Payment didn't go through. No money was taken. You can try again from your order page."));
    rz.open();
  } catch {
    toast.error("We couldn't open the payment page. Check your connection and try again from your order page.");
    cb.onDismiss();
  }
}
