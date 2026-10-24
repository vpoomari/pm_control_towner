// PM CONTROL TOWER — Executive prioritization context assembler (server-side).
// Loads and shapes the data the pure executive engine consumes: scored projects with
// economics from approved business cases, and a resource model consistent with
// /api/capacity semantics (allocation% × 40h weeks inside the assignment window).

import { db } from "@/lib/db";
import { fromJson } from "@/lib/constants";
import { DEFAULT_CRITERIA, Criterion } from "@/lib/engines/prioritization";
import type { ExecProject, ExecResourceModel } from "@/lib/engines/executive-portfolio";

const WEEK_HOURS = 40; // matches /api/capacity convention
const HORIZON_WEEKS = 12;

function overlapsWindow(start: Date | null, end: Date | null, wStart: number, wEnd: number): boolean {
  const s = start ? start.getTime() : Number.NEGATIVE_INFINITY;
  const e = end ? end.getTime() : Number.POSITIVE_INFINITY;
  return s <= wEnd && e >= wStart;
}

/** Lazily seed PriorityCriteria from defaults (shared by both prioritization routes). */
export async function ensureCriteriaSeeded(): Promise<Criterion[]> {
  let crits = await db.priorityCriterion.findMany({ orderBy: { order: "asc" } });
  if (crits.length === 0) {
    for (let i = 0; i < DEFAULT_CRITERIA.length; i++) {
      const d = DEFAULT_CRITERIA[i];
      await db.priorityCriterion.create({ data: { id: d.id, name: d.name, weight: d.weight, order: i, modelId: "default" } });
    }
    crits = await db.priorityCriterion.findMany({ orderBy: { order: "asc" } });
  }
  return crits.map((c) => ({ id: c.id, name: c.name, weight: c.weight }));
}

export async function loadExecutiveProjects(): Promise<{ projects: ExecProject[]; criteria: Criterion[] }> {
  const [projects, cases, criteria] = await Promise.all([
    db.project.findMany({
      select: {
        id: true, code: true, name: true, status: true, priority: true, riskLevel: true, ragStatus: true,
        portfolioId: true, programId: true, currentBudget: true, actualCost: true,
        startDate: true, endDate: true, plannedHours: true, actualHours: true, progress: true, currency: true,
        program: { select: { name: true } },
        strategicObjective: { select: { id: true, name: true, weight: true } },
        projectScore: true,
      },
    }),
    db.businessCase.findMany({
      select: { projectId: true, businessUnit: true, computedJson: true, recommendation: true, capexItemsJson: true, opexItemsJson: true, benefitItemsJson: true },
    }),
    ensureCriteriaSeeded(),
  ]);

  const bcByProject = new Map<string, {
    npv: number | null; roiPct: number | null; irr: number | null; paybackYears: number | null;
    recommendation: string; capex: number; opex: number;
    annualBenefits: { type: string; annualValue: number }[]; businessUnit: string | null;
  }>();
  for (const bc of cases) {
    if (!bc.projectId) continue;
    const computed = fromJson<Record<string, number | null>>(bc.computedJson, {});
    const capex = fromJson<{ amount?: number }[]>(bc.capexItemsJson, []).reduce((s, i) => s + (Number(i.amount) || 0), 0);
    const opex = fromJson<{ annualAmount?: number }[]>(bc.opexItemsJson, []).reduce((s, i) => s + (Number(i.annualAmount) || 0), 0);
    const benefits = fromJson<{ type?: string; annualValue?: number }[]>(bc.benefitItemsJson, [])
      .map((b) => ({ type: (b.type || "KPI").toUpperCase(), annualValue: Number(b.annualValue) || 0 }));
    bcByProject.set(bc.projectId, {
      npv: computed.npv != null ? Number(computed.npv) : null,
      roiPct: computed.roiPct != null ? Number(computed.roiPct) : null,
      irr: computed.irr != null ? Number(computed.irr) : null,
      paybackYears: computed.paybackYears != null ? Number(computed.paybackYears) : null,
      recommendation: bc.recommendation,
      capex, opex, annualBenefits: benefits, businessUnit: bc.businessUnit ?? null,
    });
  }

  const execProjects: ExecProject[] = projects.map((p) => {
    const s = p.projectScore;
    const bc = bcByProject.get(p.id);
    return {
      id: p.id, code: p.code, name: p.name, status: p.status, priority: p.priority,
      riskLevel: p.riskLevel, ragStatus: p.ragStatus,
      portfolioId: p.portfolioId, programId: p.programId, programName: p.program?.name ?? null,
      objectiveId: p.strategicObjective?.id ?? null, objectiveName: p.strategicObjective?.name ?? null,
      businessUnit: bc?.businessUnit ?? null,
      currency: p.currency,
      currentBudget: p.currentBudget, actualCost: p.actualCost,
      startDate: p.startDate?.toISOString() ?? null, endDate: p.endDate?.toISOString() ?? null,
      plannedHours: p.plannedHours, actualHours: p.actualHours, progress: p.progress,
      score: s ? {
        weighted: s.weightedScore,
        system: s.weightedScore,
        scores: fromJson<Record<string, number>>(s.scoresJson, {}),
        classification: s.classification,
        costEstimate: s.costEstimate,
        expectedValue: s.expectedValue,
        mandatory: s.mandatory,
        dependsOn: fromJson<string[]>(s.dependsOnJson, []).filter((id) => id !== p.id),
        overridden: s.overrideScore != null,
        overrideReason: s.overrideReason,
        overrideBy: s.overrideBy,
      } : null,
      businessCase: bc ? {
        npv: bc.npv, roiPct: bc.roiPct, irr: bc.irr, paybackYears: bc.paybackYears,
        recommendation: bc.recommendation, capex: bc.capex, opex: bc.opex, annualBenefits: bc.annualBenefits,
      } : null,
    };
  });

  return { projects: execProjects, criteria };
}

/** Raw weekly resource rows — the API shapes ExecResourceModel once the selected set is known. */
export interface ResourceRaw {
  totalWeeklyCapacity: number;
  currentWeeklyLoad: number;
  perProjectWeekly: Map<string, number>;                                   // projectId → avg h/week
  perDeptCapacity: Map<string, number>;                                    // department → capacity h/week
  resourceRows: { id: string; name: string; title: string | null; department: string | null; capacity: number; byProject: Map<string, number> }[];
}

export async function loadResourceRaw(): Promise<ResourceRaw | null> {
  const resources = await db.resource.findMany({
    where: { isActive: true },
    include: { assignments: { where: { status: "ACTIVE" }, select: { projectId: true, allocationPercent: true, startDate: true, endDate: true } } },
  });
  if (resources.length === 0) return null;

  const base = Date.now();
  const weeks: { start: number; end: number }[] = [];
  for (let i = 0; i < HORIZON_WEEKS; i++) {
    const start = base + i * 7 * 86_400_000;
    weeks.push({ start, end: start + 6 * 86_400_000 });
  }

  const r2 = (v: number) => Math.round(v * 10) / 10;
  const perProjectWeekly = new Map<string, number>();
  const perDeptCapacity = new Map<string, number>();
  const resourceRows: ResourceRaw["resourceRows"] = [];
  let totalCapacity = 0, currentLoad = 0;

  for (const res of resources) {
    const capacity = res.capacityHoursPerWeek || WEEK_HOURS;
    totalCapacity += capacity;
    const dept = res.department || "Unassigned";
    perDeptCapacity.set(dept, (perDeptCapacity.get(dept) ?? 0) + capacity);
    const byProject = new Map<string, number>();
    for (const w of weeks) {
      for (const a of res.assignments) {
        if (!overlapsWindow(a.startDate, a.endDate, w.start, w.end)) continue;
        byProject.set(a.projectId, (byProject.get(a.projectId) ?? 0) + (a.allocationPercent / 100) * WEEK_HOURS);
      }
    }
    let total = 0;
    for (const [pid, h] of byProject) {
      const avg = h / weeks.length;
      byProject.set(pid, avg);
      total += avg;
      perProjectWeekly.set(pid, (perProjectWeekly.get(pid) ?? 0) + avg);
    }
    currentLoad += total;
    resourceRows.push({ id: res.id, name: res.name, title: res.title, department: res.department, capacity, byProject });
  }

  return {
    totalWeeklyCapacity: r2(totalCapacity),
    currentWeeklyLoad: r2(currentLoad),
    perProjectWeekly,
    perDeptCapacity,
    resourceRows,
  };
}

/** Shape the engine's resource model for a given selected project set. */
export function shapeResourceModel(raw: ResourceRaw, selectedIds: Set<string>): ExecResourceModel {
  const r2 = (v: number) => Math.round(v * 10) / 10;
  let selectedDemand = 0;
  const byDeptDemand = new Map<string, number>();
  const bottlenecks: ExecResourceModel["bottlenecks"] = [];
  for (const row of raw.resourceRows) {
    let demand = 0;
    for (const [pid, h] of row.byProject) {
      if (selectedIds.has(pid)) demand += h;
    }
    if (demand > 0) {
      selectedDemand += demand;
      const dept = row.department || "Unassigned";
      byDeptDemand.set(dept, (byDeptDemand.get(dept) ?? 0) + demand);
    }
    if (demand > row.capacity) {
      bottlenecks.push({ resourceId: row.id, name: row.name, title: row.title, department: row.department, capacityWeekly: row.capacity, demandWeekly: r2(demand) });
    }
  }
  const byDepartment = [...raw.perDeptCapacity.entries()].map(([department, capacityWeekly]) => ({
    department, capacityWeekly: r2(capacityWeekly), demandWeekly: r2(byDeptDemand.get(department) ?? 0),
  }));
  return {
    totalWeeklyCapacity: raw.totalWeeklyCapacity,
    currentWeeklyLoad: raw.currentWeeklyLoad,
    selectedWeeklyDemand: r2(selectedDemand),
    byDepartment,
    bottlenecks: bottlenecks.sort((a, b) => b.demandWeekly / b.capacityWeekly - a.demandWeekly / a.capacityWeekly),
  };
}

/** Approved budget: primary portfolio budgetTarget, fallback Σ cost estimates. */
export async function loadApprovedBudget(): Promise<{ budget: number; portfolioName: string | null; portfolioId: string | null }> {
  const portfolios = await db.portfolio.findMany({ select: { id: true, name: true, budgetTarget: true }, orderBy: { budgetTarget: "desc" } });
  const primary = portfolios.find((p) => p.budgetTarget > 0);
  if (primary) return { budget: primary.budgetTarget, portfolioName: primary.name, portfolioId: primary.id };
  const scores = await db.projectScore.findMany({ select: { costEstimate: true } });
  return { budget: scores.reduce((s, x) => s + x.costEstimate, 0), portfolioName: portfolios[0]?.name ?? null, portfolioId: portfolios[0]?.id ?? null };
}
