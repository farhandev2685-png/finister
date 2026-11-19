"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { db, schema } from "@/lib/db";
import { getCtx, requireAdmin } from "@/lib/tenant";
import { auth } from "@/lib/auth";
import { log } from "./clients";
const firmSchema = z.object({
  name: z.string().min(1),
  gstin: z.string().optional(),
  pan: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  addressLine: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  invoicePrefix: z.string().optional(),
  receiptPrefix: z.string().optional(),
  bankDetails: z.string().optional()
});
export async function updateFirmProfile(input) {
  const ctx = await getCtx();
  requireAdmin(ctx);
  const data = firmSchema.parse(input);
  await db.update(schema.organization).set({
    gstin: data.gstin,
    pan: data.pan,
    email: data.email,
    phone: data.phone,
    addressLine: data.addressLine,
    city: data.city,
    state: data.state,
    pincode: data.pincode,
    invoicePrefix: data.invoicePrefix || "INV",
    receiptPrefix: data.receiptPrefix || "RCP",
    bankDetails: data.bankDetails
  }).where(eq(schema.organization.id, ctx.orgId));
  await log(ctx, "update", "organization", ctx.orgId, data.name);
  revalidatePath("/settings");
}
export async function inviteMember(email, role) {
  const ctx = await getCtx();
  requireAdmin(ctx);
  await auth.api.createInvitation({
    body: {
      email,
      role,
      organizationId: ctx.orgId
    },
    headers: await headers()
  });
  await log(ctx, "invite", "member", undefined, email);
  revalidatePath("/settings");
}
