// PM CONTROL TOWER — Feedback vote API (Command Center v3.0)
// POST /api/feedback/[id]/vote — toggle the caller's vote on a feedback post

import { db } from "@/lib/db";
import { withApi, ok, ApiError } from "@/lib/api";
import { writeAudit } from "@/lib/audit";

export const POST = withApi(async (ctx) => {
  const session = ctx.session!;
  const { id } = ctx.params;
  const post = await db.feedbackPost.findUnique({ where: { id }, select: { id: true, title: true } });
  if (!post) throw new ApiError(404, "Feedback not found");

  const existing = await db.feedbackVote.findUnique({
    where: { postId_voterKey: { postId: id, voterKey: session.id } },
  });
  if (existing) {
    await db.feedbackVote.delete({ where: { id: existing.id } });
    const votesCount = await db.feedbackVote.count({ where: { postId: id } });
    const updated = await db.feedbackPost.update({ where: { id }, data: { votesCount } });
    return ok({ voted: false, votesCount: updated.votesCount });
  }
  await db.feedbackVote.create({ data: { postId: id, voterKey: session.id } });
  const votesCount = await db.feedbackVote.count({ where: { postId: id } });
  const updated = await db.feedbackPost.update({ where: { id }, data: { votesCount } });
  await writeAudit({
    userId: session.id, userName: session.name, role: session.roles[0],
    action: "UPDATE", entityType: "FeedbackPost", entityId: id, entityName: post.title,
    after: { action: "VOTE", votesCount }, ipAddress: ctx.ip,
  });
  return ok({ voted: true, votesCount: updated.votesCount });
}, { permission: "inbox.use", rateLimit: { limit: 200, windowMs: 60_000 } });
