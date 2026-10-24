// PM CONTROL TOWER — RFI detail API (Command Center v3.0)
// PATCH  /api/rfis/[id] — answer / close / update impact
// DELETE /api/rfis/[id]

import { z } from "zod";
import { db } from "@/lib/db";
import { withApi, ok, ApiError, parseBody } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { emitRealtime } from "@/lib/realtime";

const RFI_STATUS = ["DRAFT", "OPEN", "ANSWERED", "CLOSED"] as const;
const RFI_PRIORITY = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
const RFI_DISCIPLINES = ["GENERAL", "STRUCTURAL", "MEP", "ARCHITECTURAL", "CIVIL", "ELECTRICAL", "SOFTWARE"] as const;

const updateSchema = z.object({
  status: z.enum(RFI_STATUS).optional(),
  priority: z.enum(RFI_PRIORITY).optional(),
  discipline: z.enum(RFI_DISCIPLINES).optional(),
  answer: z.string().max(8000).optional().nullable(),
  assignedToName: z.string().max(160).optional().nullable(),
  costImpact: z.coerce.number().min(0).optional(),
  scheduleImpactDays: z.coerce.number().optional(),
  attachmentUrl: z.string().max(400).optional().nullable(),
});

export const PATCH = withApi(async (ctx) => {
  const session = ctx.session!;
  const { id } = ctx.params;
  const body = await parseBody(ctx.req, updateSchema);
  const existing = await db.rfi.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "RFI not found");

  const answering = body.answer !== undefined && body.answer !== null && body.answer !== "" && body.status !== "OPEN";
  const updated = await db.rfi.update({
    where: { id },
    data: {
      ...body,
      ...(answering ? { dateAnswered: new Date(), status: body.status ?? "ANSWERED" } : {}),
      ...(body.status === "ANSWERED" && !existing.dateAnswered ? { dateAnswered: new Date() } : {}),
    },
  });
  await writeAudit({
    userId: session.id, userName: session.name, role: session.roles[0],
    action: "UPDATE", entityType: "Rfi", entityId: id, entityName: `${updated.rfiCode} — ${updated.subject}`,
    before: { status: existing.status, costImpact: existing.costImpact },
    after: { status: updated.status, costImpact: updated.costImpact }, ipAddress: ctx.ip,
  });
  emitRealtime("field:changed", { projectId: updated.projectId, rfiId: updated.id, action: "RFI_UPDATED" }, `project:${updated.projectId}`);
  return ok({ rfi: updated });
}, { permission: "field.manage", rateLimit: { limit: 120, windowMs: 60_000 } });

export const DELETE = withApi(async (ctx) => {
  const session = ctx.session!;
  const { id } = ctx.params;
  const existing = await db.rfi.findUnique({ where: { id }, select: { id: true, rfiCode: true, projectId: true } });
  if (!existing) throw new ApiError(404, "RFI not found");
  await db.rfi.delete({ where: { id } });
  await writeAudit({
    userId: session.id, userName: session.name, role: session.roles[0],
    action: "DELETE", entityType: "Rfi", entityId: id, entityName: existing.rfiCode, ipAddress: ctx.ip,
  });
  emitRealtime("field:changed", { projectId: existing.projectId, rfiId: id, action: "RFI_DELETED" }, `project:${existing.projectId}`);
  return ok({ deleted: true });
}, { permission: "field.manage", rateLimit: { limit: 120, windowMs: 60_000 } });
