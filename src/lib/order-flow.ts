import type { OrderStatus, PaymentStatus } from "./types";

/*
 * The order state machine from the design doc (§07). Anything not listed here is rejected,
 * so a double tap or a stale tab can never move an order backwards.
 */
export const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  placed: ["confirmed", "cancelled"],
  confirmed: ["packing", "cancelled"],
  packing: ["needs_approval", "packed"],
  needs_approval: ["packing"],
  packed: ["out_for_delivery", "ready_for_pickup"],
  out_for_delivery: ["delivered", "delivery_failed"],
  delivery_failed: ["out_for_delivery", "returned"],
  ready_for_pickup: ["picked_up", "returned"],
  delivered: [],
  picked_up: [],
  returned: [],
  cancelled: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus) {
  return TRANSITIONS[from].includes(to);
}

export const isTerminal = (s: OrderStatus) => TRANSITIONS[s].length === 0;
export const isCancellable = (s: OrderStatus) => s === "placed" || s === "confirmed";

type Tone = "neutral" | "info" | "progress" | "warn" | "good" | "bad";

export const STATUS_META: Record<OrderStatus, { label: string; shopper: string; tone: Tone; icon: string }> = {
  placed: { label: "Awaiting payment", shopper: "Waiting for your payment", tone: "warn", icon: "Hourglass" },
  confirmed: { label: "New", shopper: "Order confirmed", tone: "info", icon: "CircleCheck" },
  packing: { label: "Packing", shopper: "Your order is being packed", tone: "progress", icon: "ShoppingBasket" },
  needs_approval: { label: "Waiting on shopper", shopper: "We need your OK on an item", tone: "warn", icon: "CircleAlert" },
  packed: { label: "Packed", shopper: "Packed and billed", tone: "progress", icon: "PackageCheck" },
  out_for_delivery: { label: "Out for delivery", shopper: "On the way", tone: "progress", icon: "Bike" },
  ready_for_pickup: { label: "Ready for pickup", shopper: "Ready at the counter", tone: "good", icon: "Store" },
  delivered: { label: "Delivered", shopper: "Delivered", tone: "good", icon: "CircleCheck" },
  picked_up: { label: "Picked up", shopper: "Picked up", tone: "good", icon: "CircleCheck" },
  delivery_failed: { label: "Delivery failed", shopper: "We couldn't reach you", tone: "bad", icon: "CircleX" },
  returned: { label: "Returned to store", shopper: "Returned to store", tone: "bad", icon: "Undo2" },
  cancelled: { label: "Cancelled", shopper: "Cancelled", tone: "neutral", icon: "Ban" },
};

export const PAYMENT_META: Record<PaymentStatus, { label: string; tone: Tone }> = {
  pending: { label: "Payment pending", tone: "warn" },
  paid: { label: "Paid", tone: "good" },
  cod_due: { label: "Cash on delivery", tone: "warn" },
  collected: { label: "Cash collected", tone: "good" },
  refunded: { label: "Refunded", tone: "neutral" },
  failed: { label: "Payment failed", tone: "bad" },
};

/** The happy path the shopper's tracker shows, per fulfilment mode. */
export function trackerSteps(mode: "delivery" | "pickup"): { key: OrderStatus[]; label: string }[] {
  return mode === "delivery"
    ? [
        { key: ["confirmed"], label: "Confirmed" },
        { key: ["packing", "needs_approval"], label: "Packing" },
        { key: ["packed"], label: "Packed" },
        { key: ["out_for_delivery", "delivery_failed"], label: "On the way" },
        { key: ["delivered"], label: "Delivered" },
      ]
    : [
        { key: ["confirmed"], label: "Confirmed" },
        { key: ["packing", "needs_approval"], label: "Packing" },
        { key: ["packed"], label: "Packed" },
        { key: ["ready_for_pickup"], label: "Ready" },
        { key: ["picked_up"], label: "Picked up" },
      ];
}
