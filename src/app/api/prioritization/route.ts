// PM CONTROL TOWER — Prioritization & Portfolio Selection API
// GET   /api/prioritization                       — criteria + project scores + ranking
// POST  /api/prioritization {action:"score"}      — save a project's criterion scores (weighted total computed server-side)
// POST  /api/prioritization {action:"optimize"}   — budget-constrained selection (mandatory + dependency aware), saved as a scenario
// POST  /api/prioritization {action:"weights"}    — update criterion weights (must total 100)

import { z } from "zod";
import { db } from "@/lib/db";
import { withApi, ok, ApiError, parseBody } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { weightedScore, classify, optimizePortfolio, Candidate } from "@/lib/engines/prioritization";
import { ensureCriteriaSeeded } from "@/lib/executive-context";
import { fromJson, toJson } from "@/lib/constants";

export const GET = withApi(async () => {
  const criteria = await ensureCriteriaSeeded();
  const [projects, scores] = await Promise.all([
    db.project.findMany({ select: { id: true, code: true, name: true, ragStatus: true, currentBudget: true, baselineBudget: true, status: true, riskLevel: true } }),
    db.projectScore.findMany(),
  ]);
  const byId = new Map(scores.map((s) => [s.projectId, s]));
  const rows = projects.map((p) => {
    const s = byId.get(p.id);
    return {
      project: p,
      score: s ? {
        weightedScore: s.overrideScore ?? s.weightedScore, systemScore: s.weightedScore,
        classification: classify(s.overrideScore ?? s.weightedScore),
        overridden: s.overrideScore != null, overrideReason: s.overrideReason, overrideBy: s.overrideBy,
        scores: fromJson<Record<string, number>>(s.scoresJson, {}),
        costEstimate: s.costEstimate, expectedValue: s.expectedValue,
        mandatory: s.mandatory, dependsOn: fromJson<string[]>(s.dependsOnJson, []),
      } : null,
    };
  }).sort((a, b) => (b.score?.weightedScore ?? -1) - (a.score?.weightedScore ?? -1));
  return ok({ criteria, rows, unscored: rows.filter((r) => !r.score).length });
}, { permission: "portfolio.view", rateLimit: { limit: 240, windowMs: 60_000 } });

const postSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("score"), projectId: z.string(),
    scores: z.record(z.string(), z.number().min(0).max(100)),
    costEstimate: z.number().min(0).default(0), expectedValue: z.number().min(0).default(0),
    mandatory: z.boolean().default(false),
    dependsOn: z.array(z.string()).default([]),
    overrideScore: z.number().min(0).max(100).optional(), overrideReason: z.string().optional(),
  }),
  z.object({ action: z.literal("optimize"), budget: z.number().min(0), maxProjects: z.number().int().min(1).optional(), name: z.string().optional() }),
  z.object({ action: z.literal("weights"), weights: z.array(z.object({ id: z.string(), weight: z.number().min(0).max(100) })).min(1) }),
]);

export const POST = withApi(async (ctx) => {
  const session = ctx.session!;
  const body = await parseBody(ctx.req, postSchema);
  const criteria = await ensureCriteriaSeeded();

  if (body.action === "score") {
    // Dependencies must reference real, other projects
    const depIds = [...new Set(body.dependsOn.filter((d) => d !== body.projectId))];
    if (depIds.length > 0) {
      const found = await db.project.findMany({ where: { id: { in: depIds } }, select: { id: true } });
      if (found.length !== depIds.length) throw new ApiError(400, "One or more dependencies reference unknown projects");
    }
    const weighted = weightedScore(body.scores, criteria);
    const cls = classify(body.overrideScore ?? weighted);
    const score = await db.projectScore.upsert({
      where: { projectId: body.projectId },
      create: {
        projectId: body.projectId, scoresJson: JSON.stringify(body.scores), weightedScore: weighted,
        classification: cls, overrideScore: body.overrideScore ?? null, overrideReason: body.overrideReason ?? null, overrideBy: body.overrideScore != null ? session.name : null,
        costEstimate: body.costEstimate, expectedValue: body.expectedValue,
        mandatory: body.mandatory, dependsOnJson: toJson(depIds),
      },
      update: {
        scoresJson: JSON.stringify(body.scores), weightedScore: weighted, classification: cls,
        ...(body.overrideScore != null ? { overrideScore: body.overrideScore, overrideReason: body.overrideReason ?? null, overrideBy: session.name } : {}),
        costEstimate: body.costEstimate, expectedValue: body.expectedValue,
        mandatory: body.mandatory, dependsOnJson: toJson(depIds),
      },
    });
    await writeAudit({ userId: session.id, userName: session.name, action: "UPDATE", entityType: "ProjectScore", entityId: score.id, entityName: "Project prioritization score", after: { weighted, cls, override: body.overrideScore, mandatory: body.mandatory, dependsOn: depIds } });
    return ok({ weightedScore: weighted, classification: cls, overridden: body.overrideScore != null }, 201);
  }

  if (body.action === "weights") {
    const total = body.weights.reduce((s, w) => s + w.weight, 0);
    if (Math.abs(total - 100) > 0.001) throw new ApiError(400, `Weights must total 100 (got ${Math.round(total * 10) / 10})`);
    const known = new Set(criteria.map((c) => c.id));
    for (const w of body.weights) {
      if (!known.has(w.id)) throw new ApiError(400, `Unknown criterion: ${w.id}`);
      await db.priorityCriterion.update({ where: { id: w.id }, data: { weight: w.weight } });
    }
    await writeAudit({ userId: session.id, userName: session.name, action: "CONFIGURE", entityType: "PriorityCriterion", entityName: "Scoring model weights", after: { weights: body.weights } });
    return ok({ criteria: await ensureCriteriaSeeded() }, 201);
  }

  // optimize — mandatory + dependency aware
  const scores = await db.projectScore.findMany();
  if (scores.length === 0) throw new ApiError(400, "Score projects before optimizing");
  const projects = await db.project.findMany({ select: { id: true, code: true, name: true } });
  const nameOf = new Map(projects.map((p) => [p.id, p.code]));
  const candidates: Candidate[] = scores.map((s) => ({
    id: s.projectId, name: nameOf.get(s.projectId) ?? s.projectId,
    score: s.overrideScore ?? s.weightedScore, cost: s.costEstimate, expectedValue: s.expectedValue,
    required: s.mandatory,
    dependsOn: fromJson<string[]>(s.dependsOnJson, []),
  }));
  const result = optimizePortfolio(candidates, body.budget, body.maxProjects);
  const scenario = await db.portfolioScenario.create({
    data: {
      name: body.name ?? `Optimization ${new Date().toISOString().slice(0, 10)} — budget ${body.budget.toLocaleString("en-US")}`,
      budget: body.budget, maxProjects: body.maxProjects ?? null,
      selectedJson: JSON.stringify(result.selected), excludedJson: JSON.stringify(result.excluded),
      totalScore: result.totalScore, invested: result.totalCost,
      status: "OPTIMIZED", createdBy: session.id, ownerName: session.name,
      totalValue: result.totalValue, weightsJson: toJson(criteria), constraintsJson: toJson({ budget: body.budget, maxProjects: body.maxProjects ?? null }),
      resultsJson: toJson(result),
    },
  });
  await writeAudit({ userId: session.id, userName: session.name, action: "CREATE", entityType: "PortfolioScenario", entityId: scenario.id, entityName: scenario.name, after: { budget: body.budget, selected: result.selected.map((d) => d.candidate.name), totalScore: result.totalScore } });
  return ok({ scenarioId: scenario.id, ...result }, 201);
}, { permission: "portfolio.manage", rateLimit: { limit: 60, windowMs: 60_000 } });
