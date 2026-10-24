// PM CONTROL TOWER — Prioritization Scoring Engine + Budget-Constrained Portfolio Selection (pure)
// WeightedScore = Σ(criterion × weight); classification bands; and a budget-constrained
// optimizer (value-dense knapsack + dependency guard) that EXPLAINS every decision.

export interface Criterion { id: string; name: string; weight: number }
export const DEFAULT_CRITERIA: Criterion[] = [
  { id: "strategic", name: "Strategic Alignment", weight: 25 },
  { id: "value", name: "Revenue / Business Value", weight: 20 },
  { id: "customer", name: "Customer Impact", weight: 15 },
  { id: "risk", name: "Risk Reduction", weight: 15 },
  { id: "compliance", name: "Regulatory / Compliance", weight: 10 },
  { id: "roi", name: "Cost Efficiency / ROI", weight: 10 },
  { id: "urgency", name: "Urgency / Time Criticality", weight: 5 },
];

export function validateWeights(criteria: Criterion[]): boolean {
  return Math.round(criteria.reduce((s, c) => s + c.weight, 0) * 100) === 10000 / 100 * 100 - 0 || Math.abs(criteria.reduce((s, c) => s + c.weight, 0) - 100) < 0.001;
}

export function weightedScore(scores: Record<string, number>, criteria: Criterion[]): number {
  const totalWeight = criteria.reduce((s, c) => s + c.weight, 0) || 1;
  const sum = criteria.reduce((s, c) => s + (scores[c.id] ?? 0) * c.weight, 0);
  return Math.round((sum / totalWeight) * 10) / 10;
}

export type Classification = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "DEFER";
export function classify(score: number): Classification {
  if (score >= 90) return "CRITICAL";
  if (score >= 80) return "HIGH";
  if (score >= 70) return "MEDIUM";
  if (score >= 60) return "LOW";
  return "DEFER";
}

export interface Candidate {
  id: string; name: string; score: number; cost: number; expectedValue: number;
  dependsOn?: string[]; required?: boolean; // required = regulatory/customer commitment (always selected if funded)
}

export interface SelectionDecision {
  candidate: Candidate; selected: boolean;
  reason: string; // always explainable
}

export interface OptimizedPortfolio {
  selected: SelectionDecision[]; excluded: SelectionDecision[];
  totalCost: number; remainingBudget: number; totalScore: number; totalValue: number;
}

/**
 * Budget-constrained portfolio selection.
 * Algorithm: required items first (regulatory/commitment), then value-dense greedy
 * (score-per-cost) which is the standard heuristic for this knapsack class; each
 * exclusion is EXPLAINED (budget exhausted / dependency not funded / lower density).
 */
export function optimizePortfolio(candidates: Candidate[], budget: number, maxProjects?: number): OptimizedPortfolio {
  const selected: SelectionDecision[] = [];
  const excluded: SelectionDecision[] = [];
  let spent = 0;
  let slots = maxProjects ?? Number.POSITIVE_INFINITY;
  const selectedIds = new Set<string>();

  const required = candidates.filter((c) => c.required);
  const optional = candidates.filter((c) => !c.required).sort((a, b) => b.score / Math.max(b.cost, 1) - a.score / Math.max(a.cost, 1));

  for (const c of required) {
    if (c.cost <= budget - spent && slots > 0) { selected.push({ candidate: c, selected: true, reason: "Required (regulatory / customer commitment)" }); selectedIds.add(c.id); spent += c.cost; slots -= 1; }
    else excluded.push({ candidate: c, selected: false, reason: "Required but exceeds remaining budget" });
  }
  for (const c of optional) {
    const missingDep = (c.dependsOn ?? []).find((d) => !selectedIds.has(d));
    if (missingDep) {
      const depName = candidates.find((x) => x.id === missingDep)?.name ?? missingDep;
      excluded.push({ candidate: c, selected: false, reason: `Dependency not funded: ${depName}` });
      continue;
    }
    if (spent + c.cost <= budget && slots > 0) {
      selected.push({ candidate: c, selected: true, reason: `Score ${c.score} at cost ${c.cost} — high value density, fits remaining budget` });
      selectedIds.add(c.id); spent += c.cost; slots -= 1;
    } else if (slots <= 0) {
      excluded.push({ candidate: c, selected: false, reason: "Maximum project count reached" });
    } else {
      excluded.push({ candidate: c, selected: false, reason: `Budget exhausted — needs ${(c.cost - (budget - spent)).toLocaleString()} more than remaining budget` });
    }
  }
  const totalScore = selected.length ? Math.round((selected.reduce((s, d) => s + d.candidate.score, 0) / selected.length) * 10) / 10 : 0;
  return {
    selected, excluded,
    totalCost: Math.round(spent * 100) / 100,
    remainingBudget: Math.round((budget - spent) * 100) / 100,
    totalScore,
    totalValue: Math.round(selected.reduce((s, d) => s + d.candidate.expectedValue, 0) * 100) / 100,
  };
}
