"use server";

import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/lib/db";
import { getCtx } from "@/lib/tenant";
import { newId } from "@/lib/id";
const clientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["individual", "firm", "company", "llp", "trust", "other"]),
  pan: z.string().optional(),
  gstin: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  addressLine: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  notes: z.string().optional()
});
export async function createClient(input) {
  const ctx = await getCtx();
  const data = clientSchema.parse(input);
  const id = newId();
  await db.insert(schema.client).values({
    id,
    organizationId: ctx.orgId,
    ...data
  });
  await log(ctx, "create", "client", id, data.name);
  revalidatePath("/clients");
  return {
    id
  };
}
export async function updateClient(id, input) {
  const ctx = await getCtx();
  const data = clientSchema.parse(input);
  await db.update(schema.client).set({
    ...data,
    updatedAt: new Date()
  }).where(and(eq(schema.client.id, id), eq(schema.client.organizationId, ctx.orgId)));
  await log(ctx, "update", "client", id, data.name);
  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
}
export async function updateClientAssignee(id, userId) {
  const ctx = await getCtx();
  await db.update(schema.client).set({
    assignedToId: userId,
    updatedAt: new Date()
  }).where(and(eq(schema.client.id, id), eq(schema.client.organizationId, ctx.orgId)));
  revalidatePath(`/clients/${id}`);
  revalidatePath("/clients");
}
export async function setClientActive(id, isActive) {
  const ctx = await getCtx();
  await db.update(schema.client).set({
    isActive,
    updatedAt: new Date()
  }).where(and(eq(schema.client.id, id), eq(schema.client.organizationId, ctx.orgId)));
  await log(ctx, isActive ? "activate" : "deactivate", "client", id);
  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
}
export async function log(ctx, action, entity, entityId, meta) {
  await db.insert(schema.activityLog).values({
    id: newId(),
    organizationId: ctx.orgId,
    userId: ctx.userId,
    action,
    entity,
    entityId,
    meta
  });
}
