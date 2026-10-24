// PM CONTROL TOWER — Thread detail API (Command Center v3.0)
// GET    /api/message-boards/[id] — thread + comments
// POST   /api/message-boards/[id] — add a reply
// PATCH  /api/message-boards/[id] — pin / unpin
// DELETE /api/message-boards/[id]

import { z } from "zod";
import { db } from "@/lib/db";
import { withApi, ok, ApiError, parseBody } from "@/lib/api";
import { writeAudit } from "@/lib/audit";

export const GET = withApi(async (ctx) => {
  const { id } = ctx.params;
  const thread = await db.boardThread.findUnique({
    where: { id },
    include: { project: { select: { id: true, code: true, name: true } } },
  });
  if (!thread) throw new ApiError(404, "Thread not found");
  const comments = await db.comment.findMany({
    where: { entityType: "BOARD_THREAD", entityId: id },
    orderBy: { createdAt: "asc" },
    take: 500,
  });
  return ok({ thread, comments });
}, { permission: "inbox.use", rateLimit: { limit: 300, windowMs: 60_000 } });

const replySchema = z.object({ body: z.string().min(1).max(20_000) });
const patchSchema = z.object({ pinned: z.coerce.boolean().optional() });

export const POST = withApi(async (ctx) => {
  const session = ctx.session!;
  const { id } = ctx.params;
  const body = await parseBody(ctx.req, replySchema);
  const thread = await db.boardThread.findUnique({ where: { id } });
  if (!thread) throw new ApiError(404, "Thread not found");
  const comment = await db.comment.create({
    data: {
      entityType: "BOARD_THREAD", entityId: id,
      authorId: session.id, authorName: session.name, body: body.body,
    },
  });
  const replyCount = await db.comment.count({ where: { entityType: "BOARD_THREAD", entityId: id } });
  const updated = await db.boardThread.update({ where: { id }, data: { replyCount, lastActivityAt: new Date() } });
  return ok({ comment, replyCount: updated.replyCount }, 201);
}, { permission: "boards.use", rateLimit: { limit: 200, windowMs: 60_000 } });

export const PATCH = withApi(async (ctx) => {
  const session = ctx.session!;
  const { id } = ctx.params;
  const body = await parseBody(ctx.req, patchSchema);
  const thread = await db.boardThread.findUnique({ where: { id } });
  if (!thread) throw new ApiError(404, "Thread not found");
  const updated = await db.boardThread.update({ where: { id }, data: body });
  await writeAudit({
    userId: session.id, userName: session.name, role: session.roles[0],
    action: "UPDATE", entityType: "BoardThread", entityId: id, entityName: updated.title,
    after: { pinned: updated.pinned }, ipAddress: ctx.ip,
  });
  return ok({ thread: updated });
}, { permission: "boards.use", rateLimit: { limit: 120, windowMs: 60_000 } });

export const DELETE = withApi(async (ctx) => {
  const session = ctx.session!;
  const { id } = ctx.params;
  const thread = await db.boardThread.findUnique({ where: { id }, select: { id: true, title: true } });
  if (!thread) throw new ApiError(404, "Thread not found");
  await db.comment.deleteMany({ where: { entityType: "BOARD_THREAD", entityId: id } });
  await db.boardThread.delete({ where: { id } });
  await writeAudit({
    userId: session.id, userName: session.name, role: session.roles[0],
    action: "DELETE", entityType: "BoardThread", entityId: id, entityName: thread.title, ipAddress: ctx.ip,
  });
  return ok({ deleted: true });
}, { permission: "boards.use", rateLimit: { limit: 120, windowMs: 60_000 } });
