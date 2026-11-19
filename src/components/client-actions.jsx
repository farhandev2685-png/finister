"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setClientActive, updateClientAssignee } from "@/lib/actions/clients";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
export function ClientActions({
  clientId,
  isActive,
  staff,
  assignedToId
}) {
  const router = useRouter();
  return <DropdownMenu>
      <DropdownMenuTrigger render={<Button size="sm" variant="outline">
            <MoreHorizontal className="h-4 w-4" />
          </Button>} />
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Assign to</DropdownMenuLabel>
        {staff.map(s => <DropdownMenuItem key={s.id} onClick={async () => {
        await updateClientAssignee(clientId, s.id);
        toast.success(`Assigned to ${s.name}`);
        router.refresh();
      }}>
            {s.name}
            {assignedToId === s.id ? " ✓" : ""}
          </DropdownMenuItem>)}
        <DropdownMenuItem onClick={async () => {
        await updateClientAssignee(clientId, null);
        router.refresh();
      }}>
          Unassigned
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={async () => {
        await setClientActive(clientId, !isActive);
        toast.success(isActive ? "Client deactivated" : "Client activated");
        router.refresh();
      }}>
          {isActive ? "Deactivate client" : "Activate client"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>;
}
