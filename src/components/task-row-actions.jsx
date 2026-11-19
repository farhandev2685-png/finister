"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateTaskStatus, assignTask } from "@/lib/actions/tasks";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
export function TaskRowActions({
  taskId,
  status,
  staff,
  assignedToId
}) {
  const router = useRouter();
  return <DropdownMenu>
      <DropdownMenuTrigger render={<Button size="icon" variant="ghost">
            <MoreHorizontal className="h-4 w-4" />
          </Button>} />
      <DropdownMenuContent align="end">
        {status !== "completed" && <>
            <DropdownMenuItem onClick={async () => {
          await updateTaskStatus(taskId, "completed");
          toast.success("Task completed");
          router.refresh();
        }}>
              Mark completed
            </DropdownMenuItem>
            <DropdownMenuItem onClick={async () => {
          await updateTaskStatus(taskId, "in_progress");
          router.refresh();
        }}>
              Mark in progress
            </DropdownMenuItem>
          </>}
        {status === "completed" && <DropdownMenuItem onClick={async () => {
        await updateTaskStatus(taskId, "pending");
        router.refresh();
      }}>
            Reopen
          </DropdownMenuItem>}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Assign to</DropdownMenuLabel>
        {staff.map(s => <DropdownMenuItem key={s.id} onClick={async () => {
        await assignTask(taskId, s.id);
        router.refresh();
      }}>
            {s.name}
            {assignedToId === s.id ? " ✓" : ""}
          </DropdownMenuItem>)}
      </DropdownMenuContent>
    </DropdownMenu>;
}
