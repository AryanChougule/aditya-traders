"use client";

import { createContext, useContext, useEffect } from "react";
import { Toaster } from "sonner";
import { LangEffect } from "@/components/i18n";
import { useCart } from "@/lib/cart-store";
import type { StoreSettings } from "@/lib/settings";

const SettingsContext = createContext<StoreSettings | null>(null);

/** Store settings loaded on the server, available to every client component. */
export function useSettings(): StoreSettings {
  const s = useContext(SettingsContext);
  if (!s) throw new Error("useSettings must be used inside <Providers>");
  return s;
}

export function Providers({ settings, children }: { settings: StoreSettings; children: React.ReactNode }) {
  useEffect(() => {
    useCart.persist.rehydrate();
    // keep the cart in sync if the shop is open in two tabs
    const onStorage = (e: StorageEvent) => {
      if (e.key === useCart.persist.getOptions().name) useCart.persist.rehydrate();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <SettingsContext.Provider value={settings}>
      <LangEffect />
      {children}
      <Toaster
        position="top-center"
        toastOptions={{
          classNames: {
            toast: "!bg-surface !text-fg !border-border !rounded-xl !font-sans",
            description: "!text-muted",
          },
        }}
      />
    </SettingsContext.Provider>
  );
}
