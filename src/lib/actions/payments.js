"use server";

import { z } from "zod";
import { eq, and, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/lib/db";
import { getCtx, requireAdmin } from "@/lib/tenant";
import { newId } from "@/lib/id";
import { toPaise } from "@/lib/money";
import { financialYear } from "@/lib/fy";
import { log } from "./clients";
import { refreshInvoiceStatus } from "./invoices";
const paymentSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  invoiceId: z.string().optional(),
  paymentDate: z.string().min(1),
  amountReceived: z.string().min(1, "Amount is required"),
  tdsDeducted: z.string().optional(),
  tdsSection: z.string().optional(),
  mode: z.enum(["upi", "neft", "rtgs", "imps", "cheque", "cash", "other"]),
  referenceNo: z.string().optional(),
  notes: z.string().optional()
});
async function nextReceiptNo(orgId, fy, prefix) {
  const rows = await db.insert(schema.tenantCounter).values({
    id: newId(),
    organizationId: orgId,
    kind: "receipt",
    fy,
    value: 1
  }).onConflictDoUpdate({
    target: [schema.tenantCounter.organizationId, schema.tenantCounter.kind, schema.tenantCounter.fy],
    set: {
      value: sql`${schema.tenantCounter.value} + 1`
    }
  }).returning({
    value: schema.tenantCounter.value
  });
  return `${prefix}/${fy}/${String(rows[0].value).padStart(3, "0")}`;
}
export async function recordPayment(input) {
  const ctx = await getCtx();
  const data = paymentSchema.parse(input);
  const [cl, org] = await Promise.all([db.query.client.findFirst({
    where: and(eq(schema.client.id, data.clientId), eq(schema.client.organizationId, ctx.orgId))
  }), db.query.organization.findFirst({
    where: eq(schema.organization.id, ctx.orgId)
  })]);
  if (!cl || !org) throw new Error("Invalid client");
  if (data.invoiceId) {
    const inv = await db.query.invoice.findFirst({
      where: and(eq(schema.invoice.id, data.invoiceId), eq(schema.invoice.organizationId, ctx.orgId))
    });
    if (!inv) throw new Error("Invalid invoice");
  }
  const paymentDate = new Date(data.paymentDate);
  const fy = financialYear(paymentDate);
  const receiptNo = await nextReceiptNo(ctx.orgId, fy, org.receiptPrefix);
  const id = newId();
  await db.insert(schema.payment).values({
    id,
    organizationId: ctx.orgId,
    clientId: data.clientId,
    invoiceId: data.invoiceId || null,
    receiptNo,
    paymentDate,
    amountReceivedPaise: toPaise(data.amountReceived),
    tdsDeductedPaise: toPaise(data.tdsDeducted || "0"),
    tdsSection: data.tdsSection || "194J",
    mode: data.mode,
    referenceNo: data.referenceNo,
    notes: data.notes
  });
  if (data.invoiceId) await refreshInvoiceStatus(data.invoiceId);
  await log(ctx, "create", "payment", id, `${receiptNo} · ${cl.name}`);
  revalidatePath("/payments");
  revalidatePath("/invoices");
  revalidatePath(`/clients/${data.clientId}`);
  return {
    id,
    receiptNo
  };
}
export async function deletePayment(id) {
  const ctx = await getCtx();
  requireAdmin(ctx);
  const p = await db.query.payment.findFirst({
    where: and(eq(schema.payment.id, id), eq(schema.payment.organizationId, ctx.orgId))
  });
  if (!p) throw new Error("Payment not found");
  await db.delete(schema.payment).where(eq(schema.payment.id, id));
  if (p.invoiceId) await refreshInvoiceStatus(p.invoiceId);
  await log(ctx, "delete", "payment", id, p.receiptNo ?? undefined);
  revalidatePath("/payments");
  revalidatePath("/invoices");
}
