"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateFirmProfile } from "@/lib/actions/settings";
import { INDIAN_STATES } from "@/lib/gst";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
export function FirmForm({
  defaultValues,
  canEdit
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState(defaultValues.state ?? "");
  const dv = defaultValues;
  async function onSubmit(e) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    try {
      await updateFirmProfile({
        name: String(fd.get("name")),
        gstin: String(fd.get("gstin") ?? ""),
        pan: String(fd.get("pan") ?? ""),
        email: String(fd.get("email") ?? ""),
        phone: String(fd.get("phone") ?? ""),
        addressLine: String(fd.get("addressLine") ?? ""),
        city: String(fd.get("city") ?? ""),
        state,
        pincode: String(fd.get("pincode") ?? ""),
        invoicePrefix: String(fd.get("invoicePrefix") ?? "INV"),
        receiptPrefix: String(fd.get("receiptPrefix") ?? "RCP"),
        bankDetails: String(fd.get("bankDetails") ?? "")
      });
      toast.success("Firm profile saved");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }
  const ro = !canEdit;
  return <form onSubmit={onSubmit} className="grid max-w-2xl gap-4">
      <fieldset disabled={ro} className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="name">Firm name</Label>
          <Input id="name" name="name" required defaultValue={dv.name} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="pan">PAN</Label>
          <Input id="pan" name="pan" defaultValue={dv.pan ?? ""} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="gstin">GSTIN</Label>
          <Input id="gstin" name="gstin" defaultValue={dv.gstin ?? ""} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="state">State (drives CGST/SGST vs IGST)</Label>
          <Select value={state} onValueChange={v => setState(v ?? "")} disabled={ro}>
            <SelectTrigger>
              <SelectValue placeholder="Select state" />
            </SelectTrigger>
            <SelectContent>
              {INDIAN_STATES.map(s => <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" defaultValue={dv.email ?? ""} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" defaultValue={dv.phone ?? ""} />
        </div>
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="addressLine">Address</Label>
          <Input id="addressLine" name="addressLine" defaultValue={dv.addressLine ?? ""} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="city">City</Label>
          <Input id="city" name="city" defaultValue={dv.city ?? ""} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="pincode">Pincode</Label>
          <Input id="pincode" name="pincode" defaultValue={dv.pincode ?? ""} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="invoicePrefix">Invoice prefix</Label>
          <Input id="invoicePrefix" name="invoicePrefix" defaultValue={dv.invoicePrefix ?? "INV"} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="receiptPrefix">Receipt prefix</Label>
          <Input id="receiptPrefix" name="receiptPrefix" defaultValue={dv.receiptPrefix ?? "RCP"} />
        </div>
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="bankDetails">Bank details (shown on invoices)</Label>
          <Textarea id="bankDetails" name="bankDetails" rows={3} defaultValue={dv.bankDetails ?? ""} />
        </div>
      </fieldset>
      {canEdit && <div>
          <Button type="submit" disabled={loading}>
            {loading ? "Saving…" : "Save profile"}
          </Button>
        </div>}
    </form>;
}
