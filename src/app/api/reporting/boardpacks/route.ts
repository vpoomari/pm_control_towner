// PM CONTROL TOWER — Board Packs + Report Schedules API
import { z } from "zod";
import { db } from "@/lib/db";
import { withApi, ok, ApiError, parseBody } from "@/lib/api";
import { writeAudit } from "@/lib/audit";

export const GET = withApi(async () => {
  const packs = await db.boardPack.findMany({ orderBy: { createdAt: "desc" }, include: { pages: { orderBy: { order: "asc" } } } });
  const schedules = await db.reportSchedule.findMany({ orderBy: { createdAt: "desc" } });
  return ok({ packs, schedules });
}, { permission: "reports.view", rateLimit: { limit: 240, windowMs: 60_000 } });

export const POST = withApi(async (ctx) => {
  const session = ctx.session!;
  const body = await parseBody(ctx.req, z.discriminatedUnion("action", [
    z.object({
      action: z.literal("createPack"),
      name: z.string().min(2),
      reportIds: z.array(z.string()).min(1),
      executiveSummary: z.string().optional(),
      confidentiality: z.string().default("CONFIDENTIAL"),
    }),
    z.object({
      action: z.literal("createSchedule"),
      name: z.string().min(2),
      frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY"]).default("WEEKLY"),
    }),
  ]));

  if (body.action === "createPack") {
    const reports = await db.generatedReport.findMany({ where: { id: { in: body.reportIds } } });
    if (reports.length === 0) throw new ApiError(400, "No valid reports found");
    const pack = await db.boardPack.create({
      data: {
        name: body.name, createdBy: session.id, executiveSummary: body.executiveSummary ?? null,
        confidentiality: body.confidentiality,
        pages: { create: reports.map((r, i) => ({ order: i, reportId: r.id, title: r.templateName })) },
      },
      include: { pages: true },
    });
    await writeAudit({ userId: session.id, userName: session.name, action: "CREATE", entityType: "BoardPack", entityId: pack.id, entityName: pack.name, after: { pages: reports.length } });
    return ok({ pack }, 201);
  }

  const sched = await db.reportSchedule.create({
    data: { name: body.name, frequency: body.frequency, isActive: true, createdByName: session.name },
  });
  await writeAudit({ userId: session.id, userName: session.name, action: "CREATE", entityType: "ReportSchedule", entityId: sched.id, entityName: body.name, after: { frequency: body.frequency } });
  return ok({ schedule: sched }, 201);
}, { permission: "reports.view", rateLimit: { limit: 60, windowMs: 60_000 } });
