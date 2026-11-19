"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createService, setServiceActive } from "@/lib/actions/services";
import { SAC_CODES } from "@/lib/gst";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
const CATEGORIES = [{
  value: "gst",
  label: "GST returns"
}, {
  value: "itr",
  label: "Income tax / ITR"
}, {
  value: "tds",
  label: "TDS"
}, {
  value: "audit",
  label: "Audit"
}, {
  value: "roc",
  label: "ROC / company law"
}, {
  value: "bookkeeping",
  label: "Bookkeeping"
}, {
  value: "advisory",
  label: "Advisory"
}, {
  value: "other",
  label: "Other"
}];
export function ServiceForm({
  canEdit
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState("other");
  const [sac, setSac] = useState("998221");
  if (!canEdit) return null;
  async function onSubmit(e) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    try {
      await createService({
        name: String(fd.get("name")),
        category: category,
        sacCode: sac,
        defaultFee: String(fd.get("defaultFee") ?? "0")
      });
      toast.success("Service added");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }
  return <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline">
            <Plus className="mr-1 h-4 w-4" /> Add service
          </Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New service</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Service name *</Label>
            <Input id="name" name="name" required placeholder="GSTR-3B monthly filing" />
          </div>
          <div className="grid gap-2">
            <Label>Category (drives compliance calendar)</Label>
            <Select value={category} onValueChange={v => setCategory(v ?? "other")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>SAC code</Label>
              <Select value={sac} onValueChange={v => setSac(v ?? "998221")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SAC_CODES.map(s => <SelectItem key={s.code} value={s.code}>
                      {s.code} — {s.label}
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="defaultFee">Default fee (₹)</Label>
              <Input id="defaultFee" name="defaultFee" inputMode="decimal" placeholder="0.00" />
            </div>
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? "Adding…" : "Add service"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>;
}
export function ServiceToggle({
  id,
  isActive,
  canEdit
}) {
  const router = useRouter();
  if (!canEdit) return null;
  return <Button size="sm" variant="ghost" onClick={async () => {
    await setServiceActive(id, !isActive);
    router.refresh();
  }}>
      {isActive ? "Disable" : "Enable"}
    </Button>;
}
