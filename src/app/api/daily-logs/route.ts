// PM CONTROL TOWER — Daily Construction Logs API (Command Center v3.0)
// GET  /api/daily-logs?projectId&from&to — field diary register
// POST /api/daily-logs — record a daily log

import { z } from "zod";
import { db } from "@/lib/db";
import { withApi, ok, ApiError, parseBody } from "@/lib/api";
import { writeAudit } from "@/lib/audit";

function parseDateParam(raw: string | null, endOfDay = false): Date | null {
  if (!raw) return null;
  const d = new Date(raw.length === 10 ? `${raw}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z` : raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export const GET = withApi(async (ctx) => {
  const projectId = ctx.searchParams.get("projectId")?.trim();
  const from = parseDateParam(ctx.searchParams.get("from"));
  const to = parseDateParam(ctx.searchParams.get("to"), true);

  const logs = await db.dailyLog.findMany({
    where: {
      ...(projectId ? { projectId } : {}),
      ...(from || to ? { logDate: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
    },
    include: { project: { select: { id: true, code: true, name: true } } },
    orderBy: { logDate: "desc" },
    take: 400,
  });
  return ok({
    logs,
    summary: {
      total: logs.length,
      crewPeak: logs.reduce((m, l) => Math.max(m, l.crewCount), 0),
      safetyIncidents: logs.reduce((s, l) => s + l.safetyIncidents, 0),
      daysWithDelays: logs.filter((l) => (l.delays || "").trim().length > 0).length,
    },
  });
}, { permission: "project.view", rateLimit: { limit: 300, windowMs: 60_000 } });

const createSchema = z.object({
  projectId: z.string().min(1),
  logDate: z.coerce.date().default(() => new Date()),
  weather: z.string().max(80).optional().nullable(),
  temperatureC: z.coerce.number().optional().nullable(),
  crewCount: z.coerce.number().int().min(0).default(0),
  equipmentUsed: z.string().max(2000).optional().nullable(),
  workPerformed: z.string().max(8000).optional().nullable(),
  delays: z.string().max(4000).optional().nullable(),
  safetyIncidents: z.coerce.number().int().min(0).default(0),
  inspections: z.string().max(2000).optional().nullable(),
  notes: z.string().max(4000).optional().nullable(),
});

export const POST = withApi(async (ctx) => {
  const session = ctx.session!;
  const body = await parseBody(ctx.req, createSchema);
  const project = await db.project.findUnique({ where: { id: body.projectId }, select: { id: true, code: true } });
  if (!project) throw new ApiError(404, "Project not found");
  const created = await db.dailyLog.create({ data: { ...body, logDate: body.logDate ?? new Date(), createdByName: session.name } });
  await writeAudit({
    userId: session.id, userName: session.name, role: session.roles[0],
    action: "CREATE", entityType: "DailyLog", entityId: created.id,
    entityName: `Daily log ${created.logDate.toISOString().slice(0, 10)}`,
    after: { projectId: body.projectId, crewCount: created.crewCount }, ipAddress: ctx.ip,
  });
  return ok({ log: created }, 201);
}, { permission: "field.manage", rateLimit: { limit: 120, windowMs: 60_000 } });
