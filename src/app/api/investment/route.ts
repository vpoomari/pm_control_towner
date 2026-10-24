// PM CONTROL TOWER — Investment & Business Case API
// GET  /api/investment              — list business cases (portfolio view)
// GET  /api/investment?id=          — one case with computed metrics
// POST /api/investment              — create/save case (metrics computed server-side by the finance engine)
// PATCH /api/investment             — workflow decision (SUBMIT / PMO_REVIEW / FINANCE_REVIEW / CFO_REVIEW / APPROVED / REJECTED / CONDITIONAL / FUNDED)

import { z } from "zod";
import { db } from "@/lib/db";
import { withApi, ok, ApiError, parseBody } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { emitRealtime } from "@/lib/realtime";
import { computeBusinessCase, scenarioSuite, npvSensitivity } from "@/lib/engines/finance";

const itemSchema = z.object({
  capex: z.array(z.object({ category: z.string(), description: z.string().optional(), amount: z.number().min(0), year: z.number().int().min(0).optional() })).default([]),
  opex: z.array(z.object({ category: z.string(), description: z.string().optional(), annualAmount: z.number().min(0), startYear: z.number().int().min(0).optional(), endYear: z.number().int().min(0).optional(), escalationPct: z.number().optional() })).default([]),
  benefits: z.array(z.object({ name: z.string(), type: z.string().optional(), annualValue: z.number().min(0), startYear: z.number().int().min(0).optional(), growthPct: z.number().optional(), confidencePct: z.number().min(0).max(100).optional(), owner: z.string().optional() })).default([]),
});

const createSchema = z.object({
  name: z.string().min(2),
  projectId: z.string().optional().nullable(),
  sponsor: z.string().min(2),
  businessUnit: z.string().optional().nullable(),
  strategicObjective: z.string().optional().nullable(),
  currency: z.string().length(3).default("USD"),
  analysisYears: z.number().int().min(1).max(15).default(5),
  discountRatePct: z.number().min(0).max(50).default(8),
  hurdleRatePct: z.number().min(0).max(50).optional(),
  capex: itemSchema.shape.capex, opex: itemSchema.shape.opex, benefits: itemSchema.shape.benefits,
});

function computeCase(body: { analysisYears: number; discountRatePct: number; hurdleRatePct?: number; capex: unknown; opex: unknown; benefits: unknown }) {
  return computeBusinessCase({ analysisYears: body.analysisYears, discountRatePct: body.discountRatePct, capex: body.capex as never, opex: body.opex as never, benefits: body.benefits as never, hurdleRatePct: body.hurdleRatePct });
}

export const GET = withApi(async (ctx) => {
  const id = ctx.searchParams.get("id");
  if (id) {
    const bc = await db.businessCase.findUnique({ where: { id } });
    if (!bc) throw new ApiError(404, "Business case not found");
    const input = { analysisYears: bc.analysisYears, discountRatePct: bc.discountRatePct, capex: JSON.parse(bc.capexItemsJson), opex: JSON.parse(bc.opexItemsJson), benefits: JSON.parse(bc.benefitItemsJson) };
    const metrics = computeCase(input);
    return ok({ businessCase: bc, metrics, scenarios: scenarioSuite(input), sensitivity: npvSensitivity(input) });
  }
  const cases = await db.businessCase.findMany({ orderBy: { updatedAt: "desc" } });
  const rows = cases.map((c) => {
    const m = computeCase({ analysisYears: c.analysisYears, discountRatePct: c.discountRatePct, capex: JSON.parse(c.capexItemsJson), opex: JSON.parse(c.opexItemsJson), benefits: JSON.parse(c.benefitItemsJson) });
    return { id: c.id, name: c.name, sponsor: c.sponsor, status: c.status, recommendation: c.recommendation, currency: c.currency, roiPct: m.roiPct, npv: m.npv, irr: m.irr, paybackYears: m.paybackYears, totalInvestment: m.totalInvestment, totalBenefits: m.totalBenefits };
  });
  const invested = rows.reduce((s, r) => s + r.totalInvestment, 0);
  const benefits = rows.reduce((s, r) => s + r.totalBenefits, 0);
  return ok({ cases: rows, portfolio: { invested, benefits, roiPct: invested > 0 ? Math.round(((benefits - invested) / invested) * 1000) / 10 : 0, count: rows.length } });
}, { permission: "financial.view", rateLimit: { limit: 240, windowMs: 60_000 } });

export const POST = withApi(async (ctx) => {
  const session = ctx.session!;
  const body = await parseBody(ctx.req, createSchema);
  const metrics = computeCase(body);
  const created = await db.businessCase.create({
    data: {
      name: body.name, projectId: body.projectId ?? null, sponsor: body.sponsor,
      businessUnit: body.businessUnit ?? null, strategicObjective: body.strategicObjective ?? null,
      currency: body.currency, analysisYears: body.analysisYears, discountRatePct: body.discountRatePct,
      capexItemsJson: JSON.stringify(body.capex), opexItemsJson: JSON.stringify(body.opex), benefitItemsJson: JSON.stringify(body.benefits),
      computedJson: JSON.stringify({ roiPct: metrics.roiPct, npv: metrics.npv, irr: metrics.irr, paybackYears: metrics.paybackYears, recommendation: metrics.recommendation }),
      recommendation: metrics.recommendation, status: "DRAFT", createdBy: session.id,
    },
  });
  await writeAudit({ userId: session.id, userName: session.name, action: "CREATE", entityType: "BusinessCase", entityId: created.id, entityName: body.name, after: { roiPct: metrics.roiPct, npv: metrics.npv, recommendation: metrics.recommendation } });
  emitRealtime("project:updated", { businessCaseId: created.id }, body.projectId ? `project:${body.projectId}` : "global");
  return ok({ id: created.id, metrics }, 201);
}, { permission: "financial.manage", rateLimit: { limit: 60, windowMs: 60_000 } });

const DECISIONS = ["SUBMITTED", "PMO_REVIEW", "FINANCE_REVIEW", "CFO_REVIEW", "APPROVED", "REJECTED", "CONDITIONAL", "FUNDED"] as const;
export const PATCH = withApi(async (ctx) => {
  const session = ctx.session!;
  const body = await parseBody(ctx.req, z.object({
    id: z.string(), status: z.enum(DECISIONS),
    approvedAmount: z.number().min(0).optional(), comment: z.string().optional(),
  }));
  const bc = await db.businessCase.findUnique({ where: { id: body.id } });
  if (!bc) throw new ApiError(404, "Business case not found");
  const updated = await db.businessCase.update({
    where: { id: body.id },
    data: { status: body.status, approvedAmount: body.approvedAmount ?? (bc.approvedAmount ?? undefined), decidedBy: session.name, decidedAt: new Date(), decisionComment: body.comment ?? bc.decisionComment },
  });
  await writeAudit({ userId: session.id, userName: session.name, action: "UPDATE", entityType: "BusinessCase", entityId: body.id, entityName: bc.name, before: { status: bc.status }, after: { status: body.status, approvedAmount: body.approvedAmount }, severity: "WARNING" });
  emitRealtime("project:updated", { businessCaseId: body.id, status: body.status }, bc.projectId ? `project:${bc.projectId}` : "global");
  return ok({ id: updated.id, status: updated.status, decidedBy: updated.decidedBy });
}, { permission: "financial.manage", rateLimit: { limit: 60, windowMs: 60_000 } });
