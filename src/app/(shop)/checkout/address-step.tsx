"use client";

import { useState } from "react";
import { CircleAlert, CircleCheck, MapPin, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveAddressAction } from "@/app/actions";
import { useT } from "@/components/i18n";
import { useSettings } from "@/components/providers";
import { rupees } from "@/lib/money";
import { deliveryFee } from "@/lib/settings";
import type { Address } from "@/lib/types";
import { cn, landmarkText } from "@/lib/utils";

const LABELS: Address["label"][] = ["Home", "Work", "Other"];

export function AddressStep({ addresses, selectedId, onSelect, onPickup }: { addresses: Address[]; selectedId?: string; onSelect: (id: string) => void; onPickup: () => void }) {
  const settings = useSettings();
  const t = useT();
  const [adding, setAdding] = useState(addresses.length === 0);

  return (
    <div className="grid gap-3">
      {addresses.length ? (
        <div role="radiogroup" aria-label={t("addr.saved")} className="grid gap-2">
          {addresses.map((a) => {
            const km = settings.serviceable[a.pincode];
            const checked = a.id === selectedId;
            return (
              <button
                key={a.id}
                type="button"
                role="radio"
                aria-checked={checked}
                onClick={() => onSelect(a.id)}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-xl p-3.5 text-left ring-1 transition-[box-shadow,background-color]",
                  checked ? "bg-primary-soft ring-2 ring-primary" : "bg-surface ring-border hover:bg-surface-2",
                )}
              >
                <MapPin className={cn("mt-0.5 size-5 shrink-0", checked ? "text-primary" : "text-muted")} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">{t(`addr.${a.label}`)}</span>
                  <span className="block text-sm text-muted">
                    {a.line1}, {a.area} · {a.pincode}
                  </span>
                  {a.landmark ? <span className="block text-sm text-muted">{landmarkText(a.landmark)}</span> : null}
                </span>
                {km ? <span className="shrink-0 text-xs font-semibold text-muted tabular">{km} km</span> : null}
              </button>
            );
          })}
        </div>
      ) : null}

      {adding ? (
        <AddressForm
          onSaved={(id) => {
            setAdding(false);
            onSelect(id);
          }}
          onCancel={addresses.length ? () => setAdding(false) : undefined}
          onPickup={onPickup}
        />
      ) : (
        <Button variant="outline" onClick={() => setAdding(true)} className="justify-self-start">
          <Plus className="size-4" aria-hidden /> {t("addr.addNew")}
        </Button>
      )}
    </div>
  );
}

function AddressForm({ onSaved, onCancel, onPickup }: { onSaved: (id: string) => void; onCancel?: () => void; onPickup: () => void }) {
  const settings = useSettings();
  const t = useT();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [label, setLabel] = useState<Address["label"]>("Home");
  const [line1, setLine1] = useState("");
  const [area, setArea] = useState("");
  const [landmark, setLandmark] = useState("");
  const [pincode, setPincode] = useState("");
  const [err, setErr] = useState<Record<string, string>>({});

  const km = pincode.length === 6 ? settings.serviceable[pincode] : undefined;
  const outside = pincode.length === 6 && km === undefined;

  return (
    <form
      className="grid gap-3 rounded-xl bg-surface-2/60 p-3.5"
      onSubmit={(e) => {
        e.preventDefault();
        const next: Record<string, string> = {};
        if (line1.trim().length < 3) next.line1 = t("addr.errLine1");
        if (area.trim().length < 2) next.area = t("addr.errArea");
        if (!/^\d{6}$/.test(pincode)) next.pincode = t("addr.errPin");
        else if (outside) next.pincode = t("addr.errOutside");
        setErr(next);
        if (Object.keys(next).length) return;
        setSaving(true);
        saveAddressAction({ label, line1: line1.trim(), area: area.trim(), landmark: landmark.trim(), pincode }).then((r) => {
          setSaving(false);
          if (!r.ok) return toast.error(r.error);
          router.refresh();
          onSaved(r.value);
        });
      }}
    >
      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold">{t("addr.saveAs")}</legend>
        <div className="flex gap-2">
          {LABELS.map((l) => (
            <button
              key={l}
              type="button"
              aria-pressed={label === l}
              onClick={() => setLabel(l)}
              className={cn(
                "h-10 cursor-pointer rounded-full px-4 text-sm font-bold ring-1 transition-colors",
                label === l ? "bg-fg text-bg ring-fg" : "bg-surface ring-border hover:bg-surface-2",
              )}
            >
              {t(`addr.${l}`)}
            </button>
          ))}
        </div>
      </fieldset>
      <Field id="addr-line1" label={t("addr.line1")} autoComplete="address-line1" value={line1} onChange={(e) => setLine1(e.target.value)} error={err.line1} />
      <Field id="addr-area" label={t("addr.area")} autoComplete="address-line2" value={area} onChange={(e) => setArea(e.target.value)} error={err.area} />
      <Field
        id="addr-landmark"
        label={t("addr.landmark")}
        value={landmark}
        onChange={(e) => setLandmark(e.target.value)}
        hint={t("addr.landmarkHint")}
      />
      <Field
        id="addr-pincode"
        label={t("addr.pincode")}
        inputMode="numeric"
        autoComplete="postal-code"
        maxLength={6}
        value={pincode}
        onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
        error={err.pincode}
        hint={t("addr.pinHint", { list: Object.keys(settings.serviceable).join(", ") })}
      />
      {km !== undefined ? (
        <p className="flex items-center gap-2 rounded-lg bg-primary-soft px-3 py-2 text-sm font-semibold text-primary" role="status">
          <CircleCheck className="size-4 shrink-0" aria-hidden />{" "}
          {t("addr.weDeliver", { km, fee: rupees(deliveryFee(settings, km)), free: rupees(settings.freeDeliveryAt) })}
        </p>
      ) : outside ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger" role="status">
          <CircleAlert className="size-4 shrink-0" aria-hidden />
          <span className="font-semibold">{t("addr.notHere", { pin: pincode })}</span>
          <button type="button" onClick={onPickup} className="cursor-pointer font-bold underline underline-offset-2">
            {t("addr.pickupInstead")}
          </button>
        </div>
      ) : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>
          {t("addr.save")}
        </Button>
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
