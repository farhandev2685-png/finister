"use server";

import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/lib/db";
import { getCtx } from "@/lib/tenant";
import { newId } from "@/lib/id";
import { financialYear } from "@/lib/fy";
import { tasksForCategory } from "@/lib/compliance";
import { log } from "./clients";
export async function updateTaskStatus(id, status) {
  const ctx = await getCtx();
  await db.update(schema.complianceTask).set({
    status,
    completedAt: status === "completed" ? new Date() : null
  }).where(and(eq(schema.complianceTask.id, id), eq(schema.complianceTask.organizationId, ctx.orgId)));
  revalidatePath("/compliance");
}
export async function assignTask(id, userId) {
  const ctx = await getCtx();
  await db.update(schema.complianceTask).set({
    assignedToId: userId
  }).where(and(eq(schema.complianceTask.id, id), eq(schema.complianceTask.organizationId, ctx.orgId)));
  revalidatePath("/compliance");
}
const manualTaskSchema = z.object({
  clientId: z.string().min(1),
  title: z.string().min(1),
  dueDate: z.string().min(1),
  period: z.string().optional(),
  assignedToId: z.string().optional()
});
export async function createTask(input) {
  const ctx = await getCtx();
  const data = manualTaskSchema.parse(input);
  const id = newId();
  await db.insert(schema.complianceTask).values({
    id,
    organizationId: ctx.orgId,
    clientId: data.clientId,
    title: data.title,
    dueDate: new Date(data.dueDate),
    period: data.period,
    assignedToId: data.assignedToId || null
  });
  await log(ctx, "create", "task", id, data.title);
  revalidatePath("/compliance");
  return {
    id
  };
}

/** Backfill tasks for every active engagement for the given FY (skips dupes by title+client+period). */
export async function generateTasksForFy(fy) {
  const ctx = await getCtx();
  const targetFy = fy ?? financialYear(new Date());
  const engagements = await db.query.engagement.findMany({
    where: and(eq(schema.engagement.organizationId, ctx.orgId), eq(schema.engagement.isActive, true)),
    with: {
      service: true,
      client: true
    }
  });
  const existing = await db.query.complianceTask.findMany({
    where: eq(schema.complianceTask.organizationId, ctx.orgId),
    columns: {
      clientId: true,
      title: true,
      period: true
    }
  });
  const seen = new Set(existing.map(t => `${t.clientId}|${t.title}|${t.period}`));
  const rows = [];
  for (const e of engagements) {
    for (const t of tasksForCategory(e.service.category, targetFy)) {
      const key = `${e.clientId}|${t.title}|${t.period}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({
        id: newId(),
        organizationId: ctx.orgId,
        clientId: e.clientId,
        engagementId: e.id,
        title: t.title,
        dueDate: t.dueDate,
        period: t.period,
        assignedToId: e.client.assignedToId
      });
    }
  }
  if (rows.length) await db.insert(schema.complianceTask).values(rows);
  await log(ctx, "generate", "task", undefined, `${rows.length} tasks for FY ${targetFy}`);
  revalidatePath("/compliance");
  return {
    created: rows.length
  };
}
