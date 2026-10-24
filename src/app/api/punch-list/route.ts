// PM CONTROL TOWER — Punch List API (Command Center v3.0)
// GET  /api/punch-list?projectId&status — punch list register
// POST /api/punch-list — add punch item (code auto-generated when omitted)

import { z } from "zod";
import { db } from "@/lib/db";
import { withApi, ok, ApiError, parseBody } from "@/lib/api";
import { writeAudit } from "@/lib/audit";

const PUNCH_STATUS = ["OPEN", "IN_PROGRESS", "CLOSED", "VERIFIED"] as const;
const PUNCH_SEVERITY = ["LOW", "MEDIUM", "HIGH"] as const;

export const GET = withApi(async (ctx) => {
  const projectId = ctx.searchParams.get("projectId")?.trim();
  const status = ctx.searchParams.get("status")?.trim();

  const items = await db.punchListItem.findMany({
    where: {
      ...(projectId ? { projectId } : {}),
      ...(status && PUNCH_STATUS.includes(status as (typeof PUNCH_STATUS)[number]) ? { status } : {}),
    },
    include: { project: { select: { id: true, code: true, name: true } } },
    orderBy: [{ status: "asc" }, { code: "asc" }],
    take: 500,
  });
  return ok({
    items,
    summary: {
      total: items.length,
      open: items.filter((i) => i.status === "OPEN" || i.status === "IN_PROGRESS").length,
      verified: items.filter((i) => i.status === "VERIFIED").length,
      overdue: items.filter((i) => i.dueDate && i.dueDate.getTime() < Date.now() && (i.status === "OPEN" || i.status === "IN_PROGRESS")).length,
    },
  });
}, { permission: "project.view", rateLimit: { limit: 300, windowMs: 60_000 } });

const createSchema = z.object({
  projectId: z.string().min(1),
  code: z.string().max(40).optional(),
  title: z.string().min(2).max(200),
  description: z.string().max(4000).optional().nullable(),
  location: z.string().max(160).optional().nullable(),
  severity: z.enum(PUNCH_SEVERITY).default("MEDIUM"),
  assigneeName: z.string().max(160).optional().nullable(),
  dueDate: z.coerce.date().optional().nullable(),
});

export const POST = withApi(async (ctx) => {
  const session = ctx.session!;
  const body = await parseBody(ctx.req, createSchema);
  const project = await db.project.findUnique({ where: { id: body.projectId }, select: { id: true, code: true } });
  if (!project) throw new ApiError(404, "Project not found");

  let code = body.code;
  if (!code) {
    const count = await db.punchListItem.count({ where: { projectId: body.projectId } });
    code = `PUNCH-${String(count + 1).padStart(3, "0")}`;
  }
  const dupe = await db.punchListItem.findUnique({ where: { projectId_code: { projectId: body.projectId, code } }, select: { id: true } });
  if (dupe) throw new ApiError(400, `Punch item ${code} already exists on this project`);

  const created = await db.punchListItem.create({ data: { ...body, code } });
  await writeAudit({
    userId: session.id, userName: session.name, role: session.roles[0],
    action: "CREATE", entityType: "PunchListItem", entityId: created.id, entityName: `${created.code} — ${created.title}`,
    after: { projectId: body.projectId, severity: created.severity }, ipAddress: ctx.ip,
  });
  return ok({ item: created }, 201);
}, { permission: "field.manage", rateLimit: { limit: 120, windowMs: 60_000 } });
