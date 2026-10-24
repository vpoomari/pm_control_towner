// PM CONTROL TOWER — RFIs API (Command Center v3.0 — construction field-to-office)
// GET  /api/rfis?projectId&status — RFI register with aging
// POST /api/rfis — raise an RFI (code auto-generated when omitted)

import { z } from "zod";
import { db } from "@/lib/db";
import { withApi, ok, ApiError, parseBody } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { emitRealtime } from "@/lib/realtime";

const RFI_STATUS = ["DRAFT", "OPEN", "ANSWERED", "CLOSED"] as const;
const RFI_PRIORITY = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
const RFI_DISCIPLINES = ["GENERAL", "STRUCTURAL", "MEP", "ARCHITECTURAL", "CIVIL", "ELECTRICAL", "SOFTWARE"] as const;

export const GET = withApi(async (ctx) => {
  const projectId = ctx.searchParams.get("projectId")?.trim();
  const status = ctx.searchParams.get("status")?.trim();

  const rfis = await db.rfi.findMany({
    where: {
      ...(projectId ? { projectId } : {}),
      ...(status && RFI_STATUS.includes(status as (typeof RFI_STATUS)[number]) ? { status } : {}),
    },
    include: { project: { select: { id: true, code: true, name: true } } },
    orderBy: { dateOpened: "desc" },
    take: 500,
  });
  const now = Date.now();
  return ok({
    rfis: rfis.map((r) => ({ ...r, ageDays: Math.floor((now - r.dateOpened.getTime()) / 86_400_000) })),
    summary: {
      total: rfis.length,
      open: rfis.filter((r) => r.status === "OPEN").length,
      unansweredOver7d: rfis.filter((r) => r.status === "OPEN" && (now - r.dateOpened.getTime()) > 7 * 86_400_000).length,
      costImpact: rfis.reduce((s, r) => s + r.costImpact, 0),
      scheduleImpactDays: rfis.reduce((s, r) => s + r.scheduleImpactDays, 0),
      byDiscipline: RFI_DISCIPLINES.map((d) => ({ discipline: d, count: rfis.filter((r) => r.discipline === d).length })),
    },
  });
}, { permission: "project.view", rateLimit: { limit: 300, windowMs: 60_000 } });

const createSchema = z.object({
  projectId: z.string().min(1),
  rfiCode: z.string().max(40).optional(),
  subject: z.string().min(3).max(200),
  body: z.string().max(8000).optional().nullable(),
  discipline: z.enum(RFI_DISCIPLINES).default("GENERAL"),
  priority: z.enum(RFI_PRIORITY).default("MEDIUM"),
  assignedToName: z.string().max(160).optional().nullable(),
  attachmentUrl: z.string().max(400).optional().nullable(),
});

export const POST = withApi(async (ctx) => {
  const session = ctx.session!;
  const body = await parseBody(ctx.req, createSchema);
  const project = await db.project.findUnique({ where: { id: body.projectId }, select: { id: true, code: true } });
  if (!project) throw new ApiError(404, "Project not found");

  let rfiCode = body.rfiCode;
  if (!rfiCode) {
    const count = await db.rfi.count({ where: { projectId: body.projectId } });
    rfiCode = `RFI-${String(count + 1).padStart(4, "0")}`;
  }
  const dupe = await db.rfi.findUnique({ where: { projectId_rfiCode: { projectId: body.projectId, rfiCode } }, select: { id: true } });
  if (dupe) throw new ApiError(400, `RFI ${rfiCode} already exists on this project`);

  const created = await db.rfi.create({
    data: {
      projectId: body.projectId, rfiCode, subject: body.subject, body: body.body ?? null,
      discipline: body.discipline, priority: body.priority, status: "OPEN",
      askedByName: session.name, assignedToName: body.assignedToName ?? null,
      attachmentUrl: body.attachmentUrl ?? null,
    },
  });
  await writeAudit({
    userId: session.id, userName: session.name, role: session.roles[0],
    action: "CREATE", entityType: "Rfi", entityId: created.id, entityName: `${created.rfiCode} — ${created.subject}`,
    after: { projectId: body.projectId, status: "OPEN" }, ipAddress: ctx.ip,
  });
  emitRealtime("field:changed", { projectId: body.projectId, rfiId: created.id, action: "RFI_CREATED" }, `project:${body.projectId}`);
  return ok({ rfi: created }, 201);
}, { permission: "field.manage", rateLimit: { limit: 120, windowMs: 60_000 } });
