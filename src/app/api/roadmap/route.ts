// PM CONTROL TOWER — Roadmap API (Command Center v3.0)
// GET  /api/roadmap?quarter — roadmap items grouped by quarter
// POST /api/roadmap — create roadmap item

import { z } from "zod";
import { db } from "@/lib/db";
import { withApi, ok, ApiError, parseBody } from "@/lib/api";
import { writeAudit } from "@/lib/audit";

const ROADMAP_STATUS = ["PLANNED", "COMMITTED", "IN_PROGRESS", "SHIPPED", "DEFERRED"] as const;

export const GET = withApi(async (ctx) => {
  const quarter = ctx.searchParams.get("quarter")?.trim();
  const items = await db.roadmapItem.findMany({
    where: quarter ? { quarter } : {},
    include: {
      project: { select: { id: true, code: true, name: true } },
      linkedFeedback: { select: { id: true, title: true, votesCount: true } },
    },
    orderBy: [{ quarter: "asc" }, { orderIndex: "asc" }],
    take: 300,
  });
  const quarters = [...new Set(items.map((i) => i.quarter))].sort();
  return ok({
    items, quarters,
    summary: {
      total: items.length,
      shipped: items.filter((i) => i.status === "SHIPPED").length,
      avgProgress: items.length ? Math.round(items.reduce((s, i) => s + i.progress, 0) / items.length) : 0,
      linkedFeedback: items.reduce((s, i) => s + i.linkedFeedback.length, 0),
    },
  });
}, { permission: "inbox.use", rateLimit: { limit: 300, windowMs: 60_000 } });

const createSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(4000).optional().nullable(),
  quarter: z.string().min(4).max(10).default("2026-Q4"),
  status: z.enum(ROADMAP_STATUS).default("PLANNED"),
  progress: z.coerce.number().min(0).max(100).default(0),
  releaseTag: z.string().max(60).optional().nullable(),
  projectId: z.string().optional().nullable(),
  objectiveId: z.string().optional().nullable(),
  orderIndex: z.coerce.number().int().default(0),
});

export const POST = withApi(async (ctx) => {
  const session = ctx.session!;
  const body = await parseBody(ctx.req, createSchema);
  if (body.projectId) {
    const project = await db.project.findUnique({ where: { id: body.projectId }, select: { id: true } });
    if (!project) throw new ApiError(404, "Project not found");
  }
  const created = await db.roadmapItem.create({ data: { ...body } });
  await writeAudit({
    userId: session.id, userName: session.name, role: session.roles[0],
    action: "CREATE", entityType: "RoadmapItem", entityId: created.id, entityName: created.title,
    after: { quarter: created.quarter, status: created.status }, ipAddress: ctx.ip,
  });
  return ok({ item: created }, 201);
}, { permission: "product.manage", rateLimit: { limit: 120, windowMs: 60_000 } });
