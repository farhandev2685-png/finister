"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createInvoice } from "@/lib/actions/invoices";
import { formatINR } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
const emptyItem = {
  description: "",
  sacCode: "998221",
  quantity: 1,
  rate: ""
};
function isoDate(d) {
  return d.toISOString().slice(0, 10);
}
export function InvoiceForm({
  clients,
  firmState,
  defaultClientId
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [clientId, setClientId] = useState(defaultClientId ?? "");
  const [skipGst, setSkipGst] = useState(false);
  const [items, setItems] = useState([{
    ...emptyItem
  }]);
  const [today] = useState(() => isoDate(new Date()));
  const [defaultDue] = useState(() => isoDate(new Date(Date.now() + 15 * 86400000)));
  const client = clients.find(c => c.id === clientId);
  const {
    subtotal,
    cgst,
    sgst,
    igst,
    total
  } = useMemo(() => {
    const sub = items.reduce((acc, it) => acc + (parseFloat(it.rate) || 0) * (it.quantity || 1), 0);
    const gst = skipGst ? 0 : sub * 0.18;
    const intra = firmState && client?.state && firmState === client.state;
    return {
      subtotal: sub,
      cgst: intra ? gst / 2 : 0,
      sgst: intra ? gst / 2 : 0,
      igst: intra ? 0 : gst,
      total: sub + gst
    };
  }, [items, skipGst, firmState, client]);
  const inr = n => formatINR(Math.round(n * 100));
  function setItem(i, patch) {
    setItems(prev => prev.map((it, idx) => idx === i ? {
      ...it,
      ...patch
    } : it));
  }
  async function onSubmit(e) {
    e.preventDefault();
    if (!clientId) {
      toast.error("Select a client");
      return;
    }
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    try {
      const {
        invoiceNo
      } = await createInvoice({
        clientId,
        invoiceDate: String(fd.get("invoiceDate")),
        dueDate: String(fd.get("dueDate")),
        notes: String(fd.get("notes") ?? ""),
        skipGst,
        items: items.filter(it => it.description && it.rate).map(it => ({
          description: it.description,
          sacCode: it.sacCode,
          quantity: it.quantity,
          rate: it.rate
        }))
      });
      toast.success(`Invoice ${invoiceNo} created`);
      router.push("/invoices");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create invoice");
      setLoading(false);
    }
  }
  return <form onSubmit={onSubmit} className="grid max-w-3xl gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="grid gap-2 sm:col-span-1">
          <Label>Client *</Label>
          <Select value={clientId} onValueChange={v => setClientId(v ?? "")}>
            <SelectTrigger>
              <SelectValue placeholder="Select client" />
            </SelectTrigger>
            <SelectContent>
              {clients.map(c => <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="invoiceDate">Invoice date *</Label>
          <Input id="invoiceDate" name="invoiceDate" type="date" required defaultValue={today} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="dueDate">Due date *</Label>
          <Input id="dueDate" name="dueDate" type="date" required defaultValue={defaultDue} />
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <Label>Line items</Label>
          <Button type="button" size="sm" variant="outline" onClick={() => setItems(p => [...p, {
          ...emptyItem
        }])}>
            <Plus className="mr-1 h-4 w-4" /> Add item
          </Button>
        </div>
        <div className="space-y-2">
          {items.map((it, i) => <div key={i} className="grid grid-cols-[1fr_110px_80px_140px_40px] items-end gap-2">
              <div className="grid gap-1">
                {i === 0 && <span className="text-xs text-muted-foreground">Description</span>}
                <Input value={it.description} onChange={e => setItem(i, {
              description: e.target.value
            })} placeholder="Professional fees — GSTR-3B (Oct 2026)" required />
              </div>
              <div className="grid gap-1">
                {i === 0 && <span className="text-xs text-muted-foreground">SAC</span>}
                <Input value={it.sacCode} onChange={e => setItem(i, {
              sacCode: e.target.value
            })} />
              </div>
              <div className="grid gap-1">
                {i === 0 && <span className="text-xs text-muted-foreground">Qty</span>}
                <Input type="number" min={1} value={it.quantity} onChange={e => setItem(i, {
              quantity: parseInt(e.target.value) || 1
            })} />
              </div>
              <div className="grid gap-1">
                {i === 0 && <span className="text-xs text-muted-foreground">Rate (₹)</span>}
                <Input inputMode="decimal" value={it.rate} onChange={e => setItem(i, {
              rate: e.target.value
            })} placeholder="0.00" required />
              </div>
              <Button type="button" size="icon" variant="ghost" disabled={items.length === 1} onClick={() => setItems(p => p.filter((_, idx) => idx !== i))}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>)}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox id="skipGst" checked={skipGst} onCheckedChange={v => setSkipGst(v === true)} />
        <Label htmlFor="skipGst" className="font-normal">
          No GST on this invoice (e.g. exempt / composition)
        </Label>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={2} />
      </div>

      <div className="ml-auto w-72 space-y-1 rounded-md border p-4 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{inr(subtotal)}</span>
        </div>
        {cgst > 0 && <>
            <div className="flex justify-between">
              <span className="text-muted-foreground">CGST 9%</span>
              <span>{inr(cgst)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">SGST 9%</span>
              <span>{inr(sgst)}</span>
            </div>
          </>}
        {igst > 0 && <div className="flex justify-between">
            <span className="text-muted-foreground">IGST 18%</span>
            <span>{inr(igst)}</span>
          </div>}
        <div className="flex justify-between border-t pt-1 font-semibold">
          <span>Total</span>
          <span>{inr(total)}</span>
        </div>
      </div>

      <div>
        <Button type="submit" disabled={loading}>
          {loading ? "Creating…" : "Create invoice"}
        </Button>
      </div>
    </form>;
}
