"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deletePayment } from "@/lib/actions/payments";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
export function PaymentRowActions({
  paymentId,
  canDelete
}) {
  const router = useRouter();
  if (!canDelete) return null;
  return <DropdownMenu>
      <DropdownMenuTrigger render={<Button size="icon" variant="ghost">
            <MoreHorizontal className="h-4 w-4" />
          </Button>} />
      <DropdownMenuContent align="end">
        <DropdownMenuItem className="text-destructive" onClick={async () => {
        if (!confirm("Delete this payment? The linked invoice balance will be restored.")) return;
        try {
          await deletePayment(paymentId);
          toast.success("Payment deleted");
          router.refresh();
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Failed");
        }
      }}>
          Delete payment
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>;
}
