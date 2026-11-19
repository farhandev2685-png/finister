"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createEngagement } from "@/lib/actions/engagements";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
const FREQUENCIES = [{
  value: "one_time",
  label: "One-time"
}, {
  value: "monthly",
  label: "Monthly"
}, {
  value: "quarterly",
  label: "Quarterly"
}, {
  value: "half_yearly",
  label: "Half-yearly"
}, {
  value: "annual",
  label: "Annual"
}];
export function EngagementForm({
  clientId,
  services
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serviceId, setServiceId] = useState("");
  const [frequency, setFrequency] = useState("one_time");
  const [fee, setFee] = useState("");
  function onServiceChange(id) {
    setServiceId(id);
    const svc = services.find(s => s.id === id);
    if (svc && svc.defaultFee > 0) setFee(String(svc.defaultFee));
  }
  async function onSubmit(e) {
    e.preventDefault();
    if (!serviceId) {
      toast.error("Pick a service");
      return;
    }
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      await createEngagement({
        clientId,
        serviceId,
        fee,
        frequency: frequency,
        notes: String(fd.get("notes") ?? "")
      });
      toast.success("Engagement added — compliance tasks generated where applicable");
      setOpen(false);
      setServiceId("");
      setFee("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }
  return <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline">
            <Plus className="mr-1 h-4 w-4" /> Add engagement
          </Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New engagement</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label>Service</Label>
            <Select value={serviceId} onValueChange={v => v && onServiceChange(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select service" />
              </SelectTrigger>
              <SelectContent>
                {services.map(s => <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Frequency</Label>
              <Select value={frequency} onValueChange={v => setFrequency(v ?? "one_time")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map(f => <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="fee">Fee (₹)</Label>
              <Input id="fee" inputMode="decimal" value={fee} onChange={e => setFee(e.target.value)} placeholder="0.00" />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={2} />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? "Adding…" : "Add engagement"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>;
}
