// PM CONTROL TOWER — Client detail API (Command Center v3.0)
// PATCH  /api/clients/[id] — update client
// DELETE /api/clients/[id] — remove client (only when no invoices reference it)

import { z } from "zod";
import { db } from "@/lib/db";
import { withApi, ok, ApiError, parseBody } from "@/lib/api";
import { writeAudit } from "@/lib/audit";

const CLIENT_STATUS = ["PROSPECT", "ACTIVE", "ON_HOLD", "CHURNED"] as const;

const updateSchema = z.object({
  name: z.string().min(2).max(160).optional(),
  organization: z.string().max(160).optional().nullable(),
  contactName: z.string().max(160).optional().nullable(),
  email: z.string().max(200).optional().nullable(),
  phone: z.string().max(60).optional().nullable(),
  portalUrl: z.string().max(400).optional().nullable(),
  status: z.enum(CLIENT_STATUS).optional(),
  notes: z.string().max(4000).optional().nullable(),
});

export const PATCH = withApi(async (ctx) => {
  const session = ctx.session!;
  const { id } = ctx.params;
  const body = await parseBody(ctx.req, updateSchema);
  const existing = await db.client.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "Client not found");
  const updated = await db.client.update({ where: { id }, data: body });
  await writeAudit({
    userId: session.id, userName: session.name, role: session.roles[0],
    action: "UPDATE", entityType: "Client", entityId: id, entityName: updated.name,
    before: { status: existing.status }, after: { status: updated.status }, ipAddress: ctx.ip,
  });
  return ok({ client: updated });
}, { permission: "client.manage", rateLimit: { limit: 120, windowMs: 60_000 } });

export const DELETE = withApi(async (ctx) => {
  const session = ctx.session!;
  const { id } = ctx.params;
  const existing = await db.client.findUnique({ where: { id }, include: { _count: { select: { invoices: true } } } });
  if (!existing) throw new ApiError(404, "Client not found");
  if (existing._count.invoices > 0) throw new ApiError(400, "Client has invoices — void or reassign them first");
  await db.client.delete({ where: { id } });
  await writeAudit({
    userId: session.id, userName: session.name, role: session.roles[0],
    action: "DELETE", entityType: "Client", entityId: id, entityName: existing.name, ipAddress: ctx.ip,
  });
  return ok({ deleted: true });
}, { permission: "client.manage", rateLimit: { limit: 120, windowMs: 60_000 } });
