// PM CONTROL TOWER — Feedback detail API (Command Center v3.0)
// PATCH  /api/feedback/[id] — triage: status change, link to roadmap item
// DELETE /api/feedback/[id]

import { z } from "zod";
import { db } from "@/lib/db";
import { withApi, ok, ApiError, parseBody } from "@/lib/api";
import { writeAudit } from "@/lib/audit";

const FEEDBACK_STATUS = ["NEW", "UNDER_REVIEW", "PLANNED", "IN_PROGRESS", "SHIPPED", "DECLINED"] as const;

const updateSchema = z.object({
  status: z.enum(FEEDBACK_STATUS).optional(),
  roadmapItemId: z.string().nullable().optional(),
});

export const PATCH = withApi(async (ctx) => {
  const session = ctx.session!;
  const { id } = ctx.params;
  const body = await parseBody(ctx.req, updateSchema);
  const existing = await db.feedbackPost.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "Feedback not found");
  if (body.roadmapItemId) {
    const item = await db.roadmapItem.findUnique({ where: { id: body.roadmapItemId }, select: { id: true } });
    if (!item) throw new ApiError(404, "Roadmap item not found");
  }
  const updated = await db.feedbackPost.update({ where: { id }, data: body });
  await writeAudit({
    userId: session.id, userName: session.name, role: session.roles[0],
    action: "UPDATE", entityType: "FeedbackPost", entityId: id, entityName: updated.title,
    before: { status: existing.status }, after: { status: updated.status }, ipAddress: ctx.ip,
  });
  return ok({ post: updated });
}, { permission: "product.manage", rateLimit: { limit: 120, windowMs: 60_000 } });

export const DELETE = withApi(async (ctx) => {
  const session = ctx.session!;
  const { id } = ctx.params;
  const existing = await db.feedbackPost.findUnique({ where: { id }, select: { id: true, title: true } });
  if (!existing) throw new ApiError(404, "Feedback not found");
  await db.feedbackPost.delete({ where: { id } });
  await writeAudit({
    userId: session.id, userName: session.name, role: session.roles[0],
    action: "DELETE", entityType: "FeedbackPost", entityId: id, entityName: existing.title, ipAddress: ctx.ip,
  });
  return ok({ deleted: true });
}, { permission: "product.manage", rateLimit: { limit: 120, windowMs: 60_000 } });
