// PM CONTROL TOWER — Executive Portfolio Decision Engine (pure)
// Builds the executive decision layer ON TOP of the existing prioritization engine:
// scoring always goes through weightedScore() and selection always goes through
// optimizePortfolio() from ./prioritization — this module only re-weights, simulates,
// explains and formats. No selection logic is re-implemented here.

import {
  Criterion, Candidate, SelectionDecision, OptimizedPortfolio,
  weightedScore, classify, optimizePortfolio,
} from "./prioritization";

export const ENGINE_VERSION = "2.8.0";

// ---------- Scenario presets (§5) — each maps to a weight vector + constraints ----------
export interface ScenarioPreset {
  key: string;
  label: string;
  description: string;
  weights: Record<string, number>; // criterion id → weight; totals 100
  budgetFactor?: number;           // multiplier on the approved budget (default 1)
  maxProjectsFactor?: number;      // multiplier on current funded project count (default none)
  riskTolerance: "LOW" | "MEDIUM" | "HIGH";
  minRoiPct?: number;              // exclude optional candidates below this ROI
}

const W = (strategic: number, value: number, customer: number, risk: number, compliance: number, roi: number, urgency: number) =>
  ({ strategic, value, customer, risk, compliance, roi, urgency });

export const SCENARIO_PRESETS: ScenarioPreset[] = [
  { key: "MAXIMIZE_STRATEGIC_VALUE", label: "Maximize Strategic Value", description: "Weights strategic alignment and customer impact above all.", weights: W(35, 15, 20, 15, 5, 5, 5), riskTolerance: "MEDIUM" },
  { key: "STAY_WITHIN_BUDGET", label: "Stay Within Budget", description: "Approves budget as-is, favors lower-cost high-density projects.", weights: W(20, 15, 10, 10, 5, 30, 10), budgetFactor: 1, riskTolerance: "MEDIUM" },
  { key: "REDUCE_RISK", label: "Reduce Risk", description: "Prefers risk-reduction and compliance work; defers speculative bets.", weights: W(15, 10, 10, 35, 20, 5, 5), riskTolerance: "LOW" },
  { key: "ACCELERATE_GROWTH", label: "Accelerate Growth", description: "Revenue and urgency weighted hard; accepts higher risk.", weights: W(20, 35, 15, 5, 5, 10, 10), riskTolerance: "HIGH" },
  { key: "PROTECT_MANDATORY", label: "Protect Mandatory Projects", description: "Regulatory and contractual projects are funded first, value second.", weights: W(20, 15, 10, 10, 35, 5, 5), riskTolerance: "LOW" },
  { key: "OPTIMIZE_RESOURCES", label: "Optimize Resources", description: "Favors value-dense projects that fit existing team capacity.", weights: W(20, 20, 10, 10, 5, 30, 5), riskTolerance: "MEDIUM" },
  { key: "IMPROVE_ROI", label: "Improve ROI", description: "Cost efficiency dominates; low-return projects are deferred.", weights: W(15, 15, 5, 10, 5, 40, 10), minRoiPct: 25, riskTolerance: "MEDIUM" },
  { key: "CASH_CONSERVATION", label: "Cash Conservation", description: "Runs at a fraction of the approved budget with strict ROI floor.", weights: W(15, 15, 5, 10, 10, 40, 5), budgetFactor: 0.6, minRoiPct: 30, riskTolerance: "LOW" },
  { key: "AGGRESSIVE_GROWTH", label: "Aggressive Growth", description: "Stretches the budget to capture revenue and urgency now.", weights: W(15, 40, 15, 5, 0, 15, 10), budgetFactor: 1.15, riskTolerance: "HIGH" },
  { key: "BALANCED_PORTFOLIO", label: "Balanced Portfolio", description: "The default balanced scoring model.", weights: W(25, 20, 15, 15, 10, 10, 5), riskTolerance: "MEDIUM" },
];

// ---------- Input model (assembled server-side by the API route) ----------
export interface ExecProject {
  id: string;
  code: string;
  name: string;
  status: string;
  priority: string;
  riskLevel: string;
  ragStatus: string;
  portfolioId: string | null;
  programId: string | null;
  programName: string | null;
  objectiveId: string | null;
  objectiveName: string | null;
  businessUnit: string | null;
  currency: string;
  currentBudget: number;
  actualCost: number;
  startDate: string | null;
  endDate: string | null;
  plannedHours: number;
  actualHours: number;
  progress: number;
  score: {
    weighted: number;          // recomputed under the scenario weight vector
    system: number;            // stored weightedScore (default weights)
    scores: Record<string, number>;
    classification: string;
    costEstimate: number;
    expectedValue: number;
    mandatory: boolean;
    dependsOn: string[];
    overridden: boolean;
    overrideReason: string | null;
    overrideBy: string | null;
  } | null;
  businessCase: {
    npv: number | null; roiPct: number | null; irr: number | null; paybackYears: number | null;
    recommendation: string; capex: number; opex: number;
    annualBenefits: { type: string; annualValue: number }[];
  } | null;
}

export interface ExecResourceModel {
  totalWeeklyCapacity: number;   // Σ active resource capacity hours/week
  currentWeeklyLoad: number;     // Σ weekly allocation across ALL active assignments (today's portfolio)
  selectedWeeklyDemand: number;  // Σ weekly allocation of the RECOMMENDED portfolio's projects
  byDepartment: { department: string; capacityWeekly: number; demandWeekly: number }[];
  bottlenecks: { resourceId: string; name: string; title: string | null; department: string | null; capacityWeekly: number; demandWeekly: number }[];
}

export interface ExecOptimizationConfig {
  budget: number;
  maxProjects?: number;
  presetKey?: string;
  weights: Criterion[];
  minRoiPct?: number;
  riskTolerance: "LOW" | "MEDIUM" | "HIGH";
  capexLimit?: number;
  opexLimit?: number;
  minStrategicAlignment?: number; // 0-100 minimum average strategic criterion in the selected portfolio
  maxPortfolioRisk?: "LOW" | "MEDIUM" | "HIGH";
}

// ---------- Internal candidate with extended economics ----------
interface ExtCandidate extends Candidate {
  expectedValue: number; cost: number; score: number;
  roiPct: number; strategic: number; riskScore: number; // riskScore = risk criterion (higher = better)
  mandatory: boolean; dependsOn: string[];
  capex: number; opex: number; npv: number | null;
  project: ExecProject;
}

function toExt(p: ExecProject, weights: Criterion[]): ExtCandidate {
  const s = p.score;
  const cost = s?.costEstimate ?? p.currentBudget ?? 0;
  const expectedValue = s?.expectedValue ?? 0;
  const weighted = s ? weightedScore(s.scores, weights) : 0;
  return {
    id: p.id, name: `${p.code} — ${p.name}`, score: s ? (s.overridden ? s.weighted : weighted) : 0,
    cost, expectedValue,
    dependsOn: s?.dependsOn ?? [], required: s?.mandatory ?? false,
    roiPct: cost > 0 ? (expectedValue / cost) * 100 : (p.businessCase?.roiPct ?? 0),
    strategic: s?.scores?.["strategic"] ?? 0,
    riskScore: s?.scores?.["risk"] ?? 0,
    mandatory: s?.mandatory ?? false,
    capex: p.businessCase?.capex ?? 0,
    opex: p.businessCase?.opex ?? 0,
    npv: p.businessCase?.npv ?? null,
    project: p,
  };
}

const sum = (arr: number[]) => arr.reduce((s, v) => s + v, 0);
const r2 = (v: number) => Math.round(v * 100) / 100;
const r1 = (v: number) => Math.round(v * 10) / 10;
const pct = (num: number, den: number) => (den > 0 ? r1((num / den) * 100) : 0);
const RISK_RANK: Record<string, number> = { LOW: 1, MEDIUM: 2, HIGH: 3 };

// ---------- Portfolio metrics from a set of selection decisions ----------
interface PortfolioMetrics {
  investment: number; value: number; roiPct: number; avgScore: number;
  npv: number; capex: number; opex: number;
  strategicAlignmentPct: number; riskIndex: number; // 0-100 riskScore-weighted (higher = better risk posture)
  projectCount: number; mandatoryCount: number;
  weeklyDemand: number;
}

function metricsOf(selected: ExtCandidate[], resourceByProject: Map<string, number>): PortfolioMetrics {
  const investment = sum(selected.map((c) => c.cost));
  const value = sum(selected.map((c) => c.expectedValue));
  const npvKnown = selected.filter((c) => c.npv != null);
  return {
    investment: r2(investment),
    value: r2(value),
    roiPct: investment > 0 ? r1(((value - investment) / investment) * 100) : 0,
    avgScore: selected.length ? r1(selected.reduce((s, c) => s + c.score, 0) / selected.length) : 0,
    npv: r2(sum(npvKnown.map((c) => c.npv!))),
    capex: r2(sum(selected.map((c) => c.capex))),
    opex: r2(sum(selected.map((c) => c.opex))),
    strategicAlignmentPct: selected.length ? r1(selected.reduce((s, c) => s + c.strategic, 0) / selected.length) : 0,
    riskIndex: selected.length ? r1(selected.reduce((s, c) => s + c.riskScore, 0) / selected.length) : 0,
    projectCount: selected.length,
    mandatoryCount: selected.filter((c) => c.mandatory).length,
    weeklyDemand: r2(sum(selected.map((c) => resourceByProject.get(c.id) ?? 0))),
  };
}

// ---------- Constraint-aware optimization: presets/min-ROI/alignment/capex-opex act as
// candidate gates, actual selection is still optimizePortfolio() ----------
export interface ExecOptimizationResult {
  selected: SelectionDecision[];
  excluded: SelectionDecision[];
  totalCost: number; remainingBudget: number; totalScore: number; totalValue: number;
  metrics: PortfolioMetrics;
  constraintViolations: string[]; // explanations when gates invalidated the run
}

function gateCandidates(candidates: ExtCandidate[], config: ExecOptimizationConfig): { gated: ExtCandidate[]; gates: Map<string, string> } {
  const gates = new Map<string, string>();
  const gated = candidates.filter((c) => {
    if (c.mandatory) return true; // gates never exclude mandatory projects
    if (config.minRoiPct != null && c.cost > 0 && c.roiPct < config.minRoiPct) {
      gates.set(c.id, `ROI ${r1(c.roiPct)}% below the ${config.minRoiPct}% floor for this scenario`);
      return false;
    }
    if (config.minStrategicAlignment != null && c.strategic < config.minStrategicAlignment) {
      gates.set(c.id, `Strategic alignment ${c.strategic} below the ${config.minStrategicAlignment} minimum for this scenario`);
      return false;
    }
    if (config.maxPortfolioRisk && RISK_RANK[(c.project.riskLevel || "MEDIUM").toUpperCase()] > RISK_RANK[config.maxPortfolioRisk]) {
      gates.set(c.id, `Project risk ${c.project.riskLevel} exceeds the ${config.maxPortfolioRisk} portfolio risk ceiling`);
      return false;
    }
    return true;
  });
  return { gated, gates };
}

export function runExecutiveOptimization(
  projects: ExecProject[],
  config: ExecOptimizationConfig,
  resourceByProject: Map<string, number>,
): ExecOptimizationResult {
  const all = projects.map((p) => toExt(p, config.weights));
  const { gated, gates } = gateCandidates(all, config);
  const budget = Math.max(0, config.budget);

  const engineIn: Candidate[] = gated.map((c) => ({
    id: c.id, name: c.name, score: c.score, cost: c.cost, expectedValue: c.expectedValue,
    dependsOn: c.dependsOn, required: c.mandatory,
  }));
  const base: OptimizedPortfolio = optimizePortfolio(engineIn, budget, config.maxProjects);

  const byId = new Map(all.map((c) => [c.id, c]));
  const selected = base.selected.map((d) => byId.get(d.candidate.id)!);
  const excluded = base.excluded.map((d) => {
    const c = byId.get(d.candidate.id)!;
    const gate = gates.get(c.id);
    const reason = gate ?? d.reason;
    return { candidate: c, selected: false, reason };
  });
  // Gated-out (never reached the engine) appear as excluded with their gate reason.
  for (const c of all) {
    if (!gates.has(c.id)) continue;
    if (selected.some((s) => s.id === c.id) || excluded.some((e) => e.candidate.id === c.id)) continue;
    excluded.push({ candidate: c, selected: false, reason: gates.get(c.id)! });
  }

  const metrics = metricsOf(selected, resourceByProject);
  const constraintViolations: string[] = [];
  const unfundedMandatory = excluded.filter((e) => e.candidate.mandatory);
  if (unfundedMandatory.length > 0) {
    constraintViolations.push(`${unfundedMandatory.length} mandatory project(s) could not be funded within ${r2(budget)} — additional ${r2(sum(unfundedMandatory.map((e) => e.candidate.cost)))} required.`);
  }
  if (config.capexLimit != null && metrics.capex > config.capexLimit) {
    constraintViolations.push(`CAPEX ${r2(metrics.capex)} exceeds the ${r2(config.capexLimit)} limit.`);
  }
  if (config.opexLimit != null && metrics.opex > config.opexLimit) {
    constraintViolations.push(`OPEX ${r2(metrics.opex)} exceeds the ${r2(config.opexLimit)} limit.`);
  }
  if (config.minStrategicAlignment != null && metrics.strategicAlignmentPct < config.minStrategicAlignment) {
    constraintViolations.push(`Portfolio strategic alignment ${metrics.strategicAlignmentPct} is below the ${config.minStrategicAlignment} minimum.`);
  }

  return {
    selected: selected.map((c) => ({ candidate: c, selected: true, reason: base.selected.find((d) => d.candidate.id === c.id)?.reason ?? "Selected" })),
    excluded,
    totalCost: base.totalCost, remainingBudget: base.remainingBudget,
    totalScore: base.totalScore, totalValue: base.totalValue,
    metrics, constraintViolations,
  };
}

// ---------- Executive decision cards (§3) ----------
export type DecisionCategory = "INVEST" | "ACCELERATE" | "DEFER" | "STOP_REVIEW" | "PROTECT" | "WATCH";

export interface ExecCard {
  category: DecisionCategory;
  title: string;
  description: string;
  projects: { id: string; code: string; name: string; score: number; cost: number; value: number; roiPct: number; risk: string; reason: string }[];
  count: number; investment: number; expectedValue: number; avgScore: number;
  risk: string; keyReason: string;
}

const CARD_META: Record<DecisionCategory, { title: string; description: string }> = {
  INVEST: { title: "Invest", description: "Recommended for funding in the optimized portfolio." },
  ACCELERATE: { title: "Accelerate", description: "Additional funding or resources could increase delivered value." },
  DEFER: { title: "Defer", description: "Should move to a later period — budget, capacity or sequencing." },
  STOP_REVIEW: { title: "Stop / Review", description: "Low value or high risk — requires leadership review." },
  PROTECT: { title: "Protect", description: "Mandatory, regulatory, contractual or strategically critical." },
  WATCH: { title: "Watch", description: "Monitor before committing — incomplete scoring or missing data." },
};

export function buildDecisionCards(result: ExecOptimizationResult): ExecCard[] {
  const selected = result.selected.map((d) => d.candidate as ExtCandidate);
  const excluded = result.excluded.map((d) => d.candidate as ExtCandidate);
  const selectedIds = new Set(selected.map((c) => c.id));

  const invest = selected.filter((c) => !c.mandatory && c.roiPct >= 25 && c.riskScore >= 40);
  const accelerate = selected.filter((c) => !c.mandatory && (c.roiPct >= 60 || (c.riskScore >= 60 && c.strategic >= 60)) && !invest.includes(c));
  const protect = selected.filter((c) => c.mandatory);
  const unfundedMandatory = excluded.filter((c) => c.mandatory);
  const defer = excluded.filter((c) => !c.mandatory && (c.score >= 60) && !unfundedMandatory.includes(c));
  const stopReview = excluded.filter((c) => !c.mandatory && c.score < 60);
  const watch = allWatch(selected, result);

  const mk = (category: DecisionCategory, items: ExtCandidate[], keyReason: string, riskFallback = "MEDIUM"): ExecCard => {
    const investment = r2(sum(items.map((c) => c.cost)));
    const value = r2(sum(items.map((c) => c.expectedValue)));
    const highRisk = items.filter((c) => (c.project.riskLevel || "").toUpperCase() === "HIGH").length;
    return {
      category, ...CARD_META[category],
      projects: items.map((c) => ({
        id: c.id, code: c.project.code, name: c.project.name, score: c.score, cost: c.cost,
        value: c.expectedValue, roiPct: r1(c.roiPct), risk: c.project.riskLevel,
        reason: result.excluded.find((e) => e.candidate.id === c.id)?.reason
          ?? result.selected.find((e) => e.candidate.id === c.id)?.reason ?? "",
      })),
      count: items.length, investment, expectedValue: value,
      avgScore: items.length ? r1(sum(items.map((c) => c.score)) / items.length) : 0,
      risk: highRisk > items.length / 2 ? "HIGH" : highRisk > 0 ? "MEDIUM" : riskFallback,
      keyReason,
    };
  };

  return [
    mk("INVEST", invest, "High score, healthy ROI and manageable risk — fund first."),
    mk("ACCELERATE", accelerate, "Above-average return or strategic weight — extra funding converts to extra value."),
    mk("PROTECT", [...protect, ...unfundedMandatory], unfundedMandatory.length ? `${unfundedMandatory.length} mandatory project(s) are currently unfunded — resolve before approval.` : "Mandatory / regulatory commitments are covered."),
    mk("DEFER", defer, "Viable projects held back by budget, dependency or capacity constraints this cycle."),
    mk("STOP_REVIEW", stopReview, "Score below 60 — low strategic contribution relative to ask."),
    mk("WATCH", watch, "Missing cost/value estimates or incomplete scoring — data quality blocks a decision."),
  ];
}

function allWatch(selected: ExtCandidate[], result: ExecOptimizationResult): ExtCandidate[] {
  const chosen = new Set([...selected.map((c) => c.id)]);
  return selected.filter((c) => c.cost <= 0 || c.expectedValue <= 0).concat(
    result.excluded.map((d) => d.candidate as ExtCandidate).filter(
      (c) => !chosen.has(c.id) && (c.cost <= 0 || c.expectedValue <= 0),
    ),
  );
}

// ---------- RAG health (§23) ----------
export interface ExecHealth { level: "GREEN" | "AMBER" | "RED"; reasons: string[] }

export interface ExecHealthThresholds { budgetUtilAmberPct?: number; capacityUtilAmberPct?: number }

export function portfolioHealth(
  result: ExecOptimizationResult,
  resource: ExecResourceModel | null,
  config: ExecOptimizationConfig,
  thresholds: ExecHealthThresholds = {},
): ExecHealth {
  const budgetAmber = thresholds.budgetUtilAmberPct ?? 97;
  const capacityAmber = thresholds.capacityUtilAmberPct ?? 90;
  const reasons: string[] = [];
  let level: ExecHealth["level"] = "GREEN";

  if (result.constraintViolations.length > 0) {
    reasons.push(...result.constraintViolations);
    level = "RED";
  }
  const budgetUsed = pct(result.totalCost, config.budget);
  if (budgetUsed > 100) { reasons.push(`Budget exceeded by ${r1(budgetUsed - 100)}%.`); level = "RED"; }
  else if (budgetUsed > budgetAmber) { reasons.push(`Budget utilization at ${budgetUsed}% — no contingency headroom.`); if (level === "GREEN") level = "AMBER"; }

  if (resource) {
    const util = pct(resource.selectedWeeklyDemand, resource.totalWeeklyCapacity);
    if (util > 100) { reasons.push(`Resource capacity exceeded by ${r1(util - 100)}% (${resource.bottlenecks.length} bottleneck resource(s)).`); level = "RED"; }
    else if (util > capacityAmber) { reasons.push(`Resource utilization at ${util}% — thin delivery buffer.`); if (level === "GREEN") level = "AMBER"; }
    const currentUtil = pct(resource.currentWeeklyLoad, resource.totalWeeklyCapacity);
    if (currentUtil > 100 && util <= 100) reasons.push(`Today's portfolio exceeds capacity by ${r1(currentUtil - 100)}% — the recommended portfolio resolves this.`);
  }
  const dependencyBlocked = result.excluded.filter((e) => (e.reason || "").startsWith("Dependency not funded"));
  if (dependencyBlocked.length > 0) {
    reasons.push(`${dependencyBlocked.length} project(s) blocked by unfunded dependencies.`);
    if (level === "GREEN") level = "AMBER";
  }
  if (result.metrics.riskIndex > 0 && result.metrics.riskIndex < 40 && level === "GREEN") {
    reasons.push(`Portfolio risk posture is weak (risk-reduction index ${result.metrics.riskIndex}).`);
    level = "AMBER";
  }
  if (reasons.length === 0) reasons.push("Portfolio optimized within budget, capacity and dependency constraints.");
  return { level, reasons };
}

// ---------- Recommendation + insights (§2, §22) — every figure from actual inputs ----------
export interface ExecRecommendation { headline: string; explanation: string; confidence: "HIGH" | "MEDIUM" | "LOW" }
export interface ExecInsight { text: string; severity: "INFO" | "WARNING" | "CRITICAL" }

export function buildRecommendation(result: ExecOptimizationResult, config: ExecOptimizationConfig, health: ExecHealth): ExecRecommendation {
  const m = result.metrics;
  if (health.level === "RED") {
    return {
      headline: "Resolve constraints before approving",
      explanation: `The optimization could not produce a fully viable portfolio: ${result.constraintViolations[0] ?? "constraints conflict"} Review the health panel and suggested resolutions.`,
      confidence: "HIGH",
    };
  }
  const proceed = m.mandatoryCount > 0
    ? `Proceed with the optimized portfolio — ${m.projectCount} projects including all ${m.mandatoryCount} mandatory commitment(s).`
    : `Proceed with the optimized portfolio — ${m.projectCount} projects.`;
  const explanation = `The optimized portfolio deploys ${r2(m.investment)} of the ${r2(config.budget)} budget (${pct(m.investment, config.budget)}% utilization), creating ${r2(m.value)} of expected value at ${m.roiPct}% ROI with ${m.strategicAlignmentPct}% average strategic alignment.`;
  return {
    headline: proceed,
    explanation,
    confidence: health.level === "GREEN" ? "HIGH" : "MEDIUM",
  };
}

export function buildInsights(
  projects: ExecProject[], result: ExecOptimizationResult,
  resource: ExecResourceModel | null, config: ExecOptimizationConfig,
): ExecInsight[] {
  const out: ExecInsight[] = [];
  const selected = result.selected.map((d) => d.candidate as ExtCandidate);
  const excluded = result.excluded.map((d) => d.candidate as ExtCandidate);

  // 1. Budget vs value trade
  const baselineValue = sum(projects.map((p) => p.score?.expectedValue ?? 0));
  const baselineCost = sum(projects.map((p) => p.score?.costEstimate ?? 0));
  if (baselineCost > 0 && result.totalCost > 0) {
    const vDelta = pct(result.totalValue - baselineValue, Math.abs(baselineValue) || 1);
    const cDelta = pct(result.totalCost - baselineCost, baselineCost);
    out.push({
      text: `Recommended portfolio deploys ${Math.abs(cDelta)}% ${cDelta >= 0 ? "more" : "less"} investment than funding everything, and captures ${r2(result.totalValue)} of ${r2(baselineValue)} total addressable value.`,
      severity: cDelta < 0 ? "INFO" : "WARNING",
    });
  }

  // 2. Capacity concentration
  if (resource && resource.byDepartment.length > 0) {
    const top = [...resource.byDepartment].sort((a, b) => b.demandWeekly - a.demandWeekly)[0];
    if (top && top.capacityWeekly > 0) {
      const share = pct(top.demandWeekly, top.capacityWeekly);
      out.push({ text: `${top.department || "Unassigned"} consumes the largest capacity share of the recommended portfolio (${share}% of that department's weekly capacity).`, severity: share > 85 ? "WARNING" : "INFO" });
    }
  }

  // 3. Blocked high-value projects
  const blockedHighValue = excluded.filter((c) => c.score >= 75 && ((result.excluded.find((e) => e.candidate.id === c.id)?.reason || "").includes("Dependency") || (result.excluded.find((e) => e.candidate.id === c.id)?.reason || "").includes("Budget")));
  if (blockedHighValue.length > 0) {
    out.push({ text: `${blockedHighValue.length} high-value project(s) (score ≥ 75) are currently blocked: ${blockedHighValue.slice(0, 3).map((c) => c.project.code).join(", ")}.`, severity: "WARNING" });
  }

  // 4. Low-alignment spend
  const lowAlignSpend = sum(selected.filter((c) => c.strategic < 40).map((c) => c.cost));
  if (lowAlignSpend > 0 && config.budget > 0) {
    out.push({ text: `${r2(lowAlignSpend)} (${pct(lowAlignSpend, config.budget)}% of budget) is allocated to projects with strategic alignment below 40.`, severity: "WARNING" });
  }

  // 5. Mandatory exposure
  const mandatorySpend = sum(selected.filter((c) => c.mandatory).map((c) => c.cost));
  if (mandatorySpend > 0 && result.totalCost > 0) {
    out.push({ text: `Mandatory/regulatory commitments absorb ${pct(mandatorySpend, result.totalCost)}% of the recommended investment (${r2(mandatorySpend)}).`, severity: pct(mandatorySpend, result.totalCost) > 40 ? "WARNING" : "INFO" });
  }

  // 6. Unfunded mandatory
  const unfunded = excluded.filter((c) => c.mandatory);
  if (unfunded.length > 0) {
    out.push({ text: `${unfunded.length} mandatory project(s) cannot be funded within the current budget: ${unfunded.map((c) => c.project.code).join(", ")}.`, severity: "CRITICAL" });
  }

  // 7. ROI concentration
  const topRoi = [...selected].sort((a, b) => b.roiPct - a.roiPct)[0];
  if (topRoi && topRoi.roiPct > 0) {
    out.push({ text: `${topRoi.project.code} delivers the highest return in the recommended portfolio (${r1(topRoi.roiPct)}% ROI, ${r2(topRoi.expectedValue)} expected value on ${r2(topRoi.cost)}).`, severity: "INFO" });
  }

  return out.slice(0, 7);
}

// ---------- "What should we do?" actions (§4) ----------
export interface ExecAction { id: string; text: string; type: string; meta: Record<string, unknown> }

export function buildActions(result: ExecOptimizationResult, resource: ExecResourceModel | null): ExecAction[] {
  const actions: ExecAction[] = [];
  const selected = result.selected.map((d) => d.candidate as ExtCandidate);
  const excluded = result.excluded.map((d) => d.candidate as ExtCandidate);
  const invest = selected.filter((c) => !c.mandatory);
  if (invest.length > 0) actions.push({ id: "fund", text: `Fund ${invest.length} project${invest.length === 1 ? "" : "s"}`, type: "FUND", meta: { projectIds: invest.map((c) => c.id), amount: r2(sum(invest.map((c) => c.cost))) } });
  const deferred = excluded.filter((c) => !c.mandatory && c.score >= 60);
  if (deferred.length > 0) actions.push({ id: "defer", text: `Defer ${deferred.length} project${deferred.length === 1 ? "" : "s"} to a later cycle`, type: "DEFER", meta: { projectIds: deferred.map((c) => c.id), amount: r2(sum(deferred.map((c) => c.cost))) } });
  const review = excluded.filter((c) => !c.mandatory && c.score < 60);
  if (review.length > 0) actions.push({ id: "review", text: `Review ${review.length} low-score project${review.length === 1 ? "" : "s"} for stop/re-scope`, type: "REVIEW", meta: { projectIds: review.map((c) => c.id) } });
  const mandatory = selected.filter((c) => c.mandatory);
  if (mandatory.length > 0) actions.push({ id: "protect", text: `Protect ${mandatory.length} mandatory project${mandatory.length === 1 ? "" : "s"}`, type: "PROTECT", meta: { projectIds: mandatory.map((c) => c.id), amount: r2(sum(mandatory.map((c) => c.cost))) } });
  if (result.remainingBudget > 0) actions.push({ id: "reallocate", text: `Reallocate ${r2(result.remainingBudget)} unallocated budget (or return it)`, type: "REALLOCATE", meta: { amount: result.remainingBudget } });
  if (resource && resource.bottlenecks.length > 0) actions.push({ id: "conflicts", text: `Resolve ${resource.bottlenecks.length} resource bottleneck${resource.bottlenecks.length === 1 ? "" : "s"}`, type: "RESOURCE_CONFLICT", meta: { resources: resource.bottlenecks.map((b) => b.name) } });
  const blocked = excluded.filter((c) => (result.excluded.find((e) => e.candidate.id === c.id)?.reason || "").startsWith("Dependency not funded"));
  if (blocked.length > 0) actions.push({ id: "dependencies", text: `Fund ${blocked.length} dependency-linked project${blocked.length === 1 ? "" : "s"} or formally drop the dependent work`, type: "DEPENDENCY", meta: { projectIds: blocked.map((c) => c.id) } });
  return actions;
}

// ---------- Before/after comparison (§7) ----------
export interface BeforeAfterRow { metric: string; current: string; recommended: string; change: string; improved: boolean }

export function buildBeforeAfter(projects: ExecProject[], result: ExecOptimizationResult, config: ExecOptimizationConfig): BeforeAfterRow[] {
  const active = projects.filter((p) => ["ACTIVE", "ON_HOLD"].includes((p.status || "").toUpperCase()));
  const base = projects.map((p) => p.score).filter(Boolean) as NonNullable<ExecProject["score"]>[];
  const currentInvestment = sum(active.map((p) => p.currentBudget)) || sum(base.map((s) => s.costEstimate));
  const currentValue = sum(base.map((s) => s.expectedValue));
  const currentScore = base.length ? r1(sum(base.map((s) => (s.overridden ? s.weighted : weightedScore(s.scores, config.weights)))) / base.length) : 0;
  const currentRisk = base.length ? r1(sum(base.map((s) => s.scores?.["risk"] ?? 0)) / base.length) : 0;
  const currentStrategic = base.length ? r1(sum(base.map((s) => s.scores?.["strategic"] ?? 0)) / base.length) : 0;
  const m = result.metrics;

  const rows: BeforeAfterRow[] = [
    { metric: "Investment", current: r2(currentInvestment).toString(), recommended: r2(m.investment).toString(), change: r2(m.investment - currentInvestment).toString(), improved: m.investment <= currentInvestment },
    { metric: "Expected Value", current: r2(currentValue).toString(), recommended: r2(m.value).toString(), change: r2(m.value - currentValue).toString(), improved: m.value >= currentValue },
    { metric: "ROI", current: currentInvestment > 0 ? `${r1(((currentValue - currentInvestment) / currentInvestment) * 100)}%` : "—", recommended: `${m.roiPct}%`, change: `${m.roiPct - (currentInvestment > 0 ? r1(((currentValue - currentInvestment) / currentInvestment) * 100) : 0)} pts`, improved: m.roiPct >= (currentInvestment > 0 ? ((currentValue - currentInvestment) / currentInvestment) * 100 : 0) },
    { metric: "Strategic Alignment", current: `${currentStrategic}%`, recommended: `${m.strategicAlignmentPct}%`, change: `${r1(m.strategicAlignmentPct - currentStrategic)} pts`, improved: m.strategicAlignmentPct >= currentStrategic },
    { metric: "Risk Posture (risk-reduction index)", current: currentRisk.toFixed(0), recommended: m.riskIndex.toFixed(0), change: `${r1(m.riskIndex - currentRisk)} pts`, improved: m.riskIndex >= currentRisk },
    { metric: "Projects", current: String(base.length), recommended: String(m.projectCount), change: `${m.projectCount - base.length}`, improved: true },
    { metric: "Budget Utilization", current: "100%", recommended: `${pct(m.investment, config.budget)}%`, change: `${pct(m.investment, config.budget) - 100} pts`, improved: pct(m.investment, config.budget) <= 100 },
  ];
  return rows;
}

// ---------- What-changed vs previous scenario (§21) ----------
export interface WhatChanged {
  added: string[]; removed: string[]; deferred: string[]; accelerated: string[];
  budgetDelta: number; investmentDelta: number; valueDelta: number; scoreDelta: number;
  investmentDeltaPct: number; valueDeltaPct: number; riskDelta: number;
  summary: string[];
}

export function diffScenarios(prevResult: ExecOptimizationResult | null, nextResult: ExecOptimizationResult): WhatChanged | null {
  if (!prevResult) return null;
  const prevIds = new Set(prevResult.selected.map((d) => d.candidate.id));
  const nextIds = new Set(nextResult.selected.map((d) => d.candidate.id));
  const nameOf = (id: string, r: ExecOptimizationResult) => {
    const c = [...r.selected, ...r.excluded].find((d) => d.candidate.id === id)?.candidate;
    return c ? String(c.name).split(" — ")[0] : id;
  };
  const added = [...nextIds].filter((id) => !prevIds.has(id)).map((id) => nameOf(id, nextResult));
  const removed = [...prevIds].filter((id) => !nextIds.has(id)).map((id) => nameOf(id, prevResult));
  const scoreOf = (r: ExecOptimizationResult, id: string) => ([...r.selected, ...r.excluded].find((d) => d.candidate.id === id)?.candidate as ExtCandidate | undefined)?.score ?? 0;
  const accelerated = [...nextIds].filter((id) => prevIds.has(id) && scoreOf(nextResult, id) > scoreOf(prevResult, id) + 2).map((id) => nameOf(id, nextResult));
  const deferred = [...prevIds].filter((id) => nextIds.has(id) && scoreOf(nextResult, id) < scoreOf(prevResult, id) - 2).map((id) => nameOf(id, nextResult));
  const investmentDelta = r2(nextResult.totalCost - prevResult.totalCost);
  const valueDelta = r2(nextResult.totalValue - prevResult.totalValue);
  const summary: string[] = [];
  if (added.length) summary.push(`${added.length} project(s) added`);
  if (removed.length) summary.push(`${removed.length} project(s) removed`);
  if (deferred.length) summary.push(`${deferred.length} project(s) deprioritized`);
  if (accelerated.length) summary.push(`${accelerated.length} project(s) increased in priority`);
  summary.push(`${investmentDelta >= 0 ? "+" : ""}${r2(investmentDelta)} investment change`);
  summary.push(`${valueDelta >= 0 ? "+" : ""}${r2(valueDelta)} expected-value change`);
  return {
    added, removed, deferred, accelerated,
    budgetDelta: r2(nextResult.totalCost - prevResult.totalCost),
    investmentDelta, valueDelta,
    scoreDelta: r1(nextResult.metrics.avgScore - prevResult.metrics.avgScore),
    investmentDeltaPct: pct(investmentDelta, prevResult.totalCost || 1),
    valueDeltaPct: pct(valueDelta, prevResult.totalValue || 1),
    riskDelta: r1(nextResult.metrics.riskIndex - prevResult.metrics.riskIndex),
    summary,
  };
}

// ---------- What-if simulation (§16) ----------
export type WhatIfKind = "SET_BUDGET" | "ADD_BUDGET" | "CUT_BUDGET";
export interface WhatIfResult {
  kind: WhatIfKind; amount: number; newBudget: number;
  added: { code: string; name: string; cost: number; value: number }[];
  removed: { code: string; name: string; cost: number; value: number }[];
  roiBefore: number; roiAfter: number;
  valueBefore: number; valueAfter: number;
  strategicBefore: number; strategicAfter: number;
  riskBefore: string; riskAfter: string;
  weeklyDemandBefore: number; weeklyDemandAfter: number;
  narrative: string;
}

export function simulateWhatIf(
  projects: ExecProject[], config: ExecOptimizationConfig, resourceByProject: Map<string, number>,
  kind: WhatIfKind, amount: number,
): WhatIfResult {
  const base = runExecutiveOptimization(projects, config, resourceByProject);
  const newBudget = kind === "SET_BUDGET" ? amount : kind === "ADD_BUDGET" ? config.budget + amount : Math.max(0, config.budget - amount);
  const sim = runExecutiveOptimization(projects, { ...config, budget: newBudget }, resourceByProject);
  const codes = (r: ExecOptimizationResult) => new Map(r.selected.map((d) => {
    const c = d.candidate as ExtCandidate;
    return [c.id, { code: c.project.code, name: c.project.name, cost: c.cost, value: c.expectedValue }];
  }));
  const before = codes(base), after = codes(sim);
  const added = [...after.entries()].filter(([id]) => !before.has(id)).map(([, v]) => v);
  const removed = [...before.entries()].filter(([id]) => !after.has(id)).map(([, v]) => v);
  const riskLabel = (r: ExecOptimizationResult) => (r.metrics.riskIndex >= 60 ? "Low" : r.metrics.riskIndex >= 40 ? "Medium" : "High");
  const dir = kind === "ADD_BUDGET" ? `Additional ${r2(amount)} enables ${added.length} project(s) and increases expected portfolio value by ${r2(Math.max(0, sim.totalValue - base.totalValue))}.`
    : kind === "CUT_BUDGET" ? `A ${r2(amount)} reduction drops ${removed.length} project(s) and reduces expected portfolio value by ${r2(Math.max(0, base.totalValue - sim.totalValue))}.`
    : `At a ${r2(newBudget)} budget the portfolio holds ${sim.metrics.projectCount} project(s) with ${r2(sim.totalValue)} expected value.`;
  return {
    kind, amount: r2(amount), newBudget: r2(newBudget), added, removed,
    roiBefore: base.metrics.roiPct, roiAfter: sim.metrics.roiPct,
    valueBefore: base.totalValue, valueAfter: sim.totalValue,
    strategicBefore: base.metrics.strategicAlignmentPct, strategicAfter: sim.metrics.strategicAlignmentPct,
    riskBefore: riskLabel(base), riskAfter: riskLabel(sim),
    weeklyDemandBefore: base.metrics.weeklyDemand, weeklyDemandAfter: sim.metrics.weeklyDemand,
    narrative: dir,
  };
}

// ---------- "Best use of $X" (§17) and "Cut $X" (§18) ----------
export interface InvestSuggestion { code: string; name: string; cost: number; value: number; roiPct: number; reason: string }
export interface InvestAnswer { amount: number; suggestions: InvestSuggestion[]; totalCommitted: number; incrementalValue: number; leftover: number }

export function bestUseOf(projects: ExecProject[], config: ExecOptimizationConfig, amount: number): InvestAnswer {
  const base = runExecutiveOptimization(projects, config, new Map());
  const selectedIds = new Set(base.selected.map((d) => d.candidate.id));
  const candidates = projects
    .map((p) => toExt(p, config.weights))
    .filter((c) => !selectedIds.has(c.id) && c.cost > 0)
    .sort((a, b) => b.score / Math.max(b.cost, 1) - a.score / Math.max(a.cost, 1));
  const suggestions: InvestSuggestion[] = [];
  let remaining = Math.max(0, amount);
  for (const c of candidates) {
    if (c.cost <= remaining) {
      const missingDep = (c.dependsOn ?? []).find((d) => !selectedIds.has(d));
      if (missingDep) {
        const dep = projects.find((p) => p.id === missingDep);
        if (dep) suggestions.push({ code: dep.code, name: dep.name, cost: dep.score?.costEstimate ?? 0, value: dep.score?.expectedValue ?? 0, roiPct: 0, reason: `Prerequisite of ${c.project.code}` });
        continue;
      }
      suggestions.push({ code: c.project.code, name: c.project.name, cost: c.cost, value: c.expectedValue, roiPct: r1(c.roiPct), reason: `Score ${c.score} — best value density among fundable projects` });
      selectedIds.add(c.id);
      remaining -= c.cost;
    }
    if (remaining <= 0) break;
  }
  const incrementalValue = r2(sum(suggestions.map((s) => s.value)));
  return {
    amount: r2(amount), suggestions,
    totalCommitted: r2(sum(suggestions.map((s) => s.cost))),
    incrementalValue, leftover: r2(remaining),
  };
}

export interface CutOption { code: string; name: string; saving: number; valueLost: number; strategicImpact: "LOW" | "MEDIUM" | "HIGH"; riskImpact: "LOW" | "MEDIUM" | "HIGH"; reason: string }
export interface CutAnswer { amount: number; options: CutOption[]; totalSaving: number; valueLost: number; strategicDamage: "LOW" | "MEDIUM" | "HIGH" }

export function whereToCut(projects: ExecProject[], config: ExecOptimizationConfig, amount: number): CutAnswer {
  const base = runExecutiveOptimization(projects, config, new Map());
  // Cut order: lowest value density first, mandatory projects last (and flagged as protected).
  const cuttable = base.selected
    .map((d) => d.candidate as ExtCandidate)
    .sort((a, b) => (a.mandatory ? 1 : 0) - (b.mandatory ? 1 : 0) || (a.score / Math.max(a.cost, 1)) - (b.score / Math.max(b.cost, 1)));
  const options: CutOption[] = [];
  let remaining = Math.max(0, amount);
  for (const c of cuttable) {
    if (remaining <= 0) break;
    const strategic = c.strategic >= 70 ? "HIGH" : c.strategic >= 40 ? "MEDIUM" : "LOW";
    options.push({
      code: c.project.code, name: c.project.name, saving: c.cost, valueLost: c.expectedValue,
      strategicImpact: strategic as CutOption["strategicImpact"],
      riskImpact: (c.riskScore >= 60 ? "LOW" : c.riskScore >= 30 ? "MEDIUM" : "HIGH") as CutOption["riskImpact"],
      reason: c.mandatory ? `MANDATORY — cutting ${c.project.code} breaches regulatory/contractual commitments; only cut with explicit leadership sign-off` : `Lowest value density in the funded portfolio (score ${c.score} on ${r2(c.cost)})`,
    });
    remaining -= c.cost;
  }
  const totalSaving = r2(sum(options.map((o) => o.saving)));
  const valueLost = r2(sum(options.map((o) => o.valueLost)));
  const high = options.filter((o) => o.strategicImpact === "HIGH").length;
  return {
    amount: r2(amount), options, totalSaving, valueLost,
    strategicDamage: high > options.length / 2 ? "HIGH" : high > 0 ? "MEDIUM" : "LOW",
  };
}

// ---------- Scenario comparison (§32) ----------
export interface ScenarioComparisonRow { metric: string; a: string; b: string; delta: string }

export function compareScenarioResults(a: ExecOptimizationResult, b: ExecOptimizationResult, nameA: string, nameB: string): ScenarioComparisonRow[] {
  const row = (metric: string, av: number, bv: number, fmt: (v: number) => string = (v) => String(r2(v))): ScenarioComparisonRow =>
    ({ metric, a: fmt(av), b: fmt(bv), delta: fmt(bv - av) });
  return [
    row(`${nameA} investment`, a.totalCost, b.totalCost),
    row(`${nameB} — projects selected`, a.metrics.projectCount, b.metrics.projectCount, (v) => String(Math.round(v))),
    row("Average score", a.metrics.avgScore, b.metrics.avgScore),
    row("Expected value", a.totalValue, b.totalValue),
    row("ROI %", a.metrics.roiPct, b.metrics.roiPct),
    row("NPV (known cases)", a.metrics.npv, b.metrics.npv),
    row("Strategic alignment %", a.metrics.strategicAlignmentPct, b.metrics.strategicAlignmentPct),
    row("Risk posture index", a.metrics.riskIndex, b.metrics.riskIndex),
    row("CAPEX", a.metrics.capex, b.metrics.capex),
    row("OPEX", a.metrics.opex, b.metrics.opex),
  ];
}

// ---------- Scorecard (§10) ----------
export interface ScorecardRow { metric: string; score: number; basis: string }
export interface ExecScorecard { overall: number; rows: ScorecardRow[] }

export function buildScorecard(projects: ExecProject[], result: ExecOptimizationResult, resource: ExecResourceModel | null, config: ExecOptimizationConfig): ExecScorecard {
  const m = result.metrics;
  const selected = result.selected.map((d) => d.candidate as ExtCandidate);
  const revenue = sum(selected.flatMap((c) => (c.project.businessCase?.annualBenefits ?? []).filter((b) => b.type === "REVENUE").map((b) => b.annualValue)));
  const costSaving = sum(selected.flatMap((c) => (c.project.businessCase?.annualBenefits ?? []).filter((b) => b.type === "COST_SAVING").map((b) => b.annualValue)));
  const scoredCount = projects.filter((p) => p.score).length;
  const depBlocked = result.excluded.filter((e) => (e.reason || "").startsWith("Dependency not funded")).length;
  const rows: ScorecardRow[] = [
    { metric: "Strategic Value", score: m.strategicAlignmentPct, basis: "Average strategic-alignment criterion across funded projects" },
    { metric: "Financial Value", score: config.budget > 0 ? Math.min(100, pct(m.value, config.budget)) : 0, basis: "Expected value vs approved budget" },
    { metric: "ROI", score: Math.max(0, Math.min(100, m.roiPct)), basis: "Portfolio ROI capped at 100" },
    { metric: "NPV", score: m.npv > 0 ? Math.min(100, pct(m.npv, m.investment || 1)) : 0, basis: "NPV of projects with approved business cases" },
    { metric: "Risk", score: m.riskIndex, basis: "Average risk-reduction criterion (higher = better posture)" },
    { metric: "Customer Impact", score: avgCriterion(selected, "customer"), basis: "Average customer-impact criterion" },
    { metric: "Revenue Impact", score: Math.min(100, pct(revenue, m.investment || 1)), basis: "Annual revenue benefits vs investment" },
    { metric: "Cost Reduction", score: Math.min(100, pct(costSaving, m.investment || 1)), basis: "Annual cost-saving benefits vs investment" },
    { metric: "Compliance", score: avgCriterion(selected, "compliance"), basis: "Average compliance criterion" },
    { metric: "Urgency", score: avgCriterion(selected, "urgency"), basis: "Average urgency criterion" },
    { metric: "Resource Efficiency", score: resource && resource.selectedWeeklyDemand > 0 ? Math.max(0, Math.min(100, 100 - Math.max(0, pct(resource.selectedWeeklyDemand, resource.totalWeeklyCapacity) - 85) * 3)) : 50, basis: "Penalizes recommended-portfolio utilization above 85%" },
    { metric: "Capacity", score: resource && resource.totalWeeklyCapacity > 0 ? Math.max(0, 100 - Math.max(0, pct(resource.selectedWeeklyDemand, resource.totalWeeklyCapacity) - 100) * 5) : 50, basis: "Headroom after recommended demand" },
    { metric: "Dependency Health", score: Math.max(0, 100 - depBlocked * 20), basis: `${depBlocked} project(s) blocked by unfunded dependencies` },
    { metric: "Delivery Confidence", score: selected.length ? r1(sum(selected.map((c) => c.project.progress ?? 0)) / selected.length) : 0, basis: "Average progress of funded in-flight projects" },
    { metric: "Scoring Coverage", score: pct(scoredCount, projects.length || 1), basis: `${scoredCount}/${projects.length} projects scored` },
  ];
  const overall = r1(sum(rows.map((r) => r.score)) / rows.length);
  return { overall, rows };
}

function avgCriterion(selected: ExtCandidate[], id: string): number {
  if (!selected.length) return 0;
  return r1(sum(selected.map((c) => c.project.score?.scores?.[id] ?? 0)) / selected.length);
}

// ---------- Strategy alignment map (§11) ----------
export interface StrategyNode { objectiveId: string | null; objective: string; weight: number; investment: number; expectedBenefit: number; projects: { id: string; code: string; name: string; score: number; cost: number; value: number; selected: boolean; contribution: number }[] }

export function buildStrategyMap(projects: ExecProject[], result: ExecOptimizationResult): StrategyNode[] {
  const selectedIds = new Set(result.selected.map((d) => d.candidate.id));
  const byObjective = new Map<string, StrategyNode>();
  for (const p of projects) {
    const key = p.objectiveId ?? "__unassigned";
    if (!byObjective.has(key)) {
      byObjective.set(key, { objectiveId: p.objectiveId, objective: p.objectiveName ?? "Unassigned / Corporate Strategy", weight: 0, investment: 0, expectedBenefit: 0, projects: [] });
    }
    const node = byObjective.get(key)!;
    const s = p.score;
    node.projects.push({
      id: p.id, code: p.code, name: p.name,
      score: s?.weighted ?? 0, cost: s?.costEstimate ?? p.currentBudget, value: s?.expectedValue ?? 0,
      selected: selectedIds.has(p.id), contribution: s?.scores?.["strategic"] ?? 0,
    });
    node.investment += s?.costEstimate ?? p.currentBudget;
    node.expectedBenefit += s?.expectedValue ?? 0;
  }
  return [...byObjective.values()].map((n) => ({ ...n, investment: r2(n.investment), expectedBenefit: r2(n.expectedBenefit) }));
}

// ---------- Budget allocation (§13) ----------
export interface AllocationGroup { group: string; amount: number; share: number; projectCount: number }
export interface BudgetAllocation {
  approvedBudget: number; recommendedAllocation: number; unallocated: number; fundingGap: number; potentialSavings: number;
  byObjective: AllocationGroup[]; byProgram: AllocationGroup[]; byBusinessUnit: AllocationGroup[];
  byProject: AllocationGroup[]; capex: number; opex: number; byFiscalYear: AllocationGroup[];
}

export function buildBudgetAllocation(projects: ExecProject[], result: ExecOptimizationResult, config: ExecOptimizationConfig): BudgetAllocation {
  const selectedIds = new Set(result.selected.map((d) => d.candidate.id));
  const chosen = projects.filter((p) => selectedIds.has(p.id));
  const group = (keyOf: (p: ExecProject) => string): AllocationGroup[] => {
    const map = new Map<string, { amount: number; n: number }>();
    for (const p of chosen) {
      const k = keyOf(p) || "Unassigned";
      const cur = map.get(k) ?? { amount: 0, n: 0 };
      cur.amount += p.score?.costEstimate ?? p.currentBudget;
      cur.n += 1;
      map.set(k, cur);
    }
    const total = sum([...map.values()].map((v) => v.amount)) || 1;
    return [...map.entries()].map(([g, v]) => ({ group: g, amount: r2(v.amount), share: pct(v.amount, total), projectCount: v.n })).sort((a, b) => b.amount - a.amount);
  };
  const fy = (p: ExecProject) => (p.startDate ? `FY${new Date(p.startDate).getUTCFullYear()}` : "Unscheduled");
  const approvedBudget = config.budget;
  const recommended = result.totalCost;
  const addressable = sum(projects.map((p) => p.score?.costEstimate ?? 0));
  return {
    approvedBudget: r2(approvedBudget), recommendedAllocation: r2(recommended),
    unallocated: r2(Math.max(0, approvedBudget - recommended)),
    fundingGap: r2(Math.max(0, addressable - approvedBudget)),
    potentialSavings: r2(Math.max(0, addressable - recommended)),
    byObjective: group((p) => p.objectiveName ?? ""),
    byProgram: group((p) => p.programName ?? ""),
    byBusinessUnit: group((p) => p.businessUnit ?? ""),
    byProject: group((p) => `${p.code} — ${p.name}`),
    capex: result.metrics.capex, opex: result.metrics.opex,
    byFiscalYear: group(fy),
  };
}

// ---------- Resource-constrained view (§14) ----------
export interface ResourceFeasibility {
  deliverable: boolean;
  totalWeeklyCapacity: number; committedWeekly: number; selectedWeeklyDemand: number; availableWeekly: number;
  utilizationPct: number;
  byDepartment: { department: string; capacityWeekly: number; demandWeekly: number; utilizationPct: number }[];
  bottlenecks: { name: string; title: string | null; department: string | null; demandWeekly: number; capacityWeekly: number; utilizationPct: number }[];
  resolutions: string[];
}

export function buildResourceFeasibility(resource: ExecResourceModel | null, result: ExecOptimizationResult): ResourceFeasibility | null {
  if (!resource) return null;
  const total = r2(resource.totalWeeklyCapacity);
  const current = r2(resource.currentWeeklyLoad);
  const demand = r2(resource.selectedWeeklyDemand);
  const util = pct(demand, total);
  const currentUtil = pct(current, total);
  const deliverable = util <= 100;
  const byDepartment = resource.byDepartment.map((d) => ({
    department: d.department || "Unassigned", capacityWeekly: r2(d.capacityWeekly), demandWeekly: r2(d.demandWeekly),
    utilizationPct: pct(d.demandWeekly, d.capacityWeekly),
  })).sort((a, b) => b.utilizationPct - a.utilizationPct);
  const bottlenecks = resource.bottlenecks.map((b) => ({
    name: b.name, title: b.title, department: b.department,
    demandWeekly: r2(b.demandWeekly), capacityWeekly: r2(b.capacityWeekly),
    utilizationPct: pct(b.demandWeekly, b.capacityWeekly),
  }));
  const resolutions: string[] = [];
  if (!deliverable) {
    const gap = r2(demand - total);
    resolutions.push(`Add ~${Math.ceil(gap / 40)} FTE (or ${r2(gap)} contract hours/week) to close the ${r2(gap)} h/week gap.`);
    if (bottlenecks.length > 0) resolutions.push(`Rebalance or hire for bottleneck role(s): ${bottlenecks.slice(0, 3).map((b) => b.name).join(", ")}.`);
    const deferred = result.excluded.map((d) => d.candidate as ExtCandidate).filter((c) => !c.mandatory).slice(0, 2);
    if (deferred.length > 0) resolutions.push(`Defer ${deferred.map((c) => c.project.code).join(" / ")} to release capacity.`);
  } else if (currentUtil > 100) {
    resolutions.push(`Today's portfolio exceeds capacity by ${r1(currentUtil - 100)}% — the recommended portfolio fits (${util}% utilization).`);
  } else {
    resolutions.push("Portfolio fits within current capacity — no hire required.");
  }
  return {
    deliverable, totalWeeklyCapacity: total, committedWeekly: current, selectedWeeklyDemand: demand,
    availableWeekly: r2(Math.max(0, total - demand)), utilizationPct: util,
    byDepartment, bottlenecks, resolutions,
  };
}

// ---------- Dependency impact (§15) ----------
export interface DependencyImpact {
  projectId: string; code: string; name: string;
  requires: { id: string; code: string; name: string; funded: boolean; score: number; cost: number }[];
  blocks: { id: string; code: string; name: string; funded: boolean }[];
  explanation: string;
}

export function buildDependencyImpacts(projects: ExecProject[], result: ExecOptimizationResult): DependencyImpact[] {
  const selectedIds = new Set(result.selected.map((d) => d.candidate.id));
  const all = projects.filter((p) => p.score && (p.score.dependsOn.length > 0 || projects.some((q) => q.score?.dependsOn.includes(p.id))));
  return all.map((p) => {
    const requires = p.score!.dependsOn
      .map((id) => projects.find((q) => q.id === id))
      .filter(Boolean)
      .map((q) => ({ id: q!.id, code: q!.code, name: q!.name, funded: selectedIds.has(q!.id), score: q!.score?.weighted ?? 0, cost: q!.score?.costEstimate ?? 0 }));
    const blocks = projects.filter((q) => q.score?.dependsOn.includes(p.id)).map((q) => ({ id: q.id, code: q.code, name: q.name, funded: selectedIds.has(q.id) }));
    const unfundedDeps = requires.filter((r) => !r.funded);
    const blockedUnfunded = blocks.filter((b) => !b.funded);
    let explanation: string;
    if (selectedIds.has(p.id) && unfundedDeps.length === 0) explanation = `Selected — all ${requires.length} prerequisite(s) are funded.`;
    else if (selectedIds.has(p.id)) explanation = `Selected but ${unfundedDeps.length} prerequisite(s) unfunded — delivery risk.`;
    else if (unfundedDeps.length > 0) explanation = `Cannot start until ${unfundedDeps.map((r) => r.code).join(", ")} is funded.`;
    else if (blockedUnfunded.length > 0) explanation = `Funding this enables ${blockedUnfunded.map((b) => b.code).join(", ")}.`;
    else explanation = "No dependency constraints.";
    return { projectId: p.id, code: p.code, name: p.name, requires, blocks, explanation };
  });
}

// ---------- "Why this project?" (§9) ----------
export interface WhyExplanation { project: string; decision: "SELECTED" | "EXCLUDED" | "PROTECTED"; score: number; reasons: string[]; dataBasis: string[] }

export function explainProject(projectId: string, projects: ExecProject[], result: ExecOptimizationResult): WhyExplanation | null {
  const p = projects.find((x) => x.id === projectId);
  if (!p || !p.score) return null;
  const s = p.score;
  const selectedDec = result.selected.find((d) => d.candidate.id === projectId);
  const excludedDec = result.excluded.find((d) => d.candidate.id === projectId);
  const reasons: string[] = [];
  const basis: string[] = [];
  const pushBasis = () => {
    basis.push(`Weighted score ${s.weighted}${s.overridden ? " (management override)" : ""}`);
    basis.push(`Cost estimate ${r2(s.costEstimate)}, expected value ${r2(s.expectedValue)}${s.costEstimate > 0 ? `, ROI ${r1((s.expectedValue / s.costEstimate) * 100)}%` : ""}`);
    basis.push(`Strategic alignment ${s.scores?.["strategic"] ?? 0}, risk reduction ${s.scores?.["risk"] ?? 0}, urgency ${s.scores?.["urgency"] ?? 0}`);
  };
  if (selectedDec) {
    reasons.push(s.mandatory ? "Mandatory project — regulatory/contractual/strategic commitment funded first" : selectedDec.reason);
    if (s.scores?.["strategic"] >= 70) reasons.push("Strong strategic alignment");
    if (s.scores?.["value"] >= 70) reasons.push("High expected business value");
    if (s.costEstimate > 0 && (s.expectedValue / s.costEstimate) >= 1.5) reasons.push(`High expected ROI (${r1((s.expectedValue / s.costEstimate) * 100)}%)`);
    if (s.scores?.["risk"] >= 60) reasons.push("Materially reduces portfolio risk");
    if (s.dependsOn.length === 0) reasons.push("No dependency constraints — can start immediately");
    else reasons.push(`All prerequisites funded: ${s.dependsOn.length} dependency link(s)`);
    reasons.push("Fits available budget at selection time (value-dense ordering)");
    pushBasis();
    return { project: `${p.code} — ${p.name}`, decision: s.mandatory ? "PROTECTED" : "SELECTED", score: s.weighted, reasons, dataBasis: basis };
  }
  if (excludedDec) {
    reasons.push(excludedDec.reason);
    if (s.costEstimate > 0 && (s.expectedValue / s.costEstimate) < 1.2 && !s.mandatory) reasons.push("Lower value density than funded alternatives");
    if (s.scores?.["strategic"] < 50) reasons.push("Below-average strategic alignment");
    if (s.dependsOn.length > 0) reasons.push(`Depends on ${s.dependsOn.length} other project(s) being funded first`);
    pushBasis();
    return { project: `${p.code} — ${p.name}`, decision: "EXCLUDED", score: s.weighted, reasons, dataBasis: basis };
  }
  return null;
}

// ---------- Full bundle assembly ----------
export interface ExecutiveBundle {
  engineVersion: string;
  config: ExecOptimizationConfig;
  presetKey: string;
  result: ExecOptimizationResult;
  recommendation: ExecRecommendation;
  cards: ExecCard[];
  actions: ExecAction[];
  health: ExecHealth;
  insights: ExecInsight[];
  beforeAfter: BeforeAfterRow[];
  whatChanged: WhatChanged | null;
  scorecard: ExecScorecard;
  strategyMap: StrategyNode[];
  budgetAllocation: BudgetAllocation;
  resourceFeasibility: ResourceFeasibility | null;
  dependencyImpacts: DependencyImpact[];
  kpis: { label: string; value: number; unit: string }[];
}
