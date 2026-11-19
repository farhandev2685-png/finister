"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { inviteMember } from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
export function InviteForm({
  canInvite
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState("member");
  if (!canInvite) return null;
  async function onSubmit(e) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    try {
      await inviteMember(String(fd.get("email")), role);
      toast.success("Invitation sent");
      e.target.reset();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to invite");
    } finally {
      setLoading(false);
    }
  }
  return <form onSubmit={onSubmit} className="flex max-w-lg items-end gap-2">
      <div className="grid flex-1 gap-2">
        <Input name="email" type="email" required placeholder="colleague@firm.com" />
      </div>
      <Select value={role} onValueChange={v => {
      if (v === "admin" || v === "member") setRole(v);
    }}>
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="member">Staff</SelectItem>
          <SelectItem value="admin">Manager</SelectItem>
        </SelectContent>
      </Select>
      <Button type="submit" disabled={loading}>
        {loading ? "Inviting…" : "Invite"}
      </Button>
    </form>;
}
