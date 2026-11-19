"use server";

import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/lib/db";
import { getCtx } from "@/lib/tenant";
import { newId } from "@/lib/id";
import { toPaise } from "@/lib/money";
import { log } from "./clients";
const serviceSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.enum(["gst", "itr", "tds", "audit", "roc", "bookkeeping", "advisory", "other"]),
  sacCode: z.string().optional(),
  defaultFee: z.string().optional()
});
export async function createService(input) {
  const ctx = await getCtx();
  const data = serviceSchema.parse(input);
  const id = newId();
  await db.insert(schema.service).values({
    id,
    organizationId: ctx.orgId,
    name: data.name,
    category: data.category,
    sacCode: data.sacCode || "998221",
    defaultFeePaise: toPaise(data.defaultFee || "0")
  });
  await log(ctx, "create", "service", id, data.name);
  revalidatePath("/settings");
  return {
    id
  };
}
export async function setServiceActive(id, isActive) {
  const ctx = await getCtx();
  await db.update(schema.service).set({
    isActive
  }).where(and(eq(schema.service.id, id), eq(schema.service.organizationId, ctx.orgId)));
  revalidatePath("/settings");
}
