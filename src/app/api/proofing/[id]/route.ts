// PM CONTROL TOWER — Proof round detail API (Command Center v3.0)
// GET    /api/proofing/[id] — round + annotations
// PATCH  /api/proofing/[id] — reviewer decision (approve / changes requested)
// POST   /api/proofing/[id] — add annotation (markup comment)
// DELETE /api/proofing/[id]

import { z } from "zod";
import { db } from "@/lib/db";
import { withApi, ok, ApiError, parseBody } from "@/lib/api";
import { writeAudit } from "@/lib/audit";

const PROOF_STATUS = ["PENDING", "IN_REVIEW", "CHANGES_REQUESTED", "APPROVED"] as const;

const annotateSchema = z.object({
  locator: z.string().max(60).default(""),
  xPct: z.coerce.number().min(0).max(100).optional().nullable(),
  yPct: z.coerce.number().min(0).max(100).optional().nullable(),
  comment: z.string().min(1).max(2000),
  resolved: z.coerce.boolean().optional(),
});

const patchSchema = z.object({
  status: z.enum(PROOF_STATUS).optional(),
  notes: z.string().max(4000).optional().nullable(),
  dueDate: z.coerce.date().optional().nullable(),
  annotationId: z.string().optional(),
  annotationResolved: z.coerce.boolean().optional(),
});

export const GET = withApi(async (ctx) => {
  const { id } = ctx.params;
  const round = await db.proofRound.findUnique({
    where: { id },
    include: {
      deliverable: { select: { id: true, code: true, name: true, deliverableType: true, project: { select: { id: true, code: true, name: true } } } },
      annotations: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!round) throw new ApiError(404, "Proof round not found");
  return ok({ round });
}, { permission: "project.view", rateLimit: { limit: 300, windowMs: 60_000 } });

export const PATCH = withApi(async (ctx) => {
  const session = ctx.session!;
  const { id } = ctx.params;
  const body = await parseBody(ctx.req, patchSchema);
  const existing = await db.proofRound.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "Proof round not found");

  // Annotation resolve toggle (separate from round-level decision fields)
  if (body.annotationId) {
    const annotation = await db.proofAnnotation.findUnique({ where: { id: body.annotationId } });
    if (!annotation || annotation.roundId !== id) throw new ApiError(404, "Annotation not found on this round");
    await db.proofAnnotation.update({
      where: { id: body.annotationId },
      data: { resolved: body.annotationResolved ?? !annotation.resolved },
    });
    await writeAudit({
      userId: session.id, userName: session.name, role: session.roles[0],
      action: "UPDATE", entityType: "ProofAnnotation", entityId: body.annotationId, ipAddress: ctx.ip,
    });
    return ok({ updated: true });
  }

  const updated = await db.proofRound.update({
    where: { id },
    data: {
      ...(body.status !== undefined ? { status: body.status } : {}),
      ...(body.notes !== undefined ? { notes: body.notes } : {}),
      ...(body.dueDate !== undefined ? { dueDate: body.dueDate } : {}),
      ...(body.status === "APPROVED" || body.status === "CHANGES_REQUESTED" ? { decisionAt: new Date() } : {}),
    },
  });
  await writeAudit({
    userId: session.id, userName: session.name, role: session.roles[0],
    action: "UPDATE", entityType: "ProofRound", entityId: id,
    entityName: `Proof round ${updated.roundNumber}`,
    before: { status: existing.status }, after: { status: updated.status }, ipAddress: ctx.ip,
  });
  return ok({ round: updated });
}, { permission: "proofing.manage", rateLimit: { limit: 120, windowMs: 60_000 } });

export const POST = withApi(async (ctx) => {
  const session = ctx.session!;
  const { id } = ctx.params;
  const body = await parseBody(ctx.req, annotateSchema);
  const round = await db.proofRound.findUnique({ where: { id }, select: { id: true, roundNumber: true } });
  if (!round) throw new ApiError(404, "Proof round not found");
  const annotation = await db.proofAnnotation.create({
    data: {
      roundId: id, locator: body.locator, xPct: body.xPct ?? null, yPct: body.yPct ?? null,
      comment: body.comment, authorName: session.name, resolved: body.resolved ?? false,
    },
  });
  return ok({ annotation }, 201);
}, { permission: "inbox.use", rateLimit: { limit: 200, windowMs: 60_000 } });

export const DELETE = withApi(async (ctx) => {
  const session = ctx.session!;
  const { id } = ctx.params;
  const existing = await db.proofRound.findUnique({ where: { id }, select: { id: true, roundNumber: true } });
  if (!existing) throw new ApiError(404, "Proof round not found");
  await db.proofRound.delete({ where: { id } });
  await writeAudit({
    userId: session.id, userName: session.name, role: session.roles[0],
    action: "DELETE", entityType: "ProofRound", entityId: id, ipAddress: ctx.ip,
  });
  return ok({ deleted: true });
}, { permission: "proofing.manage", rateLimit: { limit: 120, windowMs: 60_000 } });
