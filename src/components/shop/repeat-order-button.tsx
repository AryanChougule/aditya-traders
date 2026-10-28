"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Repeat } from "lucide-react";
import { toast } from "sonner";
import { repeatOrderLines } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { useT } from "@/components/i18n";
import { useCart } from "@/lib/cart-store";

export function RepeatOrderButton({ orderId, repeatLast, variant = "primary" }: { orderId: string; repeatLast?: boolean; variant?: "primary" | "ghost" }) {
  const t = useT();
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
            toast.success(t(n > 1 ? "repeat.addedMany" : "repeat.addedOne", { n }));
            router.push("/cart");
          } else toast(t("repeat.nothing"));
        })
      }
    >
      <Repeat className="size-4" aria-hidden /> {t(repeatLast ? "repeat.last" : "repeat.again")}
    </Button>
  );
}
