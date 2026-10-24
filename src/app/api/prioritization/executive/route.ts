// PM CONTROL TOWER — Executive Portfolio Decision API (one-click optimization)
// GET  /api/prioritization/executive           — presets, criteria, budget, scenarios, latest result bundle
// POST {action:"optimize"}                     — one-click executive optimization (preset or custom), persisted + audited
// POST {action:"whatIf"|"investX"|"cutX"}      — simulations (not persisted)
// POST {action:"why", projectId}               — transparent per-project explanation
// POST {action:"decide"}                       — DRAFT→…→LOCKED workflow transitions (audited)
// POST {action:"rename"|"compare"}             — scenario management

import { z } from "zod";
import { db } from "@/lib/db";
import { withApi, ok, ApiError, parseBody } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { hasPermission } from "@/lib/rbac";
import { fromJson, toJson } from "@/lib/constants";
import { Criterion } from "@/lib/engines/prioritization";
import {
  ENGINE_VERSION, SCENARIO_PRESETS, ExecOptimizationConfig, ExecOptimizationResult, ExecProject,
  runExecutiveOptimization, buildDecisionCards, buildActions, portfolioHealth, buildRecommendation,
  buildInsights, buildBeforeAfter, diffScenarios, simulateWhatIf, bestUseOf, whereToCut,
  buildScorecard, buildStrategyMap, buildBudgetAllocation, buildResourceFeasibility,
  buildDependencyImpacts, explainProject, compareScenarioResults,
} from "@/lib/engines/executive-portfolio";
import {
  loadExecutiveProjects, loadResourceRaw, shapeResourceModel, loadApprovedBudget, ensureCriteriaSeeded,
} from "@/lib/executive-context";

// ---- Admin-configurable defaults (AdminSettings.prioritizationConfigJson) ----
interface ExecAdminConfig { ragBudgetUtilPct?: number; ragCapacityUtilPct?: number; hiddenPresetKeys?: string[] }
const DEFAULT_ADMIN_CONFIG: Required<ExecAdminConfig> = { ragBudgetUtilPct: 97, ragCapacityUtilPct: 90, hiddenPresetKeys: [] };

async function loadAdminConfig(): Promise<Required<ExecAdminConfig>> {
  const settings = await db.adminSettings.findUnique({ where: { id: "singleton" }, select: { prioritizationConfigJson: true } });
  const parsed = fromJson<ExecAdminConfig>(settings?.prioritizationConfigJson ?? null, {});
  return { ...DEFAULT_ADMIN_CONFIG, ...parsed };
}

// ---- Weight-vector assembly: explicit weights > preset mapping > current criteria ----
function presetWeightsOnCriteria(presetWeights: Record<string, number>, criteria: Criterion[]): Criterion[] {
  const matched = criteria.filter((c) => presetWeights[c.id] != null);
  const unmatched = criteria.filter((c) => presetWeights[c.id] == null);
  const matchedSum = matched.reduce((s, c) => s + presetWeights[c.id], 0);
  const leftover = Math.max(0, 100 - matchedSum);
  const unmatchedCurrent = unmatched.reduce((s, c) => s + c.weight, 0);
  return criteria.map((c) => ({
    id: c.id, name: c.name,
    weight: presetWeights[c.id] != null ? presetWeights[c.id] : unmatchedCurrent > 0 ? (c.weight / unmatchedCurrent) * leftover : leftover / Math.max(1, unmatched.length),
  }));
}

function normalizeWeights(raw: { id: string; weight: number }[], criteria: Criterion[]): Criterion[] {
  const byId = new Map(criteria.map((c) => [c.id, c]));
  const out: Criterion[] = [];
  for (const w of raw) {
    const c = byId.get(w.id);
    if (!c) throw new ApiError(400, `Unknown criterion: ${w.id}`);
    out.push({ id: c.id, name: c.name, weight: w.weight });
  }
  if (out.length === 0) return criteria;
  const missing = criteria.filter((c) => !raw.some((w) => w.id === c.id));
  if (missing.length > 0) out.push(...missing); // retain unmentioned criteria at current weight
  const total = out.reduce((s, c) => s + c.weight, 0);
  if (Math.abs(total - 100) > 0.01) throw new ApiError(400, `Weights must total 100 (got ${Math.round(total * 10) / 10})`);
  return out;
}

interface StoredResult {
  config: ExecOptimizationConfig;
  metrics: ExecOptimizationResult["metrics"];
  totalCost: number; remainingBudget: number; totalScore: number; totalValue: number;
  selected: { candidate: { id: string; name: string; score: number; cost: number; expectedValue: number; mandatory?: boolean }; reason: string }[];
  excluded: { candidate: { id: string; name: string; score: number; cost: number; expectedValue: number; mandatory?: boolean }; reason: string }[];
  constraintViolations: string[];
  health?: ReturnType<typeof portfolioHealth>;
  recommendation?: ReturnType<typeof buildRecommendation>;
  cards?: ReturnType<typeof buildDecisionCards>;
  actions?: ReturnType<typeof buildActions>;
  insights?: ReturnType<typeof buildInsights>;
  beforeAfter?: ReturnType<typeof buildBeforeAfter>;
  whatChanged?: ReturnType<typeof diffScenarios>;
  scorecard?: ReturnType<typeof buildScorecard>;
  strategyMap?: ReturnType<typeof buildStrategyMap>;
  budgetAllocation?: ReturnType<typeof buildBudgetAllocation>;
  resourceFeasibility?: ReturnType<typeof buildResourceFeasibility>;
  dependencyImpacts?: ReturnType<typeof buildDependencyImpacts>;
  kpis?: { label: string; value: number; unit: string }[];
}

function slimDecisions(list: ExecOptimizationResult["selected"] | ExecOptimizationResult["excluded"]): { candidate: { id: string; name: string; score: number; cost: number; expectedValue: number; mandatory?: boolean }; reason: string }[] {
  return list.map((d) => ({
    candidate: { id: d.candidate.id, name: d.candidate.name, score: d.candidate.score, cost: d.candidate.cost, expectedValue: d.candidate.expectedValue, mandatory: d.candidate.required },
    reason: d.reason,
  }));
}

const riskEnum = z.enum(["LOW", "MEDIUM", "HIGH"]);

const configSchema = z.object({
  presetKey: z.string().optional(),
  budget: z.number().min(0).optional(),
  maxProjects: z.number().int().min(1).optional(),
  weights: z.array(z.object({ id: z.string(), weight: z.number().min(0).max(100) })).optional(),
  minRoiPct: z.number().min(0).max(1000).optional(),
  riskTolerance: riskEnum.optional(),
  capexLimit: z.number().min(0).optional(),
  opexLimit: z.number().min(0).optional(),
  minStrategicAlignment: z.number().min(0).max(100).optional(),
  maxPortfolioRisk: riskEnum.optional(),
});

const postSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("optimize"), name: z.string().optional(), config: configSchema }),
  z.object({ action: z.literal("whatIf"), kind: z.enum(["SET_BUDGET", "ADD_BUDGET", "CUT_BUDGET"]), amount: z.number().min(0), config: configSchema.optional() }),
  z.object({ action: z.literal("investX"), amount: z.number().min(0), config: configSchema.optional() }),
  z.object({ action: z.literal("cutX"), amount: z.number().min(0), config: configSchema.optional() }),
  z.object({ action: z.literal("why"), projectId: z.string(), scenarioId: z.string().optional() }),
  z.object({ action: z.literal("decide"), scenarioId: z.string(), decision: z.enum(["SUBMIT_REVIEW", "REQUEST_CHANGES", "APPROVE", "PUBLISH", "LOCK"]), note: z.string().optional() }),
  z.object({ action: z.literal("rename"), scenarioId: z.string(), name: z.string().min(2) }),
  z.object({ action: z.literal("compare"), scenarioA: z.string(), scenarioB: z.string() }),
]);

/** Resolve the effective optimization config (shared by optimize + all simulations). */
async function resolveConfig(input: z.infer<typeof configSchema> | undefined): Promise<{ config: ExecOptimizationConfig; presetKey: string; projects: ExecProject[] }> {
  const [{ projects, criteria }, budgetInfo] = await Promise.all([loadExecutiveProjects(), loadApprovedBudget()]);
  const preset = input?.presetKey ? SCENARIO_PRESETS.find((p) => p.key === input.presetKey) : undefined;
  if (input?.presetKey && !preset) throw new ApiError(400, `Unknown scenario preset: ${input.presetKey}`);
  const weights = input?.weights ? normalizeWeights(input.weights, criteria)
    : preset ? presetWeightsOnCriteria(preset.weights, criteria)
    : criteria;
  const budget = input?.budget ?? Math.round(budgetInfo.budget * (preset?.budgetFactor ?? 1));
  return {
    config: {
      budget, maxProjects: input?.maxProjects, weights,
      presetKey: preset?.key,
      minRoiPct: input?.minRoiPct ?? preset?.minRoiPct,
      riskTolerance: input?.riskTolerance ?? preset?.riskTolerance ?? "MEDIUM",
      capexLimit: input?.capexLimit, opexLimit: input?.opexLimit,
      minStrategicAlignment: input?.minStrategicAlignment,
      maxPortfolioRisk: input?.maxPortfolioRisk,
    },
    presetKey: preset?.key ?? "CUSTOM",
    projects,
  };
}

const SCENARIO_LIST_SELECT = {
  id: true, name: true, budget: true, status: true, scenarioKey: true, ownerName: true,
  totalScore: true, totalValue: true, invested: true, createdAt: true, decidedBy: true, decidedAt: true, decisionNote: true,
} as const;

export const GET = withApi(async (ctx) => {
  const adminCfg = await loadAdminConfig();
  const [{ projects, criteria }, budgetInfo, scenarios] = await Promise.all([
    loadExecutiveProjects(), loadApprovedBudget(),
    db.portfolioScenario.findMany({ orderBy: { createdAt: "desc" }, take: 20, select: SCENARIO_LIST_SELECT }),
  ]);
  const scored = projects.filter((p) => p.score);
  const latestFull = await db.portfolioScenario.findFirst({ orderBy: { createdAt: "desc" } });
  const latest = latestFull
    ? {
      id: latestFull.id, name: latestFull.name, budget: latestFull.budget, status: latestFull.status,
      scenarioKey: latestFull.scenarioKey, ownerName: latestFull.ownerName, createdAt: latestFull.createdAt,
      decidedBy: latestFull.decidedBy, decidedAt: latestFull.decidedAt, decisionNote: latestFull.decisionNote,
      result: fromJson<StoredResult>(latestFull.resultsJson, {} as StoredResult),
    }
    : null;
  return ok({
    engineVersion: ENGINE_VERSION,
    presets: SCENARIO_PRESETS.filter((p) => !adminCfg.hiddenPresetKeys.includes(p.key)).map((p) => ({ key: p.key, label: p.label, description: p.description })),
    criteria,
    approvedBudget: budgetInfo.budget,
    portfolioName: budgetInfo.portfolioName,
    summary: {
      total: projects.length, scored: scored.length, unscored: projects.length - scored.length,
      totalCost: scored.reduce((s, p) => s + (p.score?.costEstimate ?? 0), 0),
      totalValue: scored.reduce((s, p) => s + (p.score?.expectedValue ?? 0), 0),
      mandatory: scored.filter((p) => p.score?.mandatory).length,
    },
    projects: projects.map((p) => ({
      id: p.id, code: p.code, name: p.name, status: p.status, riskLevel: p.riskLevel,
      objective: p.objectiveName, program: p.programName, businessUnit: p.businessUnit,
      score: p.score ? {
        weighted: p.score.weighted, classification: p.score.classification,
        cost: p.score.costEstimate, value: p.score.expectedValue, mandatory: p.score.mandatory,
        dependsOn: p.score.dependsOn, overridden: p.score.overridden,
        scores: p.score.scores,
      } : null,
    })),
    scenarios,
    latest,
    adminConfig: adminCfg,
    canManage: hasPermission(ctx.session, "portfolio.manage"),
  });
}, { permission: "portfolio.view", rateLimit: { limit: 120, windowMs: 60_000 } });

export const POST = withApi(async (ctx) => {
  const session = ctx.session!;
  const body = await parseBody(ctx.req, postSchema);

  // ---- Simulations (read-only, portfolio.view) ----
  if (body.action === "whatIf" || body.action === "investX" || body.action === "cutX") {
    const { config, projects } = await resolveConfig(body.config);
    const resourceRaw = await loadResourceRaw();
    const resourceByProject = resourceRaw ? resourceRaw.perProjectWeekly : new Map<string, number>();
    if (body.action === "whatIf") {
      return ok({ whatIf: simulateWhatIf(projects, config, resourceByProject, body.kind, body.amount) });
    }
    if (body.action === "investX") return ok({ invest: bestUseOf(projects, config, body.amount) });
    return ok({ cut: whereToCut(projects, config, body.amount) });
  }

  if (body.action === "why") {
    const scenario = body.scenarioId ? await db.portfolioScenario.findUnique({ where: { id: body.scenarioId } }) : null;
    const stored = scenario ? fromJson<StoredResult | null>(scenario.resultsJson, null) : null;
    const input = stored?.config ? { presetKey: stored.config.presetKey, budget: stored.config.budget, maxProjects: stored.config.maxProjects, weights: stored.config.weights, minRoiPct: stored.config.minRoiPct, riskTolerance: stored.config.riskTolerance, capexLimit: stored.config.capexLimit, opexLimit: stored.config.opexLimit, minStrategicAlignment: stored.config.minStrategicAlignment, maxPortfolioRisk: stored.config.maxPortfolioRisk } : undefined;
    const { config, projects } = await resolveConfig(input);
    const resourceRaw = await loadResourceRaw();
    const result = runExecutiveOptimization(projects, config, resourceRaw ? resourceRaw.perProjectWeekly : new Map());
    const explanation = explainProject(body.projectId, projects, result);
    if (!explanation) throw new ApiError(404, "Project not found or not scored");
    return ok({ why: explanation });
  }

  if (body.action === "compare") {
    const [a, b] = await Promise.all([
      db.portfolioScenario.findUnique({ where: { id: body.scenarioA } }),
      db.portfolioScenario.findUnique({ where: { id: body.scenarioB } }),
    ]);
    if (!a || !b) throw new ApiError(404, "Scenario not found");
    const ra = fromJson<StoredResult | null>(a.resultsJson, null);
    const rb = fromJson<StoredResult | null>(b.resultsJson, null);
    if (!ra || !rb) throw new ApiError(400, "One or both scenarios predate comparable results — re-run optimization");
    const asResult = (r: StoredResult) => r as unknown as ExecOptimizationResult;
    return ok({ rows: compareScenarioResults(asResult(ra), asResult(rb), a.name, b.name), nameA: a.name, nameB: b.name });
  }

  // ---- Mutations below require portfolio.manage ----
  if (!hasPermission(session, "portfolio.manage")) throw new ApiError(403, "Permission denied: portfolio.manage");

  if (body.action === "rename") {
    const scenario = await db.portfolioScenario.update({ where: { id: body.scenarioId }, data: { name: body.name } });
    await writeAudit({ userId: session.id, userName: session.name, action: "UPDATE", entityType: "PortfolioScenario", entityId: scenario.id, entityName: scenario.name, after: { renamed: body.name } });
    return ok({ scenario: { id: scenario.id, name: scenario.name } });
  }

  if (body.action === "decide") {
    const scenario = await db.portfolioScenario.findUnique({ where: { id: body.scenarioId } });
    if (!scenario) throw new ApiError(404, "Scenario not found");
    const TRANSITIONS: Record<string, Record<string, string>> = {
      OPTIMIZED: { SUBMIT_REVIEW: "EXECUTIVE_REVIEW" },
      EXECUTIVE_REVIEW: { REQUEST_CHANGES: "CHANGES_REQUESTED", APPROVE: "APPROVED" },
      CHANGES_REQUESTED: { SUBMIT_REVIEW: "EXECUTIVE_REVIEW" },
      APPROVED: { PUBLISH: "PUBLISHED" },
      PUBLISHED: { LOCK: "LOCKED" },
      DRAFT: {},
      LOCKED: {},
    };
    const next = TRANSITIONS[scenario.status]?.[body.decision];
    if (!next) throw new ApiError(400, `Transition ${body.decision} not allowed from ${scenario.status}`);
    const updated = await db.portfolioScenario.update({
      where: { id: scenario.id },
      data: { status: next, decisionNote: body.note ?? scenario.decisionNote, decidedBy: session.name, decidedAt: new Date() },
    });
    await writeAudit({
      userId: session.id, userName: session.name, action: next === "APPROVED" ? "APPROVE" : "UPDATE",
      entityType: "PortfolioScenario", entityId: scenario.id, entityName: scenario.name,
      before: { status: scenario.status }, after: { status: next, note: body.note },
      context: "Executive portfolio decision workflow",
    });
    return ok({ scenario: { id: updated.id, status: updated.status, decidedBy: updated.decidedBy, decidedAt: updated.decidedAt } });
  }

  // ---- action: "optimize" — the one-click executive run ----
  const adminCfg = await loadAdminConfig();
  const { config, presetKey, projects } = await resolveConfig(body.config);
  const scoredCount = projects.filter((p) => p.score).length;
  if (scoredCount === 0) throw new ApiError(400, "No scored projects — run a scoring workshop first (Projects → score each project's criteria)");

  // Pass 1: selection without resource metrics to learn the chosen set; Pass 2: full metrics.
  const pass1 = runExecutiveOptimization(projects, config, new Map());
  const resourceRaw = await loadResourceRaw();
  const resource = resourceRaw ? shapeResourceModel(resourceRaw, new Set(pass1.selected.map((d) => d.candidate.id))) : null;
  const result = runExecutiveOptimization(projects, config, resourceRaw ? resourceRaw.perProjectWeekly : new Map());

  const health = portfolioHealth(result, resource, config, { budgetUtilAmberPct: adminCfg.ragBudgetUtilPct, capacityUtilAmberPct: adminCfg.ragCapacityUtilPct });
  const recommendation = buildRecommendation(result, config, health);
  const cards = buildDecisionCards(result);
  const actions = buildActions(result, resource);
  const insights = buildInsights(projects, result, resource, config);
  const beforeAfter = buildBeforeAfter(projects, result, config);
  const scorecard = buildScorecard(projects, result, resource, config);
  const strategyMap = buildStrategyMap(projects, result);
  const budgetAllocation = buildBudgetAllocation(projects, result, config);
  const resourceFeasibility = buildResourceFeasibility(resource, result);
  const dependencyImpacts = buildDependencyImpacts(projects, result);

  // What-changed vs the previous scenario (§21)
  const previous = await db.portfolioScenario.findFirst({ where: { createdAt: { lt: new Date() } }, orderBy: { createdAt: "desc" } });
  let whatChanged = null as ReturnType<typeof diffScenarios>;
  if (previous) {
    const prevStored = fromJson<StoredResult | null>(previous.resultsJson, null);
    if (prevStored?.selected) {
      whatChanged = diffScenarios(prevStored as unknown as ExecOptimizationResult, result);
    }
  }

  const kpis = [
    { label: "Portfolio Value", value: result.totalValue, unit: "money" },
    { label: "Investment", value: result.metrics.investment, unit: "money" },
    { label: "Expected ROI", value: result.metrics.roiPct, unit: "pct" },
    { label: "NPV", value: result.metrics.npv, unit: "money" },
    { label: "Strategic Alignment", value: result.metrics.strategicAlignmentPct, unit: "pct" },
    { label: "Portfolio Score", value: result.metrics.avgScore, unit: "score" },
    { label: "Capacity Utilization", value: resource ? Math.round((resource.selectedWeeklyDemand / Math.max(1, resource.totalWeeklyCapacity)) * 1000) / 10 : 0, unit: "pct" },
    { label: "Budget Utilization", value: config.budget > 0 ? Math.round((result.totalCost / config.budget) * 1000) / 10 : 0, unit: "pct" },
  ];

  const stored: StoredResult = {
    config,
    metrics: result.metrics,
    totalCost: result.totalCost, remainingBudget: result.remainingBudget,
    totalScore: result.totalScore, totalValue: result.totalValue,
    selected: slimDecisions(result.selected), excluded: slimDecisions(result.excluded),
    constraintViolations: result.constraintViolations,
    health, recommendation, cards, actions, insights, beforeAfter, whatChanged,
    scorecard, strategyMap, budgetAllocation, resourceFeasibility, dependencyImpacts, kpis,
  };

  const scenario = await db.portfolioScenario.create({
    data: {
      name: body.name ?? `${SCENARIO_PRESETS.find((p) => p.key === presetKey)?.label ?? "Custom optimization"} — ${new Date().toISOString().slice(0, 10)}`,
      budget: config.budget, maxProjects: config.maxProjects ?? null,
      selectedJson: toJson(stored.selected), excludedJson: toJson(stored.excluded),
      totalScore: result.totalScore, invested: result.totalCost,
      status: "OPTIMIZED", scenarioKey: presetKey, createdBy: session.id, ownerName: session.name,
      totalValue: result.totalValue, weightsJson: toJson(config.weights),
      constraintsJson: toJson({ ...config, presetKey }),
      resultsJson: toJson(stored), engineVersion: ENGINE_VERSION,
      previousScenarioId: previous?.id ?? null,
    },
  });

  await writeAudit({
    userId: session.id, userName: session.name, action: "CREATE", entityType: "PortfolioScenario",
    entityId: scenario.id, entityName: scenario.name,
    after: { preset: presetKey, budget: config.budget, selected: result.selected.length, excluded: result.excluded.length, totalValue: result.totalValue, health: health.level },
    context: "Executive one-click optimization",
  });

  return ok({
    scenarioId: scenario.id, scenarioName: scenario.name, status: scenario.status,
    presetKey, engineVersion: ENGINE_VERSION,
    result: stored,
  }, 201);
}, { permission: "portfolio.view", rateLimit: { limit: 60, windowMs: 60_000 } });
