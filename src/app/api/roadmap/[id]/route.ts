// PM CONTROL TOWER — Roadmap item API (Command Center v3.0)
// PATCH  /api/roadmap/[id] — update status / progress / quarter
// DELETE /api/roadmap/[id]

import { z } from "zod";
import { db } from "@/lib/db";
import { withApi, ok, ApiError, parseBody } from "@/lib/api";
import { writeAudit } from "@/lib/audit";

const ROADMAP_STATUS = ["PLANNED", "COMMITTED", "IN_PROGRESS", "SHIPPED", "DEFERRED"] as const;

const updateSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  description: z.string().max(4000).optional().nullable(),
  quarter: z.string().min(4).max(10).optional(),
  status: z.enum(ROADMAP_STATUS).optional(),
  progress: z.coerce.number().min(0).max(100).optional(),
  releaseTag: z.string().max(60).optional().nullable(),
  projectId: z.string().nullable().optional(),
  orderIndex: z.coerce.number().int().optional(),
});

export const PATCH = withApi(async (ctx) => {
  const session = ctx.session!;
  const { id } = ctx.params;
  const body = await parseBody(ctx.req, updateSchema);
  const existing = await db.roadmapItem.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "Roadmap item not found");
  const updated = await db.roadmapItem.update({
    where: { id },
    data: { ...body, ...(body.status === "SHIPPED" ? { progress: 100 } : {}) },
  });
  await writeAudit({
    userId: session.id, userName: session.name, role: session.roles[0],
    action: "UPDATE", entityType: "RoadmapItem", entityId: id, entityName: updated.title,
    before: { status: existing.status, progress: existing.progress },
    after: { status: updated.status, progress: updated.progress }, ipAddress: ctx.ip,
  });
  return ok({ item: updated });
}, { permission: "product.manage", rateLimit: { limit: 120, windowMs: 60_000 } });

export const DELETE = withApi(async (ctx) => {
  const session = ctx.session!;
  const { id } = ctx.params;
  const existing = await db.roadmapItem.findUnique({ where: { id }, select: { id: true, title: true } });
  if (!existing) throw new ApiError(404, "Roadmap item not found");
  await db.roadmapItem.delete({ where: { id } });
  await writeAudit({
    userId: session.id, userName: session.name, role: session.roles[0],
    action: "DELETE", entityType: "RoadmapItem", entityId: id, entityName: existing.title, ipAddress: ctx.ip,
  });
  return ok({ deleted: true });
}, { permission: "product.manage", rateLimit: { limit: 120, windowMs: 60_000 } });
