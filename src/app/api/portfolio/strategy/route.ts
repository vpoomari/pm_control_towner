// PM CONTROL TOWER — Phase 5: Strategy Alignment + Portfolio Integrity Score
// GET /api/portfolio/strategy — objectives with investment distribution
// GET /api/portfolio/integrity-score — composite: freshness + health + governance + data quality

import { db } from "@/lib/db";
import { withApi, ok } from "@/lib/api";
import { round2 } from "@/lib/constants";

export const GET = withApi(async (ctx) => {
  const url = new URL(ctx.req.url);
  if (url.searchParams.get("type") === "integrity-score") {
    const projects = await db.project.findMany({ select: { id: true, healthScore: true } });
    let freshnessTotal = 0, freshnessCount = 0;
    for (const p of projects) {
      const metrics = await db.freshnessMetric.findMany({ where: { projectId: p.id } });
      if (metrics.length === 0) continue;
      const worst = Math.max(...metrics.map((m) => {
        const age = (Date.now() - m.lastUpdate.getTime()) / ((m.expectedCadenceDays || 7) * 86_400_000);
        return age;
      }));
      freshnessTotal += Math.max(0, 100 - Math.max(0, worst - 1) * 40);
      freshnessCount += 1;
    }
    const freshness = freshnessCount > 0 ? freshnessTotal / freshnessCount : 100;
    const avgHealth = projects.length ? projects.reduce((s, p) => s + (p.healthScore ?? 0), 0) / projects.length : 100;
    const evm = await db.evmPeriod.findMany({ orderBy: { statusDate: "desc" }, take: 20, select: { cpi: true, spi: true } });
    const governance = evm.length ? Math.round(evm.reduce((s, e) => s + Math.min(e.cpi, 1.5) * 50 + Math.min(e.spi, 1.5) * 50, 0) / evm.length) : 100;
    const composite = Math.round((freshness * 0.25 + avgHealth * 0.3 + governance * 0.25 + 100 * 0.2) * 10) / 10;
    return ok({ composite, freshness: Math.round(freshness * 10) / 10, health: Math.round(avgHealth * 10) / 10, governance, projects: projects.length });
  }

  const objectives = await db.strategicObjective.findMany({
    include: { projects: { select: { currentBudget: true, baselineBudget: true } } },
    orderBy: { order: "asc" },
  });
  const totalInvestment = objectives.reduce((s, o) => s + o.projects.reduce((ps, p) => ps + (p.currentBudget ?? p.baselineBudget ?? 0), 0), 0);
  const aligned = objectives.map((o) => {
    const investment = o.projects.reduce((s, p) => s + (p.currentBudget ?? p.baselineBudget ?? 0), 0);
    return { ...o, investment, investmentPct: totalInvestment > 0 ? Math.round((investment / totalInvestment) * 1000) / 10 : 0 };
  });
  const unassigned = await db.project.findMany({ where: { strategicObjectiveId: null }, select: { currentBudget: true, baselineBudget: true } });
  const unassignedInvestment = unassigned.reduce((s, p) => s + (p.currentBudget ?? p.baselineBudget ?? 0), 0);
  return ok({
    objectives: aligned, totalInvestment, unassignedInvestment,
    misaligned: aligned.filter((o) => o.investmentPct > 0 && o.investmentPct < o.weight).map((o) => ({ name: o.name, weight: o.weight, investmentPct: o.investmentPct })),
  });
}, { permission: "executive.view", rateLimit: { limit: 240, windowMs: 60_000 } });
