// PM CONTROL TOWER — Project Controls: S-Curve + forecast completion (pure data assembly)
// GET /api/projects/[id]/controls — weekly buckets of planned vs actual cost/progress,
// earned value cumulative, EVM trend and forecast completion date (SPI-derived, labeled
// as a calculated forecast, never a guarantee).

import { db } from "@/lib/db";
import { withApi, ok, ApiError } from "@/lib/api";
import { round2 } from "@/lib/constants";
import { computeEVM } from "@/lib/engines/evm";

export const GET = withApi(async (ctx) => {
  const { id } = ctx.params as { id: string };
  const project = await db.project.findUnique({
    where: { id },
    include: {
      tasks: true,
      evmPeriods: { orderBy: { statusDate: "asc" } },
      assignments: { select: { plannedHours: true } },
    },
  });
  if (!project) throw new ApiError(404, "Project not found");

  const start = (project.startDate ?? project.createdAt);
  const WEEK = 7 * 86_400_000;
  const end = project.endDate ?? new Date(start.getTime() + 26 * WEEK);
  const totalWeeks = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / WEEK));
  const now = Date.now();

  const totalPlannedHours = project.tasks.reduce((s, t) => s + (t.plannedHours || 0), 0);
  const totalActualHours = project.tasks.reduce((s, t) => s + (t.actualHours || 0), 0);
  const totalBudget = project.currentBudget || project.baselineBudget || 0;

  // Planned weekly spread: each task's plannedHours/cost spread evenly across its own window
  const plannedCost = new Array(totalWeeks).fill(0);
  const plannedHours = new Array(totalWeeks).fill(0);
  for (const t of project.tasks) {
    const ts = (t.startDate ?? start).getTime();
    const te = (t.endDate ?? new Date(ts + Math.max(1, t.durationDays) * 86_400_000)).getTime();
    const w0 = Math.max(0, Math.floor((ts - start.getTime()) / WEEK));
    const weeks = Math.max(1, Math.ceil((te - ts) / WEEK));
    for (let w = w0; w < Math.min(totalWeeks, w0 + weeks); w++) {
      plannedHours[w] += (t.plannedHours || 0) / weeks;
      plannedCost[w] += (t.plannedCost || 0) / weeks;
    }
  }

  // Actual weekly: timesheet entries bucketed by entry createdAt
  const entries = await db.timesheetEntry.findMany({
    where: { task: { projectId: id } },
    select: { hours: true, createdAt: true, task: { select: { actualCost: true } } },
  });
  const actualHours = new Array(totalWeeks).fill(0);
  for (const e of entries) {
    const w = Math.max(0, Math.min(totalWeeks - 1, Math.floor((e.createdAt.getTime() - start.getTime()) / WEEK)));
    actualHours[w] += e.hours || 0;
  }

  // Cumulative series + earned value (EV = plannedValue * actualProgressShare approximation
  // per-period via approved timesheet share; the EVM engine remains the source of truth for
  // the headline CPI/SPI — these series are for the S-curve visualization)
  const ratePerHour = totalPlannedHours > 0 ? totalBudget / totalPlannedHours : 0;
  let pc = 0, ac = 0, ah = 0;
  const series: { week: number; label: string; plannedCost: number; actualCost: number; plannedPct: number; actualPct: number; ev: number }[] = [];
  let cumPlannedHours = 0;
  for (let w = 0; w < totalWeeks; w++) {
    cumPlannedHours += plannedHours[w];
    pc += plannedCost[w];
    ah += actualHours[w];
    ac += actualHours[w] * ratePerHour;
    series.push({
      week: w + 1,
      label: new Date(start.getTime() + w * WEEK).toISOString().slice(0, 10),
      plannedCost: round2(pc), actualCost: round2(ac),
      plannedPct: round2(totalPlannedHours > 0 ? (cumPlannedHours / totalPlannedHours) * 100 : 0),
      actualPct: round2(totalPlannedHours > 0 ? (ah / totalPlannedHours) * 100 : 0),
      ev: round2(totalPlannedHours > 0 ? (ah / totalPlannedHours) * totalBudget : 0),
    });
  }

  const evm = computeEVM(project.tasks, project.actualCost, totalBudget || null, project.statusDate || new Date());
  // Forecast completion: baseline duration / SPI beyond today (labeled calculated forecast)
  let forecastCompletion: string | null = null;
  let expectedDelayDays: number | null = null;
  if (project.endDate && evm.spi > 0 && evm.spi < 1 && project.statusDate) {
    const elapsed = Math.max(0, (project.statusDate.getTime() - start.getTime()) / 86_400_000);
    const totalDays = Math.max(1, (end.getTime() - start.getTime()) / 86_400_000);
    expectedDelayDays = Math.round((elapsed / evm.spi - elapsed) + 0); // delay accrued to date
    const forecastDuration = totalDays / evm.spi;
    forecastCompletion = new Date(start.getTime() + forecastDuration * 86_400_000).toISOString().slice(0, 10);
    expectedDelayDays = Math.round(forecastDuration - totalDays);
  }

  const insufficient = totalPlannedHours === 0;
  return ok({
    series, insufficient,
    evm: { bac: evm.bac, pv: evm.pv, ev: evm.ev, ac: evm.ac, cpi: evm.cpi, spi: evm.spi, eac: evm.eac, etc: evm.etc, vac: evm.vac, tcpi: evm.tcpi },
    forecast: { completion: forecastCompletion, expectedDelayDays, basis: "Calculated forecast: remaining duration extrapolated at current SPI. Not a guarantee." },
    project: { code: project.code, name: project.name, start: start.toISOString(), end: end.toISOString(), budget: totalBudget },
  });
});
