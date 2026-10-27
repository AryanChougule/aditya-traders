import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import type { Order } from "@/lib/types";
import { getSettings } from "./catalog";
import { getDb, schema } from "./db";
import { orderOps } from "./orders";

/*
 * Razorpay integration (design doc §10). Off until RAZORPAY_KEY_ID/SECRET are set in Vercel AND the owner
 * switches on online payments in Settings. The webhook is the source of truth; the checkout callback is a
 * faster path that verifies the same signature. Both record the payment once, keyed by Razorpay's payment id.
 */

const keyId = () => process.env.RAZORPAY_KEY_ID ?? "";
const keySecret = () => process.env.RAZORPAY_KEY_SECRET ?? "";

export async function gatewayEnabled(opts: { ignoreSetting?: boolean } = {}) {
  if (!keyId() || !keySecret()) return false;
  return opts.ignoreSetting || (await getSettings()).onlinePayments;
}

function safeEqualHex(a: string, b: string) {
  const x = Buffer.from(a, "hex");
  const y = Buffer.from(b, "hex");
  return x.length === y.length && timingSafeEqual(x, y);
}

export async function createGatewayOrder(order: Order) {
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${keyId()}:${keySecret()}`).toString("base64")}`,
    },
    body: JSON.stringify({ amount: order.totalEstimated, currency: "INR", receipt: order.number, notes: { orderId: order.id } }),
  });
  if (!res.ok) throw new Error(`Razorpay order failed: ${res.status} ${await res.text()}`);
  const rz = (await res.json()) as { id: string; amount: number };
  const db = await getDb();
  await db.update(schema.orders).set({ razorpayOrderId: rz.id }).where(eq(schema.orders.id, order.id));
  return { keyId: keyId(), orderId: rz.id, amount: rz.amount };
}

/** Checkout callback: signature = HMAC_SHA256(order_id + "|" + payment_id, key_secret). */
export function verifyCheckoutSignature(rzOrderId: string, rzPaymentId: string, signature: string) {
  const expected = createHmac("sha256", keySecret()).update(`${rzOrderId}|${rzPaymentId}`).digest("hex");
  return /^[0-9a-f]+$/i.test(signature) && safeEqualHex(expected, signature);
}

/** Webhook: signature = HMAC_SHA256(raw body, webhook secret). */
export function verifyWebhookSignature(rawBody: string, signature: string) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return /^[0-9a-f]+$/i.test(signature) && safeEqualHex(expected, signature);
}

/** Records a captured payment and confirms the order. Safe to call any number of times. */
export async function recordPayment(rzOrderId: string, rzPaymentId: string, amount: number) {
  const db = await getDb();
  const [order] = await db.select().from(schema.orders).where(eq(schema.orders.razorpayOrderId, rzOrderId));
  if (!order) return { ok: false as const, reason: "unknown order" };
  const inserted = await db
    .insert(schema.payments)
    .values({ orderId: order.id, provider: "razorpay", providerPaymentId: rzPaymentId, amount, status: "captured" })
    .onConflictDoNothing()
    .returning({ id: schema.payments.id });
  if (amount !== order.totalEstimated) {
    console.error(`Payment amount mismatch on ${order.number}: paid ${amount}, expected ${order.totalEstimated}`);
    return { ok: false as const, reason: "amount mismatch" };
  }
  if (inserted.length || order.status === "placed") await orderOps.markPaid(order.id);
  return { ok: true as const, orderId: order.id };
}
