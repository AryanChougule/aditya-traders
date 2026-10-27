import { NextResponse } from "next/server";
import { recordPayment, verifyWebhookSignature } from "@/server/razorpay";

/**
 * Razorpay → us. Configure in the Razorpay dashboard: URL https://<your-domain>/api/webhooks/razorpay,
 * events payment.captured and order.paid, secret = RAZORPAY_WEBHOOK_SECRET.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyWebhookSignature(raw, req.headers.get("x-razorpay-signature") ?? "")) {
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  }
  const event = JSON.parse(raw) as {
    event: string;
    payload?: { payment?: { entity?: { id: string; order_id: string; amount: number; status: string } } };
  };
  const p = event.payload?.payment?.entity;
  if ((event.event === "payment.captured" || event.event === "order.paid") && p?.order_id && p.status === "captured") {
    await recordPayment(p.order_id, p.id, p.amount);
  }
  // Always 200 for a verified event so Razorpay doesn't retry things we deliberately ignore.
  return NextResponse.json({ ok: true });
}
