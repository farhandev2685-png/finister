"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cancelInvoice } from "@/lib/actions/invoices";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
export function InvoiceActions({
  invoiceId,
  status
}) {
  const router = useRouter();
  return <DropdownMenu>
      <DropdownMenuTrigger render={<Button size="sm" variant="outline">
            <MoreHorizontal className="h-4 w-4" />
          </Button>} />
      <DropdownMenuContent align="end">
        {status !== "cancelled" && <DropdownMenuItem className="text-destructive" onClick={async () => {
        await cancelInvoice(invoiceId);
        toast.success("Invoice cancelled");
        router.refresh();
      }}>
            Cancel invoice
          </DropdownMenuItem>}
      </DropdownMenuContent>
    </DropdownMenu>;
}
