"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { recordPayment } from "@/lib/actions/payments";
import { formatINR } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
const MODES = [{
  value: "upi",
  label: "UPI"
}, {
  value: "neft",
  label: "NEFT"
}, {
  value: "rtgs",
  label: "RTGS"
}, {
  value: "imps",
  label: "IMPS"
}, {
  value: "cheque",
  label: "Cheque"
}, {
  value: "cash",
  label: "Cash"
}, {
  value: "other",
  label: "Other"
}];
const TDS_SECTIONS = ["194J", "194C", "194H", "194I", "None"];
function isoDate(d) {
  return d.toISOString().slice(0, 10);
}
export function PaymentForm({
  clients,
  openInvoices,
  defaultClientId,
  defaultInvoiceId
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [clientId, setClientId] = useState(defaultClientId ?? "");
  const [invoiceId, setInvoiceId] = useState(defaultInvoiceId ?? "");
  const [amount, setAmount] = useState("");
  const [tds, setTds] = useState("");
  const clientInvoices = useMemo(() => openInvoices.filter(i => i.clientId === clientId), [openInvoices, clientId]);
  const selectedInvoice = clientInvoices.find(i => i.id === invoiceId);
  function onInvoiceChange(id) {
    setInvoiceId(id);
    const inv = clientInvoices.find(i => i.id === id);
    if (inv && !amount) setAmount(String(inv.balancePaise / 100));
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
        receiptNo
      } = await recordPayment({
        clientId,
        invoiceId: invoiceId || undefined,
        paymentDate: String(fd.get("paymentDate")),
        amountReceived: amount,
        tdsDeducted: tds || "0",
        tdsSection: String(fd.get("tdsSection") ?? "194J"),
        mode: String(fd.get("mode")),
        referenceNo: String(fd.get("referenceNo") ?? ""),
        notes: String(fd.get("notes") ?? "")
      });
      toast.success(`Payment recorded — receipt ${receiptNo}`);
      router.push("/payments");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record payment");
      setLoading(false);
    }
  }
  return <form onSubmit={onSubmit} className="grid max-w-2xl gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label>Client *</Label>
          <Select value={clientId} onValueChange={v => {
          setClientId(v ?? "");
          setInvoiceId("");
        }}>
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
          <Label>Against invoice (optional)</Label>
          <Select value={invoiceId} onValueChange={v => v && onInvoiceChange(v)} disabled={!clientId}>
            <SelectTrigger>
              <SelectValue placeholder={clientInvoices.length ? "Select invoice" : "No open invoices"} />
            </SelectTrigger>
            <SelectContent>
              {clientInvoices.map(i => <SelectItem key={i.id} value={i.id}>
                  {i.invoiceNo} — {formatINR(i.balancePaise)}
                </SelectItem>)}
            </SelectContent>
          </Select>
          {selectedInvoice && <p className="text-xs text-muted-foreground">
              Balance on {selectedInvoice.invoiceNo}: {formatINR(selectedInvoice.balancePaise)}
            </p>}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="paymentDate">Payment date *</Label>
          <Input id="paymentDate" name="paymentDate" type="date" required defaultValue={isoDate(new Date())} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="mode">Mode *</Label>
          <Select name="mode" defaultValue="upi">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MODES.map(m => <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="amount">Amount received (₹) *</Label>
          <Input id="amount" inputMode="decimal" required value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 10620" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="tds">TDS deducted (₹)</Label>
          <Input id="tds" inputMode="decimal" value={tds} onChange={e => setTds(e.target.value)} placeholder="0" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="tdsSection">TDS section</Label>
          <Select name="tdsSection" defaultValue="194J">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TDS_SECTIONS.map(s => <SelectItem key={s} value={s}>
                  {s === "None" ? "No TDS" : `Section ${s}`}
                </SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="referenceNo">Reference / UTR / cheque no.</Label>
          <Input id="referenceNo" name="referenceNo" />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={2} />
      </div>
      <p className="text-sm text-muted-foreground">
        Credit applied to the invoice = amount received + TDS deducted. The TDS portion is tracked
        separately as receivable from the department.
      </p>
      <div>
        <Button type="submit" disabled={loading}>
          {loading ? "Recording…" : "Record payment"}
        </Button>
      </div>
    </form>;
}
