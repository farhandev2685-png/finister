"use server";

import { z } from "zod";
import { eq, and, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/lib/db";
import { getCtx } from "@/lib/tenant";
import { newId } from "@/lib/id";
import { toPaise } from "@/lib/money";
import { computeGst } from "@/lib/gst";
import { financialYear } from "@/lib/fy";
import { log } from "./clients";
const itemSchema = z.object({
  description: z.string().min(1, "Description required"),
  sacCode: z.string().optional(),
  quantity: z.number().int().min(1).default(1),
  rate: z.string().min(1)
});
const invoiceSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  invoiceDate: z.string().min(1),
  dueDate: z.string().min(1),
  items: z.array(itemSchema).min(1, "Add at least one item"),
  notes: z.string().optional(),
  skipGst: z.boolean().default(false)
});

/** Atomically take the next number for (org, kind, fy). */
async function nextNumber(orgId, kind, fy) {
  const rows = await db.insert(schema.tenantCounter).values({
    id: newId(),
    organizationId: orgId,
    kind,
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
  return rows[0].value;
}
export async function createInvoice(input) {
  const ctx = await getCtx();
  const data = invoiceSchema.parse(input);
  const [cl, org] = await Promise.all([db.query.client.findFirst({
    where: and(eq(schema.client.id, data.clientId), eq(schema.client.organizationId, ctx.orgId))
  }), db.query.organization.findFirst({
    where: eq(schema.organization.id, ctx.orgId)
  })]);
  if (!cl || !org) throw new Error("Invalid client");
  const subtotal = data.items.reduce((acc, it) => acc + toPaise(it.rate) * BigInt(it.quantity), BigInt(0));
  const gst = data.skipGst ? {
    cgst: BigInt(0),
    sgst: BigInt(0),
    igst: BigInt(0)
  } : computeGst(subtotal, org.state, cl.state);
  const total = subtotal + gst.cgst + gst.sgst + gst.igst;
  const invoiceDate = new Date(data.invoiceDate);
  const fy = financialYear(invoiceDate);
  const seq = await nextNumber(ctx.orgId, "invoice", fy);
  const invoiceNo = `${org.invoicePrefix}/${fy}/${String(seq).padStart(3, "0")}`;
  const id = newId();
  await db.insert(schema.invoice).values({
    id,
    organizationId: ctx.orgId,
    clientId: data.clientId,
    invoiceNo,
    fy,
    invoiceDate,
    dueDate: new Date(data.dueDate),
    subtotalPaise: subtotal,
    cgstPaise: gst.cgst,
    sgstPaise: gst.sgst,
    igstPaise: gst.igst,
    totalPaise: total,
    status: "sent",
    placeOfSupply: cl.state,
    notes: data.notes
  });
  await db.insert(schema.invoiceItem).values(data.items.map(it => ({
    id: newId(),
    invoiceId: id,
    description: it.description,
    sacCode: it.sacCode,
    quantity: it.quantity,
    ratePaise: toPaise(it.rate),
    amountPaise: toPaise(it.rate) * BigInt(it.quantity)
  })));
  await log(ctx, "create", "invoice", id, `${invoiceNo} · ${cl.name}`);
  revalidatePath("/invoices");
  revalidatePath(`/clients/${data.clientId}`);
  return {
    id,
    invoiceNo
  };
}
export async function cancelInvoice(id) {
  const ctx = await getCtx();
  await db.update(schema.invoice).set({
    status: "cancelled",
    updatedAt: new Date()
  }).where(and(eq(schema.invoice.id, id), eq(schema.invoice.organizationId, ctx.orgId)));
  await log(ctx, "cancel", "invoice", id);
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
}

/** Sum of payment credits (received + TDS) against an invoice. */
export async function invoiceCreditedPaise(invoiceId) {
  const rows = await db.select({
    credited: sql`coalesce(sum(${schema.payment.amountReceivedPaise} + ${schema.payment.tdsDeductedPaise}), 0)`
  }).from(schema.payment).where(eq(schema.payment.invoiceId, invoiceId));
  return BigInt(rows[0]?.credited ?? "0");
}
export async function refreshInvoiceStatus(invoiceId) {
  const inv = await db.query.invoice.findFirst({
    where: eq(schema.invoice.id, invoiceId)
  });
  if (!inv || inv.status === "cancelled" || inv.status === "draft") return;
  const credited = await invoiceCreditedPaise(invoiceId);
  const status = credited >= inv.totalPaise ? "paid" : credited > BigInt(0) ? "partial" : "sent";
  if (status !== inv.status) {
    await db.update(schema.invoice).set({
      status,
      updatedAt: new Date()
    }).where(eq(schema.invoice.id, invoiceId));
  }
}
