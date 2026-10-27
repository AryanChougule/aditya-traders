"use client";

import { useMemo, useState } from "react";
import { FileUp, Pencil, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { createProductAction, importProductsAction, updateProductAction } from "@/app/actions";
import { ProductArt } from "@/components/shop/product-art";
import { Button } from "@/components/ui/button";
import { Field, Switch } from "@/components/ui/field";
import { Pill } from "@/components/ui/pill";
import { Sheet } from "@/components/ui/sheet";
import { discountPct, rupees } from "@/lib/money";
import { search } from "@/lib/search";
import type { Category, LiveProduct } from "@/lib/types";
import { cn } from "@/lib/utils";

type Row = LiveProduct & { active: boolean; enabled: boolean };
type Filter = "all" | "low" | "off" | "removed";

export function ProductsManager({ products, categories, isOwner }: { products: Row[]; categories: Category[]; isOwner: boolean }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [filter, setFilter] = useState<Filter>("all");
  const [editing, setEditing] = useState<Row | null>(null);
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);

  const shown = useMemo(() => {
    const base = q.trim() ? search(q, products, categories, 200) : products;
    return base
      .filter((p) => cat === "all" || p.categoryId === cat)
      .filter((p) =>
        filter === "removed" ? !p.active : !p.active ? false : filter === "low" ? p.available && p.stockLeft <= 5 : filter === "off" ? !p.available : true,
      );
  }, [q, products, categories, cat, filter]);

  const live = products.filter((p) => p.active);
  const counts = { low: live.filter((p) => p.available && p.stockLeft <= 5).length, off: live.filter((p) => !p.available).length, removed: products.length - live.length };

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Products & stock</h1>
          <p className="text-sm text-muted">Switch an item off the moment the shelf is empty. Shoppers see it straight away.</p>
        </div>
        {isOwner ? (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setImporting(true)}>
              <FileUp className="size-4" aria-hidden /> Import CSV
            </Button>
            <Button onClick={() => setAdding(true)}>
              <Plus className="size-4" aria-hidden /> Add product
            </Button>
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 rounded-2xl bg-surface p-3 ring-1 ring-border md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <label className="flex h-11 items-center gap-2 rounded-xl bg-surface-2 px-3 focus-within:ring-2 focus-within:ring-primary">
          <Search className="size-5 text-muted" aria-hidden />
          <span className="sr-only">Search products</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, brand or Hindi name" className="h-full min-w-0 flex-1 bg-transparent outline-none" />
        </label>
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["all", "All"],
              ["low", `Low stock (${counts.low})`],
              ["off", `Unavailable (${counts.off})`],
              ["removed", `Removed (${counts.removed})`],
            ] as const
          ).map(([k, l]) => (
            <button
              key={k}
              aria-pressed={filter === k}
              onClick={() => setFilter(k)}
              className={cn(
                "h-10 cursor-pointer rounded-full px-3.5 text-sm font-bold ring-1 transition-colors",
                filter === k ? "bg-fg text-bg ring-fg" : "ring-border hover:bg-surface-2",
                k === "off" && counts.off && filter !== k && "text-danger",
              )}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="no-scrollbar -mx-3 flex gap-1.5 overflow-x-auto px-3 md:col-span-2">
          <CatChip active={cat === "all"} onClick={() => setCat("all")} label="All categories" />
          {categories.map((c) => (
            <CatChip key={c.id} active={cat === c.id} onClick={() => setCat(c.id)} label={c.name} />
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-surface ring-1 ring-border">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-bold">Product</th>
              <th className="px-3 py-3 text-right font-bold">Price</th>
              <th className="px-3 py-3 text-right font-bold">MRP</th>
              <th className="px-3 py-3 text-right font-bold">Stock</th>
              <th className="px-3 py-3 font-bold">On sale</th>
              <th className="px-3 py-3"><span className="sr-only">Edit</span></th>
            </tr>
          </thead>
          <tbody>
            {shown.map((p) => (
              <tr key={p.id} className="border-b border-border/70 last:border-0">
                <td className="px-4 py-2">
                  <div className="flex items-center gap-3">
                    <ProductArt icon={p.icon} tint={p.tint} dim={!p.available} className="w-10 shrink-0 rounded-lg" />
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{p.brand ? `${p.brand} ` : ""}{p.name}</p>
                      <p className="text-xs text-muted">
                        {p.unitLabel} · aisle {p.aisle} · HSN {p.hsn || "—"} · GST {p.gstRate}%
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2 text-right font-semibold tabular">
                  {rupees(p.price)}
                  {p.unitType === "weight" ? <span className="font-normal text-muted">/kg</span> : null}
                </td>
                <td className="px-3 py-2 text-right text-muted tabular">
                  {rupees(p.mrp)}
                  {discountPct(p.price, p.mrp) ? <span className="ml-1 text-xs text-accent">−{discountPct(p.price, p.mrp)}%</span> : null}
                </td>
                <td className="px-3 py-2 text-right tabular">
                  {p.stockLeft === 0 ? <Pill tone="bad">0</Pill> : p.stockLeft <= 5 ? <Pill tone="warn">{p.stockLeft}</Pill> : p.stockLeft}
                  <span className="ml-1 text-xs text-muted">{p.unitType === "weight" ? "kg" : ""}</span>
                </td>
                <td className="px-3 py-1">
                  {p.active ? (
                    <Switch
                      checked={p.enabled && p.stockLeft > 0}
                      label={`${p.name} on sale`}
                      onChange={async (v) => {
                        const r = await updateProductAction(p.id, v ? { available: true, stock: p.stockLeft || 10 } : { available: false });
                        if (!r.ok) toast.error(r.error);
                        else toast(v ? `${p.name} is back on sale` : `${p.name} hidden from shoppers`);
                      }}
                    />
                  ) : (
                    <Pill>Removed</Pill>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(p)} aria-label={`Edit ${p.name}`}>
                    <Pencil className="size-4" aria-hidden /> Edit
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!shown.length ? <p className="p-6 text-center text-muted">No products match.</p> : null}
      </div>

      {editing ? <EditSheet product={editing} isOwner={isOwner} onClose={() => setEditing(null)} /> : null}
      {adding ? <AddSheet categories={categories} onClose={() => setAdding(false)} /> : null}
      {importing ? <ImportSheet onClose={() => setImporting(false)} /> : null}
    </div>
  );
}

function CatChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      aria-pressed={active}
      onClick={onClick}
      className={cn("h-9 shrink-0 cursor-pointer rounded-lg px-3 text-sm font-semibold transition-colors", active ? "bg-primary-soft text-primary" : "text-muted hover:bg-surface-2")}
    >
      {label}
    </button>
  );
}

const toPaise = (v: string) => Math.round(Number(v) * 100);

function EditSheet({ product: p, isOwner, onClose }: { product: Row; isOwner: boolean; onClose: () => void }) {
  const [price, setPrice] = useState(String(p.price / 100));
  const [mrp, setMrp] = useState(String(p.mrp / 100));
  const [stock, setStock] = useState(String(p.stockLeft));
  const [aisle, setAisle] = useState(String(p.aisle));
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    const r = await updateProductAction(p.id, isOwner ? { price: toPaise(price), mrp: toPaise(mrp), stock: Number(stock), aisle: Number(aisle) } : { stock: Number(stock), aisle: Number(aisle) });
    setBusy(false);
    if (!r.ok) return toast.error(r.error);
    toast.success(`${p.name} updated`);
    onClose();
  };
  const setActive = async (active: boolean) => {
    const r = await updateProductAction(p.id, { active });
    if (!r.ok) return toast.error(r.error);
    toast(active ? `${p.name} restored` : `${p.name} removed from the shop`);
    onClose();
  };

  return (
    <Sheet
      open
      onOpenChange={(v) => !v && onClose()}
      title={`Edit ${p.brand ? `${p.brand} ` : ""}${p.name}`}
      description={`${p.unitLabel}. Price changes apply to new orders only.`}
      footer={
        <div className="grid gap-2">
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={save} disabled={busy}>
              Save
            </Button>
          </div>
          {isOwner ? (
            <Button variant="ghost" size="sm" className={p.active ? "text-danger" : "text-primary"} onClick={() => setActive(!p.active)}>
              {p.active ? "Remove from the shop" : "Restore to the shop"}
            </Button>
          ) : null}
        </div>
      }
    >
      <form
        className="grid gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        {isOwner ? (
          <div className="grid grid-cols-2 gap-3">
            <Field id="ed-price" label={p.unitType === "weight" ? "Price per kg" : "Selling price"} prefix="₹" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
            <Field id="ed-mrp" label={p.unitType === "weight" ? "MRP per kg" : "MRP"} prefix="₹" inputMode="decimal" value={mrp} onChange={(e) => setMrp(e.target.value)} />
          </div>
        ) : (
          <p className="rounded-lg bg-surface-2 px-3 py-2 text-sm text-muted">Only the owner can change prices.</p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field id="ed-stock" label={p.unitType === "weight" ? "Stock (kg)" : "Stock (packs)"} inputMode="numeric" value={stock} onChange={(e) => setStock(e.target.value.replace(/\D/g, ""))} />
          <Field id="ed-aisle" label="Aisle" inputMode="numeric" value={aisle} onChange={(e) => setAisle(e.target.value.replace(/\D/g, ""))} />
        </div>
        <p className="text-sm text-muted">Approximate stock is fine. Counter sales aren't tracked, so switch items off when the shelf is empty.</p>
        <button type="submit" hidden />
      </form>
    </Sheet>
  );
}

function AddSheet({ categories, onClose }: { categories: Category[]; onClose: () => void }) {
  const [f, setF] = useState({ name: "", nameHi: "", brand: "", categoryId: categories[0]?.id ?? "", unitType: "piece" as "piece" | "weight", unitLabel: "", price: "", mrp: "", hsn: "", gstRate: "5", aisle: "1", stock: "10", aliases: "" });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  const save = async () => {
    setBusy(true);
    const r = await createProductAction({
      name: f.name,
      nameHi: f.nameHi,
      brand: f.brand || undefined,
      categoryId: f.categoryId,
      unitType: f.unitType,
      unitLabel: f.unitType === "weight" ? "per kg" : f.unitLabel,
      price: toPaise(f.price),
      mrp: toPaise(f.mrp || f.price),
      hsn: f.hsn,
      gstRate: Number(f.gstRate),
      aisle: Number(f.aisle) || 1,
      stock: Number(f.stock) || 0,
      aliases: f.aliases.split(",").map((s) => s.trim()).filter(Boolean),
    });
    setBusy(false);
    if (!r.ok) return toast.error(r.error);
    toast.success(`${f.name} added to the shop`);
    onClose();
  };

  const select = "h-12 w-full rounded-xl border border-border bg-surface px-3 text-base";
  return (
    <Sheet
      open
      onOpenChange={(v) => !v && onClose()}
      title="Add a product"
      description="It appears in the shop as soon as you save."
      footer={
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={busy || f.name.trim().length < 2 || !f.price}>
            Add product
          </Button>
        </div>
      }
    >
      <div className="grid gap-3">
        <Field id="np-name" label="Name" value={f.name} onChange={set("name")} placeholder="e.g. Toor Dal (Loose)" />
        <div className="grid grid-cols-2 gap-3">
          <Field id="np-brand" label="Brand (optional)" value={f.brand} onChange={set("brand")} />
          <Field id="np-hi" label="Hindi name (optional)" value={f.nameHi} onChange={set("nameHi")} lang="hi" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-1.5 text-sm font-semibold">
            Category
            <select className={select} value={f.categoryId} onChange={set("categoryId")}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-semibold">
            Sold as
            <select className={select} value={f.unitType} onChange={set("unitType")}>
              <option value="piece">Packs or pieces</option>
              <option value="weight">Loose, by weight</option>
            </select>
          </label>
        </div>
        {f.unitType === "piece" ? <Field id="np-unit" label="Pack size" value={f.unitLabel} onChange={set("unitLabel")} placeholder="e.g. 1 kg, 500 ml, 6 pcs" /> : null}
        <div className="grid grid-cols-2 gap-3">
          <Field id="np-price" label={f.unitType === "weight" ? "Price per kg" : "Selling price"} prefix="₹" inputMode="decimal" value={f.price} onChange={set("price")} />
          <Field id="np-mrp" label="MRP" prefix="₹" inputMode="decimal" value={f.mrp} onChange={set("mrp")} hint="Leave empty if same as price" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field id="np-hsn" label="HSN code" inputMode="numeric" value={f.hsn} onChange={set("hsn")} />
          <label className="grid gap-1.5 text-sm font-semibold">
            GST
            <select className={select} value={f.gstRate} onChange={set("gstRate")}>
              {[0, 5, 12, 18, 40].map((g) => (
                <option key={g} value={g}>
                  {g}%
                </option>
              ))}
            </select>
          </label>
          <Field id="np-stock" label="Stock" inputMode="numeric" value={f.stock} onChange={set("stock")} />
        </div>
        <Field id="np-aliases" label="Other names shoppers type (optional)" value={f.aliases} onChange={set("aliases")} placeholder="e.g. arhar, tuvar, daal" hint="Separate with commas. Helps search find it." />
      </div>
    </Sheet>
  );
}

const SAMPLE_CSV = `name,name_hi,brand,category,unit_type,unit,price,mrp,hsn,gst,aisle,stock,aliases
Toor Dal (Loose),तूर दाल,,atta-rice-dal,weight,,150,170,0713,0,3,50,arhar;tuvar;daal
Classic Basmati Rice,बासमती चावल,India Gate,atta-rice-dal,piece,1 kg,175,210,1006,5,3,20,chawal;basmati`;

function ImportSheet({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ created: number; updated: number; errors: string[] } | null>(null);

  const run = async () => {
    setBusy(true);
    const r = await importProductsAction(text);
    setBusy(false);
    if (!r.ok) return toast.error(r.error);
    setResult(r.value);
    toast.success(`${r.value.created} added, ${r.value.updated} updated`);
  };

  return (
    <Sheet
      open
      onOpenChange={(v) => !v && onClose()}
      title="Import products from a spreadsheet"
      description="In Excel or Google Sheets, use these columns, then File → Download → CSV. Prices in rupees. Matching products are updated, new ones added."
      footer={
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={onClose}>
            {result ? "Done" : "Cancel"}
          </Button>
          <Button onClick={run} disabled={busy || !text.trim()}>
            {busy ? "Importing…" : "Import"}
          </Button>
        </div>
      }
    >
      <div className="grid gap-3">
        <pre className="overflow-x-auto rounded-lg bg-surface-2 p-3 text-xs">{SAMPLE_CSV}</pre>
        <p className="text-sm text-muted">
          Category can be the name (Atta, Rice & Dal) or its short id. Use <code>weight</code> for loose items and leave unit empty; price is then per kg.
        </p>
        <label className="grid gap-1.5 text-sm font-semibold">
          Choose the CSV file
          <input
            type="file"
            accept=".csv,text/csv"
            className="text-sm"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) setText(await file.text());
            }}
          />
        </label>
        <label className="grid gap-1.5 text-sm font-semibold">
          …or paste it here
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} className="rounded-xl border border-border bg-surface p-3 font-mono text-xs" />
        </label>
        {result?.errors.length ? (
          <div className="rounded-xl bg-danger-soft p-3 text-sm text-danger" role="alert">
            <p className="font-bold">{result.errors.length} rows were skipped:</p>
            <ul className="mt-1 list-disc pl-5">
              {result.errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </Sheet>
  );
}
