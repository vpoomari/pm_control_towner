// PM CONTROL TOWER — Message Boards API (Command Center v3.0 — Basecamp analog)
// GET  /api/message-boards?projectId — thread list
// POST /api/message-boards — start a thread

import { z } from "zod";
import { db } from "@/lib/db";
import { withApi, ok, ApiError, parseBody } from "@/lib/api";
import { writeAudit } from "@/lib/audit";

const BOARD_CATEGORIES = ["GENERAL", "ANNOUNCEMENTS", "STANDUP", "Q_AND_A", "RISKS", "WINS"] as const;

export const GET = withApi(async (ctx) => {
  const projectId = ctx.searchParams.get("projectId")?.trim();

  const threads = await db.boardThread.findMany({
    where: projectId ? { projectId } : {},
    include: { project: { select: { id: true, code: true, name: true } } },
    orderBy: [{ pinned: "desc" }, { lastActivityAt: "desc" }],
    take: 300,
  });
  return ok({
    threads, categories: BOARD_CATEGORIES,
    summary: {
      total: threads.length,
      pinned: threads.filter((t) => t.pinned).length,
      recentActivity: threads.filter((t) => Date.now() - t.lastActivityAt.getTime() < 7 * 86_400_000).length,
    },
  });
}, { permission: "inbox.use", rateLimit: { limit: 300, windowMs: 60_000 } });

const createSchema = z.object({
  projectId: z.string().optional().nullable(),
  title: z.string().min(3).max(200),
  category: z.enum(BOARD_CATEGORIES).default("GENERAL"),
  firstComment: z.string().max(20_000).optional().nullable(),
});

export const POST = withApi(async (ctx) => {
  const session = ctx.session!;
  const body = await parseBody(ctx.req, createSchema);
  if (body.projectId) {
    const project = await db.project.findUnique({ where: { id: body.projectId }, select: { id: true } });
    if (!project) throw new ApiError(404, "Project not found");
  }
  const created = await db.boardThread.create({
    data: {
      projectId: body.projectId ?? null, title: body.title, category: body.category,
      createdById: session.id, createdByName: session.name,
    },
  });
  if (body.firstComment && body.firstComment.trim()) {
    await db.comment.create({
      data: {
        entityType: "BOARD_THREAD", entityId: created.id,
        authorId: session.id, authorName: session.name, body: body.firstComment.trim(),
      },
    });
  }
  await writeAudit({
    userId: session.id, userName: session.name, role: session.roles[0],
    action: "CREATE", entityType: "BoardThread", entityId: created.id, entityName: created.title,
    after: { category: created.category, projectId: created.projectId }, ipAddress: ctx.ip,
  });
  return ok({ thread: created }, 201);
}, { permission: "boards.use", rateLimit: { limit: 120, windowMs: 60_000 } });
