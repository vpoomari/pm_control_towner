// PM CONTROL TOWER — Punch List Item API (Command Center v3.0)
// PATCH  /api/punch-list/[id] — progress / close / verify
// DELETE /api/punch-list/[id]

import { z } from "zod";
import { db } from "@/lib/db";
import { withApi, ok, ApiError, parseBody } from "@/lib/api";
import { writeAudit } from "@/lib/audit";

const PUNCH_STATUS = ["OPEN", "IN_PROGRESS", "CLOSED", "VERIFIED"] as const;
const PUNCH_SEVERITY = ["LOW", "MEDIUM", "HIGH"] as const;

const updateSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  description: z.string().max(4000).optional().nullable(),
  location: z.string().max(160).optional().nullable(),
  severity: z.enum(PUNCH_SEVERITY).optional(),
  status: z.enum(PUNCH_STATUS).optional(),
  assigneeName: z.string().max(160).optional().nullable(),
  dueDate: z.coerce.date().optional().nullable(),
});

export const PATCH = withApi(async (ctx) => {
  const session = ctx.session!;
  const { id } = ctx.params;
  const body = await parseBody(ctx.req, updateSchema);
  const existing = await db.punchListItem.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "Punch item not found");
  const updated = await db.punchListItem.update({
    where: { id },
    data: {
      ...body,
      ...(body.status === "CLOSED" || body.status === "VERIFIED" ? { closedAt: existing.closedAt ?? new Date() } : {}),
      ...(body.status === "OPEN" ? { closedAt: null } : {}),
    },
  });
  await writeAudit({
    userId: session.id, userName: session.name, role: session.roles[0],
    action: "UPDATE", entityType: "PunchListItem", entityId: id, entityName: `${updated.code} — ${updated.title}`,
    before: { status: existing.status }, after: { status: updated.status }, ipAddress: ctx.ip,
  });
  return ok({ item: updated });
}, { permission: "field.manage", rateLimit: { limit: 120, windowMs: 60_000 } });

export const DELETE = withApi(async (ctx) => {
  const session = ctx.session!;
  const { id } = ctx.params;
  const existing = await db.punchListItem.findUnique({ where: { id }, select: { id: true, code: true } });
  if (!existing) throw new ApiError(404, "Punch item not found");
  await db.punchListItem.delete({ where: { id } });
  await writeAudit({
    userId: session.id, userName: session.name, role: session.roles[0],
    action: "DELETE", entityType: "PunchListItem", entityId: id, entityName: existing.code, ipAddress: ctx.ip,
  });
  return ok({ deleted: true });
}, { permission: "field.manage", rateLimit: { limit: 120, windowMs: 60_000 } });
