// PM CONTROL TOWER — Doc page API (Command Center v3.0)
// GET    /api/docs/[id] — full page
// PATCH  /api/docs/[id] — update content / metadata
// DELETE /api/docs/[id]

import { z } from "zod";
import { db } from "@/lib/db";
import { withApi, ok, ApiError, parseBody } from "@/lib/api";
import { writeAudit } from "@/lib/audit";

const DOC_SPACES = ["GENERAL", "ENGINEERING", "CONSTRUCTION", "FINANCE", "PRODUCT", "GOVERNANCE"] as const;

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  icon: z.string().max(8).optional(),
  content: z.string().max(200_000).optional(),
  space: z.enum(DOC_SPACES).optional(),
  tags: z.string().max(400).optional().nullable(),
  isPublished: z.coerce.boolean().optional(),
  orderIndex: z.coerce.number().int().optional(),
});

export const GET = withApi(async (ctx) => {
  const { id } = ctx.params;
  const page = await db.docPage.findUnique({ where: { id } });
  if (!page) throw new ApiError(404, "Doc page not found");
  return ok({ page });
}, { permission: "inbox.use", rateLimit: { limit: 300, windowMs: 60_000 } });

export const PATCH = withApi(async (ctx) => {
  const session = ctx.session!;
  const { id } = ctx.params;
  const body = await parseBody(ctx.req, updateSchema);
  const existing = await db.docPage.findUnique({ where: { id }, select: { id: true, title: true } });
  if (!existing) throw new ApiError(404, "Doc page not found");
  const updated = await db.docPage.update({ where: { id }, data: body });
  await writeAudit({
    userId: session.id, userName: session.name, role: session.roles[0],
    action: "UPDATE", entityType: "DocPage", entityId: id, entityName: updated.title, ipAddress: ctx.ip,
  });
  return ok({ page: updated });
}, { permission: "docs.use", rateLimit: { limit: 240, windowMs: 60_000 } });

export const DELETE = withApi(async (ctx) => {
  const session = ctx.session!;
  const { id } = ctx.params;
  const existing = await db.docPage.findUnique({ where: { id }, select: { id: true, title: true } });
  if (!existing) throw new ApiError(404, "Doc page not found");
  await db.docPage.delete({ where: { id } });
  await writeAudit({
    userId: session.id, userName: session.name, role: session.roles[0],
    action: "DELETE", entityType: "DocPage", entityId: id, entityName: existing.title, ipAddress: ctx.ip,
  });
  return ok({ deleted: true });
}, { permission: "docs.use", rateLimit: { limit: 120, windowMs: 60_000 } });
