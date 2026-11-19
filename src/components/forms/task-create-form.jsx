"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createTask } from "@/lib/actions/tasks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
export function TaskCreateForm({
  clients,
  staff
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clientId, setClientId] = useState("");
  const [assignee, setAssignee] = useState("");
  async function onSubmit(e) {
    e.preventDefault();
    if (!clientId) {
      toast.error("Select a client");
      return;
    }
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    try {
      await createTask({
        clientId,
        title: String(fd.get("title")),
        dueDate: String(fd.get("dueDate")),
        period: String(fd.get("period") ?? ""),
        assignedToId: assignee || undefined
      });
      toast.success("Task created");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }
  return <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline">
            <Plus className="mr-1 h-4 w-4" /> Add task
          </Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manual task</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-2">
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
            <Label htmlFor="title">Task *</Label>
            <Input id="title" name="title" required placeholder="e.g. GSTR-9 annual return" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="dueDate">Due date *</Label>
              <Input id="dueDate" name="dueDate" type="date" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="period">Period</Label>
              <Input id="period" name="period" placeholder="Oct 2026" />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Assign to</Label>
            <Select value={assignee} onValueChange={v => setAssignee(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                {staff.map(s => <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? "Creating…" : "Create task"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>;
}
