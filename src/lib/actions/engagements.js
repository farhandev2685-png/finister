"use server";

import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/lib/db";
import { getCtx } from "@/lib/tenant";
import { newId } from "@/lib/id";
import { toPaise } from "@/lib/money";
import { financialYear } from "@/lib/fy";
import { tasksForCategory } from "@/lib/compliance";
import { log } from "./clients";
const engagementSchema = z.object({
  clientId: z.string().min(1),
  serviceId: z.string().min(1),
  fee: z.string().optional(),
  frequency: z.enum(["one_time", "monthly", "quarterly", "half_yearly", "annual"]),
  notes: z.string().optional()
});
export async function createEngagement(input) {
  const ctx = await getCtx();
  const data = engagementSchema.parse(input);
  const [svc, cl] = await Promise.all([db.query.service.findFirst({
    where: and(eq(schema.service.id, data.serviceId), eq(schema.service.organizationId, ctx.orgId))
  }), db.query.client.findFirst({
    where: and(eq(schema.client.id, data.clientId), eq(schema.client.organizationId, ctx.orgId))
  })]);
  if (!svc || !cl) throw new Error("Invalid client or service");
  const id = newId();
  await db.insert(schema.engagement).values({
    id,
    organizationId: ctx.orgId,
    clientId: data.clientId,
    serviceId: data.serviceId,
    feePaise: toPaise(data.fee || "0"),
    frequency: data.frequency,
    notes: data.notes
  });

  // Auto-generate compliance tasks for the current FY
  const fy = financialYear(new Date());
  const generated = tasksForCategory(svc.category, fy);
  if (generated.length > 0) {
    await db.insert(schema.complianceTask).values(generated.map(t => ({
      id: newId(),
      organizationId: ctx.orgId,
      clientId: data.clientId,
      engagementId: id,
      title: t.title,
      dueDate: t.dueDate,
      period: t.period,
      assignedToId: cl.assignedToId
    })));
  }
  await log(ctx, "create", "engagement", id, `${svc.name} → ${cl.name}`);
  revalidatePath(`/clients/${data.clientId}`);
  revalidatePath("/compliance");
  return {
    id
  };
}
export async function setEngagementActive(id, isActive) {
  const ctx = await getCtx();
  await db.update(schema.engagement).set({
    isActive
  }).where(and(eq(schema.engagement.id, id), eq(schema.engagement.organizationId, ctx.orgId)));
  revalidatePath("/compliance");
}
