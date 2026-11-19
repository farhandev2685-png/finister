"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ClientForm } from "./client-form";
import { Pencil } from "lucide-react";
export function ClientEditDialog({
  clientId,
  defaultValues
}) {
  const [open, setOpen] = useState(false);
  return <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline">
            <Pencil className="mr-1 h-4 w-4" /> Edit
          </Button>} />
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit client</DialogTitle>
        </DialogHeader>
        <ClientForm clientId={clientId} defaultValues={defaultValues} />
      </DialogContent>
    </Dialog>;
}
