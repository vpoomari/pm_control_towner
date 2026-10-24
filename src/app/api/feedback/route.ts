// PM CONTROL TOWER — Feedback Portal API (Command Center v3.0 — Productboard/Aha! analog)
// GET  /api/feedback?status&category&projectId — feedback board with vote counts
// POST /api/feedback — submit feedback

import { z } from "zod";
import { db } from "@/lib/db";
import { withApi, ok, ApiError, parseBody } from "@/lib/api";
import { writeAudit } from "@/lib/audit";

const FEEDBACK_STATUS = ["NEW", "UNDER_REVIEW", "PLANNED", "IN_PROGRESS", "SHIPPED", "DECLINED"] as const;
const FEEDBACK_CATEGORY = ["BUG", "FEATURE", "IDEA", "INTEGRATION", "UX"] as const;
const FEEDBACK_SOURCE = ["INTERNAL", "CLIENT", "PORTAL"] as const;

export const GET = withApi(async (ctx) => {
  const status = ctx.searchParams.get("status")?.trim();
  const category = ctx.searchParams.get("category")?.trim();
  const projectId = ctx.searchParams.get("projectId")?.trim();

  const posts = await db.feedbackPost.findMany({
    where: {
      ...(status && FEEDBACK_STATUS.includes(status as (typeof FEEDBACK_STATUS)[number]) ? { status } : {}),
      ...(category && FEEDBACK_CATEGORY.includes(category as (typeof FEEDBACK_CATEGORY)[number]) ? { category } : {}),
      ...(projectId ? { projectId } : {}),
    },
    include: {
      project: { select: { id: true, code: true, name: true } },
      roadmapItem: { select: { id: true, title: true, quarter: true, status: true } },
      _count: { select: { votes: true } },
    },
    orderBy: [{ votesCount: "desc" }, { createdAt: "desc" }],
    take: 300,
  });
  return ok({
    posts,
    summary: {
      total: posts.length,
      newCount: posts.filter((p) => p.status === "NEW").length,
      shipped: posts.filter((p) => p.status === "SHIPPED").length,
      topVoted: posts[0] ? { id: posts[0].id, title: posts[0].title, votes: posts[0].votesCount } : null,
      byCategory: FEEDBACK_CATEGORY.map((c) => ({ category: c, count: posts.filter((p) => p.category === c).length })),
    },
  });
}, { permission: "inbox.use", rateLimit: { limit: 300, windowMs: 60_000 } });

const createSchema = z.object({
  title: z.string().min(3).max(200),
  body: z.string().max(8000).optional().nullable(),
  category: z.enum(FEEDBACK_CATEGORY).default("FEATURE"),
  source: z.enum(FEEDBACK_SOURCE).default("INTERNAL"),
  projectId: z.string().optional().nullable(),
  submittedByName: z.string().max(160).optional().nullable(),
  submittedByEmail: z.string().max(200).optional().nullable(),
});

export const POST = withApi(async (ctx) => {
  const session = ctx.session!;
  const body = await parseBody(ctx.req, createSchema);
  if (body.projectId) {
    const project = await db.project.findUnique({ where: { id: body.projectId }, select: { id: true } });
    if (!project) throw new ApiError(404, "Project not found");
  }
  const created = await db.feedbackPost.create({
    data: {
      title: body.title, body: body.body ?? null, category: body.category, source: body.source,
      projectId: body.projectId ?? null,
      submittedByName: body.submittedByName ?? session.name,
      submittedByEmail: body.submittedByEmail ?? null,
    },
  });
  await writeAudit({
    userId: session.id, userName: session.name, role: session.roles[0],
    action: "CREATE", entityType: "FeedbackPost", entityId: created.id, entityName: created.title,
    after: { category: created.category, source: created.source }, ipAddress: ctx.ip,
  });
  return ok({ post: created }, 201);
}, { permission: "inbox.use", rateLimit: { limit: 120, windowMs: 60_000 } });
