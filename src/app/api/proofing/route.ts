// PM CONTROL TOWER — Proofing & Approvals API (Command Center v3.0 — Filestage/ProofHub analog)
// GET  /api/proofing?projectId&status — proof rounds for deliverables with annotation counts
// POST /api/proofing — start a proof round on a deliverable

import { z } from "zod";
import { db } from "@/lib/db";
import { withApi, ok, ApiError, parseBody } from "@/lib/api";
import { writeAudit } from "@/lib/audit";

const PROOF_STATUS = ["PENDING", "IN_REVIEW", "CHANGES_REQUESTED", "APPROVED"] as const;

export const GET = withApi(async (ctx) => {
  const projectId = ctx.searchParams.get("projectId")?.trim();
  const status = ctx.searchParams.get("status")?.trim();

  const rounds = await db.proofRound.findMany({
    where: {
      ...(status && PROOF_STATUS.includes(status as (typeof PROOF_STATUS)[number]) ? { status } : {}),
      ...(projectId ? { deliverable: { projectId } } : {}),
    },
    include: {
      deliverable: { select: { id: true, code: true, name: true, deliverableType: true, status: true, projectId: true, project: { select: { id: true, code: true, name: true } } } },
      annotations: true,
    },
    orderBy: { createdAt: "desc" },
    take: 300,
  });
  return ok({
    rounds: rounds.map((r) => ({
      ...r,
      openAnnotations: r.annotations.filter((a) => !a.resolved).length,
    })),
    summary: {
      total: rounds.length,
      inReview: rounds.filter((r) => r.status === "IN_REVIEW").length,
      approved: rounds.filter((r) => r.status === "APPROVED").length,
      changesRequested: rounds.filter((r) => r.status === "CHANGES_REQUESTED").length,
      openAnnotations: rounds.reduce((s, r) => s + r.annotations.filter((a) => !a.resolved).length, 0),
    },
  });
}, { permission: "project.view", rateLimit: { limit: 300, windowMs: 60_000 } });

const createSchema = z.object({
  deliverableId: z.string().min(1),
  versionLabel: z.string().max(40).default("v1"),
  fileUrl: z.string().max(400).optional().nullable(),
  dueDate: z.coerce.date().optional().nullable(),
  reviewerName: z.string().max(160).optional().nullable(),
  notes: z.string().max(4000).optional().nullable(),
});

export const POST = withApi(async (ctx) => {
  const session = ctx.session!;
  const body = await parseBody(ctx.req, createSchema);
  const deliverable = await db.deliverable.findUnique({ where: { id: body.deliverableId }, select: { id: true, name: true, projectId: true } });
  if (!deliverable) throw new ApiError(404, "Deliverable not found");
  const existingRounds = await db.proofRound.count({ where: { deliverableId: body.deliverableId } });
  const created = await db.proofRound.create({
    data: {
      deliverableId: body.deliverableId,
      roundNumber: existingRounds + 1,
      versionLabel: body.versionLabel,
      fileUrl: body.fileUrl ?? null,
      dueDate: body.dueDate ?? null,
      reviewerName: body.reviewerName ?? session.name,
      notes: body.notes ?? null,
      status: "IN_REVIEW",
    },
  });
  await writeAudit({
    userId: session.id, userName: session.name, role: session.roles[0],
    action: "CREATE", entityType: "ProofRound", entityId: created.id,
    entityName: `Proof round ${created.roundNumber} — ${deliverable.name}`,
    after: { deliverableId: body.deliverableId, status: created.status }, ipAddress: ctx.ip,
  });
  return ok({ round: created }, 201);
}, { permission: "proofing.manage", rateLimit: { limit: 120, windowMs: 60_000 } });
