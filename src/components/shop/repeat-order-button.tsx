"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Repeat } from "lucide-react";
import { toast } from "sonner";
import { repeatOrderLines } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart-store";

export function RepeatOrderButton({ orderId, label = "Order these again", variant = "primary" }: { orderId: string; label?: string; variant?: "primary" | "ghost" }) {
  const router = useRouter();
  const addLines = useCart((s) => s.addLines);
  const [pending, start] = useTransition();
  return (
    <Button
      variant={variant}
      size={variant === "ghost" ? "sm" : "md"}
      className={variant === "ghost" ? "text-primary" : undefined}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const n = addLines(await repeatOrderLines(orderId));
          if (n) {
            toast.success(`${n} item${n > 1 ? "s" : ""} added to your cart`);
            router.push("/cart");
          } else toast("Everything from that order is already in your cart, or out of stock right now.");
        })
      }
    >
      <Repeat className="size-4" aria-hidden /> {label}
    </Button>
  );
}
