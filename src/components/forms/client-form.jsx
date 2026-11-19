"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient, updateClient } from "@/lib/actions/clients";
import { INDIAN_STATES } from "@/lib/gst";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
const TYPES = [{
  value: "individual",
  label: "Individual"
}, {
  value: "firm",
  label: "Partnership firm"
}, {
  value: "company",
  label: "Company"
}, {
  value: "llp",
  label: "LLP"
}, {
  value: "trust",
  label: "Trust"
}, {
  value: "other",
  label: "Other"
}];
export function ClientForm({
  defaultValues,
  clientId
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState(defaultValues?.type ?? "individual");
  const [state, setState] = useState(defaultValues?.state ?? "");
  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const input = {
      name: String(fd.get("name")),
      type: type,
      pan: String(fd.get("pan") ?? ""),
      gstin: String(fd.get("gstin") ?? ""),
      email: String(fd.get("email") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      addressLine: String(fd.get("addressLine") ?? ""),
      city: String(fd.get("city") ?? ""),
      state,
      pincode: String(fd.get("pincode") ?? ""),
      notes: String(fd.get("notes") ?? "")
    };
    try {
      if (clientId) {
        await updateClient(clientId, input);
        toast.success("Client updated");
        router.push(`/clients/${clientId}`);
      } else {
        const {
          id
        } = await createClient(input);
        toast.success("Client created");
        router.push(`/clients/${id}`);
      }
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }
  const dv = {
    name: defaultValues?.name ?? "",
    pan: defaultValues?.pan ?? "",
    gstin: defaultValues?.gstin ?? "",
    email: defaultValues?.email ?? "",
    phone: defaultValues?.phone ?? "",
    addressLine: defaultValues?.addressLine ?? "",
    city: defaultValues?.city ?? "",
    pincode: defaultValues?.pincode ?? "",
    notes: defaultValues?.notes ?? ""
  };
  return <form onSubmit={onSubmit} className="grid max-w-2xl gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="name">Client name *</Label>
          <Input id="name" name="name" required defaultValue={dv.name} />
        </div>
        <div className="grid gap-2">
          <Label>Type</Label>
          <Select value={type} onValueChange={v => v && setType(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPES.map(t => <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="pan">PAN</Label>
          <Input id="pan" name="pan" defaultValue={dv.pan} placeholder="AAAAA0000A" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="gstin">GSTIN</Label>
          <Input id="gstin" name="gstin" defaultValue={dv.gstin} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="state">State (for GST)</Label>
          <Select value={state} onValueChange={v => setState(v ?? "")}>
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
          <Input id="email" name="email" type="email" defaultValue={dv.email} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" defaultValue={dv.phone} />
        </div>
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="addressLine">Address</Label>
          <Input id="addressLine" name="addressLine" defaultValue={dv.addressLine} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="city">City</Label>
          <Input id="city" name="city" defaultValue={dv.city} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="pincode">Pincode</Label>
          <Input id="pincode" name="pincode" defaultValue={dv.pincode} />
        </div>
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" name="notes" defaultValue={dv.notes} rows={3} />
        </div>
      </div>
      <div>
        <Button type="submit" disabled={loading}>
          {loading ? "Saving…" : clientId ? "Save changes" : "Create client"}
        </Button>
      </div>
    </form>;
}
