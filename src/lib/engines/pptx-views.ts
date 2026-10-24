// PM CONTROL TOWER — PPT view builders (server-side, Command Center v3.1).
// Each exporter composes presentation-native slides from the same Prisma data the
// UI uses. Engines are reused (never duplicated): e.g. the executive and leadership
// decks render buildLeadershipBundle() output, and the project deck renders the
// persisted CPM/EVM fields.

import { Deck, C, trunc, type GanttTask, type TableCol } from "./pptx";
import { buildLeadershipBundle } from "./leadership";
import { db } from "@/lib/db";
import { money, num, fmtDate, round2, safeDiv, clamp } from "@/lib/constants";

const DAY = 86_400_000;

async function confidentiality(): Promise<string | undefined> {
  const s = await db.adminSettings.findUnique({ where: { id: "singleton" }, select: { confidentialityLabel: true } }).catch(() => null);
  return s?.confidentialityLabel || undefined;
}

async function getProjectFull(projectId: string) {
  const p = await db.project.findUnique({
    where: { id: projectId },
    include: {
      owner: { select: { name: true } },
      program: { select: { name: true, code: true } },
      portfolio: { select: { name: true, code: true } },
      strategicObjective: { select: { name: true } },
    },
  });
  if (!p) return null;
  const names = await db.user.findMany({
    where: { id: { in: [p.managerId, p.sponsorId].filter((x): x is string => Boolean(x)) } },
    select: { id: true, name: true },
  });
  const nameOf = (id: string | null) => (id ? names.find((n) => n.id === id)?.name ?? null : null);
  return { ...p, managerName: nameOf(p.managerId), sponsorName: nameOf(p.sponsorId) };
}

type ProjectFull = NonNullable<Awaited<ReturnType<typeof getProjectFull>>>;

function projectLineOf(p: ProjectFull | null | undefined): string | undefined {
  if (!p) return undefined;
  return `${p.code} — ${p.name}`;
}

function ragTone(health: number): "green" | "amber" | "red" {
  return health >= 80 ? "green" : health >= 60 ? "amber" : "red";
}

async function deckFor(meta: { deckTitle: string; subtitle?: string; project?: ProjectFull | null; metaPairs?: [string, string | number][] }): Promise<Deck> {
  const conf = await confidentiality();
  const p = meta.project;
  const projectLine = projectLineOf(p);
  const metaPairs: [string, string | number][] = [];
  if (p) {
    metaPairs.push(
      ["Status", `${p.status} · ${p.phase}`],
      ["Health", `${p.ragStatus} (${Math.round(p.healthScore)})`],
      ["Progress", `${round2(p.progress)}%`],
      ["Methodology", p.methodology],
      ["Baseline budget", money(p.baselineBudget, p.currency)],
      ["Actual cost", money(p.actualCost, p.currency)],
      ["Forecast (EAC)", money(p.forecastCost, p.currency)],
      ["Start → Finish", `${fmtDate(p.startDate)} → ${fmtDate(p.endDate)}`],
    );
  }
  if (meta.metaPairs) metaPairs.push(...meta.metaPairs);
  return new Deck({
    deckTitle: meta.deckTitle,
    subtitle: meta.subtitle,
    projectLine,
    confidentiality: conf,
    metaPairs: metaPairs.length ? metaPairs : undefined,
    generatedBy: "PM Control Tower v3.1",
  });
}

const countBy = <T>(rows: T[], get: (r: T) => string) => {
  const m = new Map<string, number>();
  for (const r of rows) m.set(get(r), (m.get(get(r)) ?? 0) + 1);
  return m;
};

// ============================================================ Executive & Leadership

async function vExecutive(): Promise<{ deck: Deck }> {
  const b = await buildLeadershipBundle();
  const deck = await deckFor({
    deckTitle: "Executive Control Tower",
    subtitle: `Exception-first portfolio review — ${b.tower.activeProjects} active projects, generated from live operational data`,
    metaPairs: [
      ["Portfolio health", `${b.healthCounts.GREEN} green · ${b.healthCounts.AMBER} amber · ${b.healthCounts.RED} red · ${b.healthCounts.GREY} insufficient`],
      ["Investment", `${money(b.tower.budget.approved)} approved · ${money(b.tower.budget.actual)} actual`],
      ["Needs attention", `${b.exceptions.length} exceptions · ${b.tower.pendingDecisions} pending decisions`],
      ["Reporting since", b.sinceLabel],
    ],
  });
  const t = b.tower;
  deck.kpiSlide("Summary KPIs", [
    { label: "Active projects", value: t.activeProjects, sub: `of ${t.totalProjects} total` },
    { label: "Portfolio health", value: Math.round(t.avgHealth), sub: `avg score`, tone: ragTone(t.avgHealth) },
    { label: "Completion", value: `${Math.round(t.completionPct)}%`, sub: "weighted progress" },
    { label: "Exceptions", value: b.exceptions.length, sub: `${t.overdueActions} overdue actions`, tone: b.exceptions.length > 10 ? "red" : "amber" },
    { label: "Budget variance", value: money(t.budget.variance), sub: `${round2(t.budget.variancePct)}% vs approved`, tone: t.budget.variance < 0 ? "red" : "green" },
    { label: "Forecast (EAC)", value: money(t.budget.forecast), sub: `committed ${money(t.budget.committed)}` },
    { label: "Pending decisions", value: t.pendingDecisions, sub: `${t.overdueDecisions} overdue`, tone: t.overdueDecisions ? "red" : "neutral" },
    { label: "Delivery risk", value: t.atRisk + t.critical, sub: `${t.openCriticalRisks} critical risks`, tone: t.critical ? "red" : "amber" },
  ]);
  deck.chart("Portfolio health distribution", "doughnut", [{
    name: "Projects",
    labels: ["Green", "Amber", "Red", "Insufficient data"],
    values: [b.healthCounts.GREEN, b.healthCounts.AMBER, b.healthCounts.RED, b.healthCounts.GREY],
  }], { colors: ["0E9F6E", "D97706", "DC2626", "94A3B8"], note: "GREY = insufficient data — the tower never presents missing data as healthy." });

  const excCols: TableCol<(typeof b.exceptions)[number]>[] = [
    { header: "Level", w: 1, get: (e) => e.level, align: "center" },
    { header: "Project", w: 1, get: (e) => (e as { projectCode?: string }).projectCode ?? "—" },
    { header: "What needs attention", w: 4, get: (e) => (e as { title?: string }).title ?? (e as { text?: string }).text ?? "" },
    { header: "Detail", w: 3, get: (e) => (e as { detail?: string }).detail ?? "" },
  ];
  deck.table("Exception-first feed (top of the tower)", excCols, b.exceptions.slice(0, 40), { note: "Every exception links to its source entity in the application." });
  deck.table("Portfolio lead sheet", [
    { header: "Project", w: 1.1, get: (r: { code: string }) => r.code },
    { header: "Name", w: 2.4, get: (r: { name: string }) => r.name },
    { header: "Health", w: 0.7, get: (r: { rag: string }) => r.rag, align: "center" },
    { header: "Progress", w: 0.8, get: (r: { progress: number }) => `${Math.round(r.progress)}%`, align: "center" },
    { header: "Budget", w: 1.1, get: (r: { budget: number }) => money(r.budget), align: "right" },
    { header: "Actual", w: 1.1, get: (r: { actual: number }) => money(r.actual), align: "right" },
    { header: "Next milestone", w: 1.4, get: (r: { nextMilestone?: { name: string } | null }) => r.nextMilestone?.name ?? "—" },
  ], b.portfolio.slice(0, 40), { note: "Drill into any project from the application for the full workspace." });
  return { deck };
}

async function vLeadership(): Promise<{ deck: Deck }> {
  const b = await buildLeadershipBundle();
  const deck = await deckFor({
    deckTitle: "Leadership Control Tower",
    subtitle: `Versioned executive pack content — generated ${new Date(b.generatedAt).toISOString().slice(0, 10)}`,
  });
  deck.section("Control Tower", "KPIs, health distribution and validation");
    deck.kpiSlide("Summary KPIs", [
    { label: "On track", value: b.tower.onTrack, tone: "green" },
    { label: "At risk", value: b.tower.atRisk, tone: "amber" },
    { label: "Critical", value: b.tower.critical, tone: "red" },
    { label: "Insufficient data", value: b.tower.insufficient, sub: "GREY honesty" },
  ]);
  deck.chart("Health distribution", "bar", [{
    name: "Projects", labels: ["Green", "Amber", "Red", "GREY"],
    values: [b.healthCounts.GREEN, b.healthCounts.AMBER, b.healthCounts.RED, b.healthCounts.GREY],
  }], { legend: false });
  deck.table("Validation grid", [
    { header: "Check", w: 2.2, get: (c: { label: string }) => c.label },
    { header: "Status", w: 0.8, get: (c: { ok: boolean }) => (c.ok ? "PASS" : "GAP"), align: "center" },
    { header: "Detail", w: 4, get: (c: { detail: string }) => c.detail },
  ], b.validation.checks, { note: `${b.validation.passed ? "All checks passed." : b.validation.gaps + " data gaps — nothing missed."}` });
  deck.table("Exceptions", [
    { header: "Level", w: 1, get: (e: { level: string }) => e.level, align: "center" },
    { header: "Attention", w: 5, get: (e: { title?: string }) => e.title ?? "" },
  ], b.exceptions.slice(0, 45));
  deck.table("Portfolio", [
    { header: "Project", w: 1.1, get: (r: { code: string }) => r.code },
    { header: "Health", w: 0.7, get: (r: { rag: string }) => r.rag, align: "center" },
    { header: "Progress", w: 0.8, get: (r: { progress: number }) => `${Math.round(r.progress)}%`, align: "center" },
    { header: "Forecast finish", w: 1.3, get: (r: { forecastFinish?: string | null }) => r.forecastFinish ?? "—" },
  ], b.portfolio.slice(0, 40));
  return { deck };
}

// ============================================================ Registers (cross-project)

async function vProjects(): Promise<{ deck: Deck }> {
  const projects = await db.project.findMany({
    include: { program: { select: { name: true } }, portfolio: { select: { name: true } } },
    orderBy: { code: "asc" }, take: 300,
  });
  const deck = await deckFor({ deckTitle: "Projects Register", subtitle: `${projects.length} projects across all portfolios and programs` });
  const active = projects.filter((p) => p.status === "ACTIVE");
  const budget = projects.reduce((s, p) => s + p.currentBudget, 0);
  const actual = projects.reduce((s, p) => s + p.actualCost, 0);
  deck.kpiSlide("Summary KPIs", [
    { label: "Projects", value: projects.length, sub: `${active.length} active` },
    { label: "Approved budget", value: money(budget) },
    { label: "Actual cost", value: money(actual), tone: actual > budget ? "red" : "green" },
    { label: "Avg progress", value: `${Math.round(projects.reduce((s, p) => s + p.progress, 0) / Math.max(1, projects.length))}%` },
  ]);
  const top = [...projects].sort((a, b2) => b2.currentBudget - a.currentBudget).slice(0, 10);
  deck.chart("Budget vs actual — top 10 by budget", "bar", [
    { name: "Budget", labels: top.map((p) => p.code), values: top.map((p) => round2(p.currentBudget)) },
    { name: "Actual", labels: top.map((p) => p.code), values: top.map((p) => round2(p.actualCost)) },
  ]);
  deck.table("Projects", [
    { header: "Code", w: 1.05, get: (p) => p.code },
    { header: "Name", w: 2.3, get: (p) => p.name },
    { header: "Program", w: 1.6, get: (p) => p.program?.name ?? "—" },
    { header: "Status", w: 0.85, get: (p) => p.status, align: "center" },
    { header: "RAG", w: 0.6, get: (p) => p.ragStatus, align: "center" },
    { header: "Progress", w: 0.7, get: (p) => `${Math.round(p.progress)}%`, align: "center" },
    { header: "Budget", w: 1, get: (p) => money(p.currentBudget, p.currency), align: "right" },
    { header: "Actual", w: 1, get: (p) => money(p.actualCost, p.currency), align: "right" },
    { header: "Finish", w: 0.9, get: (p) => fmtDate(p.endDate) },
  ], projects);
  return { deck };
}

async function vPortfolios(): Promise<{ deck: Deck }> {
  const portfolios = await db.portfolio.findMany({ include: { _count: { select: { projects: true, programs: true } } }, orderBy: { code: "asc" } });
  const deck = await deckFor({ deckTitle: "Portfolio Register", subtitle: `${portfolios.length} portfolios` });
  deck.table("Portfolios", [
    { header: "Code", w: 0.9, get: (p) => p.code },
    { header: "Name", w: 2.6, get: (p) => p.name },
    { header: "Status", w: 0.8, get: (p) => p.status, align: "center" },
    { header: "RAG", w: 0.6, get: (p) => p.ragStatus, align: "center" },
    { header: "Projects", w: 0.7, get: (p) => p._count.projects, align: "center" },
    { header: "Programs", w: 0.7, get: (p) => p._count.programs, align: "center" },
    { header: "Budget target", w: 1.1, get: (p) => money(p.budgetTarget, p.currency), align: "right" },
    { header: "Actual", w: 1.1, get: (p) => money(p.actualCost, p.currency), align: "right" },
    { header: "Strategic objective", w: 2.2, get: (p) => p.strategicObjective ?? "—" },
  ], portfolios);
  return { deck };
}

async function vPrograms(): Promise<{ deck: Deck }> {
  const programs = await db.program.findMany({ include: { portfolio: { select: { code: true, name: true } }, _count: { select: { projects: true } } }, orderBy: { code: "asc" } });
  const deck = await deckFor({ deckTitle: "Program Register", subtitle: `${programs.length} programs` });
  deck.table("Programs", [
    { header: "Code", w: 0.9, get: (p) => p.code },
    { header: "Name", w: 2.6, get: (p) => p.name },
    { header: "Portfolio", w: 1.6, get: (p) => p.portfolio?.code ?? "—" },
    { header: "Projects", w: 0.7, get: (p) => p._count.projects, align: "center" },
    { header: "Status", w: 0.85, get: (p) => p.status, align: "center" },
    { header: "Budget", w: 1.1, get: (p) => money(p.budget, p.budget ? "USD" : "USD"), align: "right" },
    { header: "Forecast", w: 1.1, get: (p) => money(p.forecastCost), align: "right" },
    { header: "RAG", w: 0.6, get: (p) => p.ragStatus, align: "center" },
  ], programs);
  return { deck };
}

async function vStrategy(): Promise<{ deck: Deck }> {
  const objectives = await db.strategicObjective.findMany({ include: { projects: { select: { id: true, currentBudget: true } } }, orderBy: { order: "asc" } });
  const deck = await deckFor({ deckTitle: "Strategic Objectives", subtitle: "Strategy-to-execution alignment and investment distribution" });
  deck.chart("Investment distribution by objective", "doughnut", [{
    name: "Investment", labels: objectives.map((o) => o.name),
    values: objectives.map((o) => round2(o.projects.reduce((s, p) => s + p.currentBudget, 0))),
  }], { note: "Investment = approved budget of aligned projects." });
  deck.table("Objectives", [
    { header: "Objective", w: 2.8, get: (o) => o.name },
    { header: "Weight", w: 0.6, get: (o) => `${Math.round(o.weight)}%`, align: "center" },
    { header: "Aligned projects", w: 1, get: (o) => o.projects.length, align: "center" },
    { header: "Investment", w: 1.1, get: (o) => money(o.projects.reduce((s, p) => s + p.currentBudget, 0)), align: "right" },
    { header: "Description", w: 3.2, get: (o) => o.description ?? "—" },
  ], objectives);
  return { deck };
}

async function vPrioritization(): Promise<{ deck: Deck }> {
  const scores = await db.projectScore.findMany({ include: { project: { select: { code: true, name: true, status: true } } }, orderBy: { weightedScore: "desc" }, take: 60 });
  const criteria = await db.priorityCriterion.findMany({ orderBy: { order: "asc" } });
  const deck = await deckFor({ deckTitle: "Portfolio Prioritization", subtitle: "Weighted scoring, budget-constrained selection and executive scenarios" });
  deck.table("Scoring model (criteria weights)", [
    { header: "Criterion", w: 2.4, get: (c) => c.name },
    { header: "Weight", w: 0.7, get: (c) => `${Math.round(c.weight)}`, align: "center" },
    { header: "Order", w: 0.6, get: (c) => c.order, align: "center" },
  ], criteria, { note: "Scores are advisory calculations — selection is a human decision." });
  deck.table("Ranked projects", [
    { header: "Project", w: 1, get: (s) => s.project?.code ?? "—" },
    { header: "Name", w: 2.4, get: (s) => s.project?.name ?? "—" },
    { header: "Weighted score", w: 0.9, get: (s) => num(s.weightedScore, 1), align: "center" },
    { header: "Class", w: 0.9, get: (s) => s.classification, align: "center" },
    { header: "Cost estimate", w: 1, get: (s) => money(s.costEstimate), align: "right" },
    { header: "Expected value", w: 1, get: (s) => money(s.expectedValue), align: "right" },
    { header: "Mandatory", w: 0.8, get: (s) => (s.mandatory ? "YES" : "—"), align: "center" },
  ], scores);
  return { deck };
}

async function vInvestment(): Promise<{ deck: Deck }> {
  const cases = await db.businessCase.findMany({ orderBy: { createdAt: "desc" }, take: 60 });
  const deck = await deckFor({ deckTitle: "Investment & Business Cases", subtitle: `${cases.length} business cases with ROI / NPV / IRR / payback` });
  deck.table("Business cases", [
    { header: "Case", w: 2.4, get: (c) => c.name },
    { header: "Sponsor", w: 1.2, get: (c) => c.sponsor },
    { header: "Status", w: 1, get: (c) => c.status, align: "center" },
    { header: "Recommendation", w: 1.2, get: (c) => c.recommendation, align: "center" },
    { header: "Analysis years", w: 0.8, get: (c) => c.analysisYears, align: "center" },
    { header: "Discount rate", w: 0.9, get: (c) => `${c.discountRatePct}%`, align: "center" },
    { header: "Approved amount", w: 1.2, get: (c) => (c.approvedAmount != null ? money(c.approvedAmount, c.currency) : "—"), align: "right" },
  ], cases);
  return { deck };
}

// ============================================================ Project-scoped

async function vProject(projectId: string): Promise<{ deck: Deck; projectCode?: string }> {
  const p = await getProjectFull(projectId);
  if (!p) throw new Error("Project not found");
  const [wbs, tasks, deps, milestones, budgetLines, evmPeriods, risks, issues, assumptions, changes, gates, sprints, epics, deliverables, objective] = await Promise.all([
    db.wBSNode.findMany({ where: { projectId } }),
    db.task.findMany({ where: { projectId }, include: { assignee: { select: { name: true } }, sprint: { select: { name: true } }, epic: { select: { name: true } } }, orderBy: { code: "asc" }, take: 400 }),
    db.dependency.findMany({ where: { projectId }, include: { predecessor: { select: { code: true } }, successor: { select: { code: true } } } }),
    db.milestone.findMany({ where: { projectId }, orderBy: { dueDate: "asc" } }),
    db.budgetLine.findMany({ where: { projectId } }),
    db.evmPeriod.findMany({ where: { projectId }, orderBy: { statusDate: "asc" } }),
    db.risk.findMany({ where: { projectId, status: { in: ["OPEN", "MITIGATING", "ESCALATED"] } } }),
    db.issue.findMany({ where: { projectId, status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    db.assumption.findMany({ where: { projectId } }),
    db.changeRequest.findMany({ where: { projectId }, orderBy: { createdAt: "desc" }, take: 40 }),
    db.stageGate.findMany({ where: { projectId }, orderBy: { sequence: "asc" } }),
    db.sprint.findMany({ where: { projectId }, orderBy: { startDate: "asc" } }),
    db.epic.findMany({ where: { projectId } }),
    db.deliverable.findMany({ where: { projectId }, take: 40 }),
    db.strategicObjective.findFirst({ where: { projects: { some: { id: projectId } } }, select: { name: true } }),
  ]);

  const deck = await deckFor({
    deckTitle: `Project Report — ${p.name}`,
    subtitle: `${p.status} · ${p.phase} · ${p.methodology} delivery · health ${p.ragStatus} (${Math.round(p.healthScore)})`,
    project: p,
    metaPairs: objective ? [["Strategic objective", objective.name]] : [],
  });

  // Overview
  deck.section("Overview", "Where this project stands today");
    deck.kpiSlide("Overview KPIs", [
    { label: "Progress", value: `${round2(p.progress)}%`, tone: "blue" },
    { label: "Health", value: Math.round(p.healthScore), sub: p.ragStatus, tone: ragTone(p.healthScore) },
    { label: "Budget", value: money(p.currentBudget, p.currency), sub: `baseline ${money(p.baselineBudget, p.currency)}` },
    { label: "Actual cost", value: money(p.actualCost, p.currency), tone: p.actualCost > p.currentBudget ? "red" : "green" },
    { label: "Schedule", value: `${fmtDate(p.startDate)} → ${fmtDate(p.endDate)}` },
    { label: "Team & scope", value: `${wbs.length} WBS · ${tasks.length} tasks` },
    { label: "RAID", value: `${risks.length} risks · ${issues.length} issues` },
    { label: "Program / Portfolio", value: p.program?.code ?? "—", sub: p.portfolio?.code ?? undefined },
  ]);

  // Schedule / Gantt
  deck.section("Schedule", "Critical path, progress and milestones on the CPM plan");
  deck.gantt("Schedule (Gantt)", tasks.map((t) => ({
    code: t.code, name: t.name, start: t.startDate, end: t.endDate,
    progress: t.progress, status: t.status, isCritical: t.isCritical,
  })));
  deck.table("Dependencies", [
    { header: "Predecessor", w: 1.2, get: (d) => d.predecessor?.code ?? "—" },
    { header: "Type", w: 0.6, get: (d) => d.depType, align: "center" },
    { header: "Lag (days)", w: 0.8, get: (d) => d.lagDays, align: "center" },
    { header: "Successor", w: 1.2, get: (d) => d.successor?.code ?? "—" },
    { header: "External", w: 0.8, get: (d) => (d.isExternal ? "YES" : "—"), align: "center" },
  ], deps, { note: "Saving tasks/dependencies recomputes the CPM plan (ES/EF/LS/LF, floats, critical path)." });

  // Milestones
  deck.table("Milestones", [
    { header: "Code", w: 0.9, get: (m) => m.code },
    { header: "Milestone", w: 3, get: (m) => m.name },
    { header: "Due", w: 0.9, get: (m) => fmtDate(m.dueDate) },
    { header: "Baseline", w: 0.9, get: (m) => fmtDate(m.baselineDate) },
    { header: "Status", w: 0.9, get: (m) => m.status, align: "center" },
    { header: "Critical", w: 0.7, get: (m) => (m.isCritical ? "YES" : "—"), align: "center" },
  ], milestones);

  // Financials & EVM
  deck.section("Financials & EVM", "Budget, actuals and earned value");
  deck.kpiSlide("Summary KPIs", [
    { label: "Baseline budget", value: money(p.baselineBudget, p.currency) },
    { label: "Current budget", value: money(p.currentBudget, p.currency) },
    { label: "Actual cost", value: money(p.actualCost, p.currency) },
    { label: "Forecast (EAC)", value: money(p.forecastCost, p.currency), tone: p.forecastCost > p.currentBudget ? "red" : "green" },
  ]);
  deck.table("Budget lines", [
    { header: "Category", w: 1, get: (b) => b.category, align: "center" },
    { header: "Line", w: 2.6, get: (b) => b.name },
    { header: "Baseline", w: 1, get: (b) => money(b.baselineAmount), align: "right" },
    { header: "Current", w: 1, get: (b) => money(b.currentAmount), align: "right" },
    { header: "Actual", w: 1, get: (b) => money(b.actualAmount), align: "right" },
    { header: "Forecast", w: 1, get: (b) => money(b.forecastAmount), align: "right" },
  ], budgetLines);
  if (evmPeriods.length) {
    deck.chart("EVM trend — CPI / SPI", "line", [
      { name: "CPI", labels: evmPeriods.map((e) => fmtDate(e.statusDate).slice(2)), values: evmPeriods.map((e) => round2(e.cpi) as number) },
      { name: "SPI", labels: evmPeriods.map((e) => fmtDate(e.statusDate).slice(2)), values: evmPeriods.map((e) => round2(e.spi) as number) },
    ], { colors: [C.blue, C.green], note: "Above 1.0 = ahead of cost/schedule plan. Deterministic EVM computed from persisted periods." });
  }

  // RAID & governance
  deck.section("RAID & Governance", "Risks, issues, changes and gates");
  deck.table("Open risks", [
    { header: "Code", w: 0.8, get: (r) => r.code },
    { header: "Risk", w: 3, get: (r) => r.title },
    { header: "Score", w: 0.6, get: (r) => r.score, align: "center" },
    { header: "Severity", w: 0.9, get: (r) => r.severity, align: "center" },
    { header: "Response", w: 1, get: (r) => r.responseStrategy, align: "center" },
    { header: "Owner", w: 1.1, get: (r) => r.ownerName ?? "—" },
    { header: "Due", w: 0.9, get: (r) => fmtDate(r.dueDate) },
  ], risks);
  deck.table("Open issues", [
    { header: "Code", w: 0.8, get: (i) => i.code },
    { header: "Issue", w: 3.4, get: (i) => i.title },
    { header: "Severity", w: 0.9, get: (i) => i.severity, align: "center" },
    { header: "Owner", w: 1.1, get: (i) => i.ownerName ?? "—" },
    { header: "Raised", w: 0.9, get: (i) => fmtDate(i.raisedAt) },
  ], issues);
  deck.table("Assumptions", [
    { header: "Code", w: 0.8, get: (a) => a.code },
    { header: "Assumption", w: 4.4, get: (a) => a.description },
    { header: "Status", w: 0.9, get: (a) => a.status, align: "center" },
    { header: "Impact if false", w: 2.2, get: (a) => a.impactIfFalse ?? "—" },
  ], assumptions);
  deck.table("Change requests", [
    { header: "Code", w: 0.8, get: (c) => c.code },
    { header: "Change", w: 3, get: (c) => c.title },
    { header: "Cost impact", w: 1, get: (c) => money(c.impactCost), align: "right" },
    { header: "Schedule impact", w: 1, get: (c) => `${c.scheduleImpactDays}d`, align: "center" },
    { header: "Status", w: 1, get: (c) => c.status, align: "center" },
  ], changes);
  deck.table("Stage gates", [
    { header: "Seq", w: 0.5, get: (g) => g.sequence, align: "center" },
    { header: "Gate", w: 2.6, get: (g) => g.name },
    { header: "Planned", w: 0.9, get: (g) => fmtDate(g.plannedDate) },
    { header: "Decision", w: 1.1, get: (g) => g.decisionStatus, align: "center" },
    { header: "Decided", w: 0.9, get: (g) => fmtDate(g.decisionDate) },
  ], gates);

  // Agile & delivery
  if (sprints.length || epics.length) {
    deck.section("Agile Delivery", "Sprints, epics and story points — the same tasks as the CPM plan");
    deck.table("Sprints", [
      { header: "Sprint", w: 2.4, get: (s) => s.name },
      { header: "Goal", w: 3.2, get: (s) => s.goal ?? "—" },
      { header: "Status", w: 0.9, get: (s) => s.status, align: "center" },
      { header: "Window", w: 1.6, get: (s) => `${fmtDate(s.startDate)} → ${fmtDate(s.endDate)}` },
      { header: "Committed pts", w: 0.9, get: (s) => s.committedPoints, align: "center" },
    ], sprints);
    deck.table("Epics", [
      { header: "Code", w: 0.8, get: (e) => e.code },
      { header: "Epic", w: 2.8, get: (e) => e.name },
      { header: "Status", w: 0.9, get: (e) => e.status, align: "center" },
      { header: "Business value", w: 3.6, get: (e) => e.businessValue ?? "—" },
    ], epics);
  }
  deck.table("Deliverables", [
    { header: "Code", w: 1, get: (d) => d.code },
    { header: "Deliverable", w: 3.2, get: (d) => d.name },
    { header: "Type", w: 1, get: (d) => d.deliverableType, align: "center" },
    { header: "Due", w: 0.9, get: (d) => fmtDate(d.dueDate) },
    { header: "Quality", w: 0.9, get: (d) => d.qualityStatus, align: "center" },
  ], deliverables);
  return { deck, projectCode: p.code };
}

// ============================================================ Planning views

async function vGantt(projectId: string): Promise<{ deck: Deck; projectCode?: string }> {
  const p = await db.project.findUnique({ where: { id: projectId }, select: { code: true, name: true } });
  const tasks = await db.task.findMany({ where: { projectId }, orderBy: { startDate: "asc" }, take: 500 });
  const deck = await deckFor({ deckTitle: "Schedule (Gantt)", subtitle: `${tasks.length} tasks — CPM critical path highlighted; auto-paginated across slides`, project: p as never });
  deck.gantt("Schedule (Gantt)", tasks.map((t) => ({
    code: t.code, name: t.name, start: t.startDate, end: t.endDate, progress: t.progress, status: t.status, isCritical: t.isCritical,
  })) as GanttTask[]);
  const critical = tasks.filter((t) => t.isCritical);
  deck.table("Critical path activities", [
    { header: "Code", w: 0.9, get: (t) => t.code },
    { header: "Task", w: 3.4, get: (t) => t.name },
    { header: "Start", w: 0.9, get: (t) => fmtDate(t.startDate) },
    { header: "Finish", w: 0.9, get: (t) => fmtDate(t.endDate) },
    { header: "Float (days)", w: 0.9, get: (t) => t.totalFloat, align: "center" },
    { header: "Progress", w: 0.8, get: (t) => `${Math.round(t.progress)}%`, align: "center" },
  ], critical, { note: "Float and critical flags are persisted CPM results." });
  return { deck, projectCode: p?.code };
}

async function vTasks(projectId: string): Promise<{ deck: Deck; projectCode?: string }> {
  const p = await db.project.findUnique({ where: { id: projectId }, select: { code: true, name: true } });
  const tasks = await db.task.findMany({ where: { projectId }, include: { assignee: { select: { name: true } } }, orderBy: [{ wbsId: "asc" }, { code: "asc" }], take: 600 });
  const deck = await deckFor({ deckTitle: "Task Register", subtitle: `${tasks.length} tasks`, project: p as never });
  const byStatus = countBy(tasks, (t) => t.status);
  deck.kpiSlide("Summary KPIs", [
    { label: "Tasks", value: tasks.length },
    { label: "In progress", value: byStatus.get("IN_PROGRESS") ?? 0, tone: "blue" },
    { label: "Completed", value: byStatus.get("COMPLETED") ?? 0, tone: "green" },
    { label: "Blocked", value: byStatus.get("BLOCKED") ?? 0, tone: "red" },
  ]);
  deck.table("Tasks", [
    { header: "Code", w: 0.85, get: (t) => t.code },
    { header: "Task", w: 2.9, get: (t) => t.name },
    { header: "Status", w: 0.95, get: (t) => t.status, align: "center" },
    { header: "Priority", w: 0.8, get: (t) => t.priority, align: "center" },
    { header: "Assignee", w: 1.1, get: (t) => t.assignee?.name ?? "—" },
    { header: "Progress", w: 0.7, get: (t) => `${Math.round(t.progress)}%`, align: "center" },
    { header: "Planned hrs", w: 0.75, get: (t) => num(t.plannedHours, 1), align: "right" },
    { header: "Actual hrs", w: 0.75, get: (t) => num(t.actualHours, 1), align: "right" },
    { header: "Finish", w: 0.85, get: (t) => fmtDate(t.endDate) },
  ], tasks);
  return { deck, projectCode: p?.code };
}

async function vWbs(projectId: string): Promise<{ deck: Deck; projectCode?: string }> {
  const p = await db.project.findUnique({ where: { id: projectId }, select: { code: true, name: true } });
  const nodes = await db.wBSNode.findMany({ where: { projectId }, orderBy: [{ level: "asc" }, { orderIndex: "asc" }] });
  const deck = await deckFor({ deckTitle: "Work Breakdown Structure", subtitle: `${nodes.length} nodes`, project: p as never });
  deck.table("WBS", [
    { header: "Code", w: 0.9, get: (n) => n.code },
    { header: "Node", w: 2.8, get: (n) => `${"— ".repeat(Math.max(0, Math.min(n.level - 1, 4)))}${n.name}` },
    { header: "Type", w: 1, get: (n) => n.nodeType, align: "center" },
    { header: "Owner", w: 1.1, get: (n) => n.ownerName ?? "—" },
    { header: "Planned hrs", w: 0.85, get: (n) => num(n.plannedHours, 1), align: "right" },
    { header: "Actual hrs", w: 0.85, get: (n) => num(n.actualHours, 1), align: "right" },
    { header: "Planned cost", w: 0.95, get: (n) => money(n.plannedCost), align: "right" },
    { header: "Progress", w: 0.7, get: (n) => `${Math.round(n.progress)}%`, align: "center" },
  ], nodes);
  return { deck, projectCode: p?.code };
}

async function vRequirements(projectId: string): Promise<{ deck: Deck; projectCode?: string }> {
  const p = await db.project.findUnique({ where: { id: projectId }, select: { code: true, name: true } });
  const reqs = await db.requirement.findMany({ where: { projectId }, orderBy: { reqCode: "asc" } });
  const deck = await deckFor({ deckTitle: "Requirements", subtitle: `${reqs.length} requirements with acceptance criteria`, project: p as never });
  deck.table("Requirements", [
    { header: "Req ID", w: 0.85, get: (r) => r.reqCode },
    { header: "Requirement", w: 2.9, get: (r) => r.title },
    { header: "Type", w: 0.95, get: (r) => r.reqType, align: "center" },
    { header: "Priority", w: 0.8, get: (r) => r.priority, align: "center" },
    { header: "Status", w: 0.85, get: (r) => r.status, align: "center" },
    { header: "Effort", w: 0.65, get: (r) => num(r.effortEstimate, 1), align: "right" },
    { header: "Acceptance criteria", w: 2.8, get: (r) => r.acceptanceCriteria ?? "—" },
  ], reqs);
  return { deck, projectCode: p?.code };
}

async function vMilestones(projectId: string): Promise<{ deck: Deck; projectCode?: string }> {
  const p = await db.project.findUnique({ where: { id: projectId }, select: { code: true, name: true } });
  const ms = await db.milestone.findMany({ where: { projectId }, orderBy: { dueDate: "asc" } });
  const deck = await deckFor({ deckTitle: "Milestones", subtitle: `${ms.length} milestones`, project: p as never });
  deck.table("Milestones", [
    { header: "Code", w: 0.9, get: (m) => m.code },
    { header: "Milestone", w: 3, get: (m) => m.name },
    { header: "Due", w: 0.9, get: (m) => fmtDate(m.dueDate) },
    { header: "Baseline", w: 0.9, get: (m) => fmtDate(m.baselineDate) },
    { header: "Status", w: 0.95, get: (m) => m.status, align: "center" },
    { header: "Critical", w: 0.75, get: (m) => (m.isCritical ? "YES" : "—"), align: "center" },
    { header: "Completed", w: 0.9, get: (m) => fmtDate(m.completedAt) },
  ], ms);
  return { deck, projectCode: p?.code };
}

async function vBaselines(projectId: string): Promise<{ deck: Deck; projectCode?: string }> {
  const p = await db.project.findUnique({ where: { id: projectId }, select: { code: true, name: true } });
  const bl = await db.baseline.findMany({ where: { projectId }, orderBy: { version: "desc" } });
  const deck = await deckFor({ deckTitle: "Baselines", subtitle: `${bl.length} versioned baselines`, project: p as never });
  deck.table("Baselines", [
    { header: "Version", w: 0.7, get: (b) => `v${b.version}`, align: "center" },
    { header: "Name", w: 2.2, get: (b) => b.name },
    { header: "Status", w: 0.95, get: (b) => b.status, align: "center" },
    { header: "Start", w: 0.95, get: (b) => fmtDate(b.baselineStart) },
    { header: "Finish", w: 0.95, get: (b) => fmtDate(b.baselineFinish) },
    { header: "Hours", w: 0.8, get: (b) => num(b.baselineHours, 1), align: "right" },
    { header: "Cost", w: 1, get: (b) => money(b.baselineCost), align: "right" },
    { header: "Activated", w: 0.95, get: (b) => fmtDate(b.activatedAt) },
  ], bl);
  return { deck, projectCode: p?.code };
}

async function vProjectFinancials(projectId: string): Promise<{ deck: Deck; projectCode?: string }> {
  const p = await db.project.findUnique({ where: { id: projectId }, select: { code: true, name: true, currency: true, baselineBudget: true, currentBudget: true, actualCost: true, forecastCost: true } });
  const lines = await db.budgetLine.findMany({ where: { projectId } });
  const deck = await deckFor({ deckTitle: "Project Financials", subtitle: `${lines.length} budget lines`, project: p as never });
  if (p) {
  deck.kpiSlide("Financial position", [
      { label: "Baseline", value: money(p.baselineBudget, p.currency) },
      { label: "Current", value: money(p.currentBudget, p.currency) },
      { label: "Actual", value: money(p.actualCost, p.currency) },
      { label: "Forecast", value: money(p.forecastCost, p.currency), tone: p.forecastCost > p.currentBudget ? "red" : "green" },
    ]);
  }
  deck.table("Budget lines", [
    { header: "Category", w: 1, get: (b) => b.category, align: "center" },
    { header: "Line", w: 2.8, get: (b) => b.name },
    { header: "Baseline", w: 1, get: (b) => money(b.baselineAmount), align: "right" },
    { header: "Current", w: 1, get: (b) => money(b.currentAmount), align: "right" },
    { header: "Actual", w: 1, get: (b) => money(b.actualAmount), align: "right" },
    { header: "Forecast", w: 1, get: (b) => money(b.forecastAmount), align: "right" },
  ], lines);
  return { deck, projectCode: p?.code };
}

async function vEvm(projectId: string): Promise<{ deck: Deck; projectCode?: string }> {
  const p = await db.project.findUnique({ where: { id: projectId }, select: { code: true, name: true } });
  const periods = await db.evmPeriod.findMany({ where: { projectId }, orderBy: { statusDate: "asc" } });
  const latest = periods[periods.length - 1];
  const deck = await deckFor({ deckTitle: "Earned Value (EVM)", subtitle: periods.length ? `${periods.length} periods up to ${fmtDate(latest?.statusDate)}` : "No EVM periods recorded", project: p as never });
  if (latest) {
    deck.kpiSlide("Summary KPIs", [
      { label: "CPI", value: round2(latest.cpi), tone: latest.cpi >= 1 ? "green" : latest.cpi >= 0.85 ? "amber" : "red" },
      { label: "SPI", value: round2(latest.spi), tone: latest.spi >= 1 ? "green" : latest.spi >= 0.85 ? "amber" : "red" },
      { label: "EAC", value: money(latest.eac), sub: `BAC ${money(latest.bac)}` },
      { label: "VAC", value: money(latest.vac), tone: latest.vac < 0 ? "red" : "green" },
    ]);
    deck.chart("EV / PV / AC trend", "bar", [
      { name: "PV", labels: periods.map((e) => fmtDate(e.statusDate).slice(2)), values: periods.map((e) => round2(e.pv)) },
      { name: "EV", labels: periods.map((e) => fmtDate(e.statusDate).slice(2)), values: periods.map((e) => round2(e.ev)) },
      { name: "AC", labels: periods.map((e) => fmtDate(e.statusDate).slice(2)), values: periods.map((e) => round2(e.ac)) },
    ]);
  }
  deck.table("EVM periods", [
    { header: "Status date", w: 1, get: (e) => fmtDate(e.statusDate) },
    { header: "BAC", w: 1, get: (e) => money(e.bac), align: "right" },
    { header: "PV", w: 1, get: (e) => money(e.pv), align: "right" },
    { header: "EV", w: 1, get: (e) => money(e.ev), align: "right" },
    { header: "AC", w: 1, get: (e) => money(e.ac), align: "right" },
    { header: "CPI", w: 0.6, get: (e) => round2(e.cpi), align: "center" },
    { header: "SPI", w: 0.6, get: (e) => round2(e.spi), align: "center" },
    { header: "EAC", w: 1, get: (e) => money(e.eac), align: "right" },
    { header: "VAC", w: 1, get: (e) => money(e.vac), align: "right" },
  ], periods);
  return { deck, projectCode: p?.code };
}

async function vHealth(projectId: string): Promise<{ deck: Deck; projectCode?: string }> {
  const p = await db.project.findUnique({ where: { id: projectId }, select: { code: true, name: true, healthScore: true, ragStatus: true } });
  const snaps = await db.projectHealthSnapshot.findMany({ where: { projectId }, orderBy: { capturedAt: "asc" }, take: 60 });
  const deck = await deckFor({ deckTitle: "Health & Trend", subtitle: `${snaps.length} snapshots`, project: p as never });
  if (snaps.length) {
    deck.chart("Health score trend", "line", [
      { name: "Health", labels: snaps.map((s) => fmtDate(s.capturedAt).slice(2)), values: snaps.map((s) => Math.round(s.healthScore)) },
    ], { legend: false, colors: [C.blue] });
  }
  deck.table("Health snapshots", [
    { header: "Captured", w: 1, get: (s) => fmtDate(s.capturedAt) },
    { header: "Score", w: 0.7, get: (s) => Math.round(s.healthScore), align: "center" },
    { header: "RAG", w: 0.7, get: (s) => s.ragStatus, align: "center" },
    { header: "CPI", w: 0.6, get: (s) => round2(s.cpi), align: "center" },
    { header: "SPI", w: 0.6, get: (s) => round2(s.spi), align: "center" },
    { header: "EAC", w: 1, get: (s) => money(s.eac), align: "right" },
    { header: "Open risks", w: 0.8, get: (s) => s.openRisks, align: "center" },
    { header: "Open issues", w: 0.8, get: (s) => s.openIssues, align: "center" },
    { header: "Overdue ms", w: 0.8, get: (s) => s.overdueMilestones, align: "center" },
  ], snaps);
  return { deck, projectCode: p?.code };
}

async function vRaid(projectId: string): Promise<{ deck: Deck; projectCode?: string }> {
  const p = await db.project.findUnique({ where: { id: projectId }, select: { code: true, name: true } });
  const [risks, issues, assumptions, deps] = await Promise.all([
    db.risk.findMany({ where: { projectId }, orderBy: { score: "desc" }, take: 150 }),
    db.issue.findMany({ where: { projectId }, orderBy: { raisedAt: "desc" }, take: 150 }),
    db.assumption.findMany({ where: { projectId }, take: 100 }),
    db.dependency.findMany({ where: { projectId }, include: { predecessor: { select: { code: true } }, successor: { select: { code: true } } }, take: 150 }),
  ]);
  const deck = await deckFor({ deckTitle: "RAID", subtitle: `${risks.length} risks · ${issues.length} issues · ${assumptions.length} assumptions · ${deps.length} dependencies`, project: p as never });
  deck.table("Risk register", [
    { header: "Code", w: 0.8, get: (r) => r.code },
    { header: "Risk", w: 3.2, get: (r) => r.title },
    { header: "P", w: 0.4, get: (r) => r.probability, align: "center" },
    { header: "I", w: 0.4, get: (r) => r.impact, align: "center" },
    { header: "Score", w: 0.55, get: (r) => r.score, align: "center" },
    { header: "Status", w: 0.9, get: (r) => r.status, align: "center" },
    { header: "Owner", w: 1.05, get: (r) => r.ownerName ?? "—" },
    { header: "Mitigation", w: 2.4, get: (r) => r.mitigation ?? "—" },
  ], risks);
  deck.table("Issue register", [
    { header: "Code", w: 0.8, get: (i) => i.code },
    { header: "Issue", w: 3.6, get: (i) => i.title },
    { header: "Severity", w: 0.9, get: (i) => i.severity, align: "center" },
    { header: "Status", w: 0.9, get: (i) => i.status, align: "center" },
    { header: "Owner", w: 1.05, get: (i) => i.ownerName ?? "—" },
    { header: "Resolution", w: 2.5, get: (i) => i.resolution ?? "—" },
  ], issues);
  deck.table("Assumptions & dependencies", [
    { header: "Type", w: 0.8, get: (r) => r.__kind, align: "center" },
    { header: "Ref", w: 0.8, get: (r) => r.code ?? r.depType ?? "—" },
    { header: "Description", w: 4.4, get: (r) => r.description ?? `${r.predecessor?.code ?? "?"} → ${r.successor?.code ?? "?"}` },
    { header: "Status / lag", w: 1.1, get: (r) => r.status ?? `${r.lagDays ?? 0}d`, align: "center" },
  ], [
    ...assumptions.map((a) => ({ __kind: "ASSUMPTION", code: a.code, description: a.description, status: a.status })),
    ...deps.map((d) => ({ __kind: "DEPENDENCY", code: d.predecessor?.code, depType: d.depType, predecessor: d.predecessor, successor: d.successor, description: `${d.predecessor?.code ?? "?"} → ${d.successor?.code ?? "?"}`, lagDays: d.lagDays })),
  ] as never[]);
  return { deck, projectCode: p?.code };
}

async function vChanges(projectId: string): Promise<{ deck: Deck; projectCode?: string }> {
  const p = await db.project.findUnique({ where: { id: projectId }, select: { code: true, name: true } });
  const rows = await db.changeRequest.findMany({ where: { projectId }, orderBy: { createdAt: "desc" }, take: 100 });
  const deck = await deckFor({ deckTitle: "Change Control", subtitle: `${rows.length} change requests`, project: p as never });
  deck.table("Change requests", [
    { header: "Code", w: 0.8, get: (c) => c.code },
    { header: "Change", w: 2.9, get: (c) => c.title },
    { header: "Category", w: 0.9, get: (c) => c.category, align: "center" },
    { header: "Cost impact", w: 1, get: (c) => money(c.impactCost), align: "right" },
    { header: "Schedule", w: 0.85, get: (c) => `${c.scheduleImpactDays}d`, align: "center" },
    { header: "Status", w: 1, get: (c) => c.status, align: "center" },
    { header: "Decision", w: 1.1, get: (c) => c.decision ?? "—" },
  ], rows);
  return { deck, projectCode: p?.code };
}

async function vGates(projectId: string): Promise<{ deck: Deck; projectCode?: string }> {
  const p = await db.project.findUnique({ where: { id: projectId }, select: { code: true, name: true } });
  const gates = await db.stageGate.findMany({ where: { projectId }, orderBy: { sequence: "asc" } });
  const deck = await deckFor({ deckTitle: "Stage Gates", subtitle: `${gates.length} gates`, project: p as never });
  deck.table("Stage gates", [
    { header: "Seq", w: 0.5, get: (g) => g.sequence, align: "center" },
    { header: "Gate", w: 2.4, get: (g) => g.name },
    { header: "Criteria", w: 3, get: (g) => g.criteria ?? "—" },
    { header: "Planned", w: 0.9, get: (g) => fmtDate(g.plannedDate) },
    { header: "Decision", w: 1.1, get: (g) => g.decisionStatus, align: "center" },
    { header: "Approver", w: 1.1, get: (g) => g.approverName ?? "—" },
    { header: "Decided", w: 0.9, get: (g) => fmtDate(g.decisionDate) },
  ], gates);
  return { deck, projectCode: p?.code };
}

// ============================================================ Agile & boards

async function vAgile(projectId: string): Promise<{ deck: Deck; projectCode?: string }> {
  const p = await db.project.findUnique({ where: { id: projectId }, select: { code: true, name: true } });
  const [sprints, epics, tasks] = await Promise.all([
    db.sprint.findMany({ where: { projectId }, orderBy: { startDate: "asc" } }),
    db.epic.findMany({ where: { projectId }, orderBy: { code: "asc" } }),
    db.task.findMany({ where: { projectId }, include: { sprint: { select: { name: true } }, epic: { select: { code: true } }, assignee: { select: { name: true } } }, orderBy: { backlogOrder: "asc" }, take: 400 }),
  ]);
  const totalPoints = tasks.reduce((s, t) => s + (t.storyPoints ?? 0), 0);
  const donePoints = tasks.filter((t) => t.status === "COMPLETED").reduce((s, t) => s + (t.storyPoints ?? 0), 0);
  const deck = await deckFor({ deckTitle: "Agile Delivery", subtitle: `${sprints.length} sprints · ${epics.length} epics · ${tasks.length} cards`, project: p as never });
  deck.kpiSlide("Summary KPIs", [
    { label: "Sprints", value: sprints.length, sub: `${sprints.filter((s) => s.status === "ACTIVE").length} active` },
    { label: "Story points", value: totalPoints, sub: `${donePoints} completed`, tone: "blue" },
    { label: "Backlog cards", value: tasks.filter((t) => !t.sprintId).length },
    { label: "Epics", value: epics.length },
  ]);
  deck.table("Sprints", [
    { header: "Sprint", w: 2.2, get: (s) => s.name },
    { header: "Goal", w: 3.4, get: (s) => s.goal ?? "—" },
    { header: "Status", w: 0.9, get: (s) => s.status, align: "center" },
    { header: "Window", w: 1.7, get: (s) => `${fmtDate(s.startDate)} → ${fmtDate(s.endDate)}` },
    { header: "Committed", w: 0.8, get: (s) => s.committedPoints, align: "center" },
  ], sprints);
  deck.table("Backlog & sprint cards", [
    { header: "Code", w: 0.85, get: (t) => t.code },
    { header: "Card", w: 3.1, get: (t) => t.name },
    { header: "Status", w: 0.95, get: (t) => t.status, align: "center" },
    { header: "Points", w: 0.6, get: (t) => t.storyPoints || "—", align: "center" },
    { header: "Sprint", w: 1.4, get: (t) => t.sprint?.name ?? "Backlog" },
    { header: "Epic", w: 0.9, get: (t) => t.epic?.code ?? "—" },
    { header: "Assignee", w: 1.05, get: (t) => t.assignee?.name ?? "—" },
  ], tasks);
  return { deck, projectCode: p?.code };
}

async function vBoards(projectId: string | null): Promise<{ deck: Deck; projectCode?: string }> {
  const p = projectId ? await db.project.findUnique({ where: { id: projectId }, select: { code: true, name: true } }) : null;
  const tasks = await db.task.findMany({
    where: projectId ? { projectId } : {},
    include: { project: { select: { code: true } }, assignee: { select: { name: true } } },
    orderBy: { code: "asc" }, take: 500,
  });
  const byStatus = countBy(tasks, (t) => t.status);
  const deck = await deckFor({ deckTitle: "Boards — Kanban · Calendar · Workload", subtitle: `${tasks.length} task cards across status lanes`, project: p as never });
  deck.kpiSlide("Summary KPIs", [
    { label: "Not started", value: byStatus.get("NOT_STARTED") ?? 0 },
    { label: "In progress", value: byStatus.get("IN_PROGRESS") ?? 0, tone: "blue" },
    { label: "Completed", value: byStatus.get("COMPLETED") ?? 0, tone: "green" },
    { label: "Blocked", value: byStatus.get("BLOCKED") ?? 0, tone: "red" },
  ]);
  deck.table("Kanban — cards by lane", [
    { header: "Code", w: 0.85, get: (t) => t.code },
    { header: "Card", w: 3, get: (t) => t.name },
    { header: "Lane", w: 1, get: (t) => t.status, align: "center" },
    { header: "Project", w: 0.9, get: (t) => t.project?.code ?? "—" },
    { header: "Assignee", w: 1.05, get: (t) => t.assignee?.name ?? "—" },
    { header: "Points", w: 0.6, get: (t) => t.storyPoints || "—", align: "center" },
    { header: "Due", w: 0.85, get: (t) => fmtDate(t.endDate) },
  ], tasks);
  // meetings calendar (next 60 days)
  const meetings = await db.meeting.findMany({
    where: { scheduledAt: { gte: new Date(), lte: new Date(Date.now() + 60 * DAY) } },
    orderBy: { scheduledAt: "asc" }, take: 60,
  });
  deck.table("Calendar — upcoming meetings (60 days)", [
    { header: "When", w: 1.3, get: (m) => new Date(m.scheduledAt).toISOString().slice(0, 16).replace("T", " ") },
    { header: "Meeting", w: 3.2, get: (m) => m.title },
    { header: "Type", w: 1.1, get: (m) => m.meetingType, align: "center" },
    { header: "Status", w: 0.95, get: (m) => m.status, align: "center" },
    { header: "Location", w: 1.8, get: (m) => m.location ?? "—" },
  ], meetings);
  return { deck, projectCode: p?.code };
}

async function vWorkload(): Promise<{ deck: Deck }> {
  const resources = await db.resource.findMany({ where: { isActive: true }, include: { assignments: { where: { status: "ACTIVE" } } }, orderBy: { name: "asc" }, take: 200 });
  const rows = resources.map((r) => {
    const capacity = r.capacityHoursPerWeek || 40;
    const allocated = round2(r.assignments.reduce((s, a) => s + (a.allocationPercent / 100) * 40, 0));
    return { name: r.name, code: r.employeeCode, dept: r.department ?? "—", capacity, allocated, util: round2(safeDiv(allocated, capacity, 0) * 100) };
  }).sort((a, b) => b.util - a.util);
  const deck = await deckFor({ deckTitle: "Resource Workload", subtitle: `${rows.length} active resources — utilization vs weekly capacity` });
  const top = rows.slice(0, 12);
  deck.chart("Utilization % (top 12)", "bar", [{ name: "Utilization %", labels: top.map((r) => r.name), values: top.map((r) => r.util) }], {
    legend: false, colors: [C.blue], note: "Over 100% = over-allocated. Amber zone 85–100%.",
  });
  deck.table("Capacity sheet", [
    { header: "Resource", w: 1.8, get: (r) => r.name },
    { header: "Emp ID", w: 0.8, get: (r) => r.code },
    { header: "Department", w: 1.4, get: (r) => r.dept },
    { header: "Capacity (h/wk)", w: 1.1, get: (r) => r.capacity, align: "center" },
    { header: "Allocated (h/wk)", w: 1.15, get: (r) => r.allocated, align: "center" },
    { header: "Utilization", w: 0.9, get: (r) => `${r.util}%`, align: "center" },
    { header: "Flag", w: 0.9, get: (r) => (r.util > 100 ? "OVER" : r.util >= 85 ? "HIGH" : r.util < 30 ? "BENCH" : "OK"), align: "center" },
  ], rows);
  return { deck };
}

// ============================================================ Resources & timesheets

async function vResources(): Promise<{ deck: Deck }> {
  const resources = await db.resource.findMany({ include: { _count: { select: { assignments: true } } }, orderBy: { name: "asc" }, take: 300 });
  const deck = await deckFor({ deckTitle: "Resource Register", subtitle: `${resources.length} resources` });
  deck.table("Resources", [
    { header: "Name", w: 1.6, get: (r) => r.name },
    { header: "Emp ID", w: 0.8, get: (r) => r.employeeCode },
    { header: "Title", w: 1.5, get: (r) => r.title ?? "—" },
    { header: "Dept", w: 1.1, get: (r) => r.department ?? "—" },
    { header: "Skills", w: 2.2, get: (r) => r.primarySkill ?? "—" },
    { header: "Capacity (h/wk)", w: 0.95, get: (r) => r.capacityHoursPerWeek, align: "center" },
    { header: "Cost rate", w: 0.85, get: (r) => money(r.costRate), align: "right" },
    { header: "Bill rate", w: 0.85, get: (r) => money(r.billableRate), align: "right" },
    { header: "Assignments", w: 0.85, get: (r) => r._count.assignments, align: "center" },
  ], resources);
  return { deck };
}

async function vTimesheets(): Promise<{ deck: Deck }> {
  const sheets = await db.timesheet.findMany({
    include: { resource: { select: { name: true, employeeCode: true } } },
    orderBy: { weekStart: "desc" }, take: 300,
  });
  const deck = await deckFor({ deckTitle: "Timesheets", subtitle: `${sheets.length} weekly timesheets — approvals cascade into project actuals` });
  deck.table("Timesheets", [
    { header: "Resource", w: 1.7, get: (t) => t.resource?.name ?? "—" },
    { header: "Week", w: 1.2, get: (t) => fmtDate(t.weekStart) },
    { header: "Status", w: 1.05, get: (t) => t.status, align: "center" },
    { header: "Total h", w: 0.7, get: (t) => num(t.totalHours, 1), align: "right" },
    { header: "Billable h", w: 0.75, get: (t) => num(t.billableHours, 1), align: "right" },
    { header: "Overtime h", w: 0.8, get: (t) => num(t.overtimeHours, 1), align: "right" },
    { header: "Submitted", w: 1.05, get: (t) => fmtDate(t.submittedAt) },
    { header: "Approved", w: 1.05, get: (t) => fmtDate(t.approvedAt) },
  ], sheets);
  return { deck };
}

// ============================================================ Financials & commerce

async function vFinancials(): Promise<{ deck: Deck }> {
  const projects = await db.project.findMany({ orderBy: { currentBudget: "desc" }, take: 200 });
  const budget = projects.reduce((s, p) => s + p.currentBudget, 0);
  const actual = projects.reduce((s, p) => s + p.actualCost, 0);
  const forecast = projects.reduce((s, p) => s + p.forecastCost, 0);
  const deck = await deckFor({ deckTitle: "Portfolio Financials", subtitle: `${projects.length} projects — budget, actuals and forecast` });
  deck.kpiSlide("Summary KPIs", [
    { label: "Budget", value: money(budget) },
    { label: "Actual", value: money(actual), tone: actual > budget ? "red" : "green" },
    { label: "Forecast", value: money(forecast), tone: forecast > budget ? "red" : "green" },
    { label: "Variance", value: money(forecast - budget), tone: forecast > budget ? "red" : "green", sub: `${round2(safeDiv(forecast - budget, budget, 0) * 100)}% of budget` },
  ]);
  const top = projects.slice(0, 12);
  deck.chart("Budget vs actual vs forecast — top 12 by budget", "bar", [
    { name: "Budget", labels: top.map((p) => p.code), values: top.map((p) => round2(p.currentBudget)) },
    { name: "Actual", labels: top.map((p) => p.code), values: top.map((p) => round2(p.actualCost)) },
    { name: "Forecast", labels: top.map((p) => p.code), values: top.map((p) => round2(p.forecastCost)) },
  ]);
  deck.table("Financial sheet", [
    { header: "Project", w: 1, get: (p) => p.code },
    { header: "Name", w: 2.3, get: (p) => p.name },
    { header: "Baseline", w: 1, get: (p) => money(p.baselineBudget, p.currency), align: "right" },
    { header: "Budget", w: 1, get: (p) => money(p.currentBudget, p.currency), align: "right" },
    { header: "Actual", w: 1, get: (p) => money(p.actualCost, p.currency), align: "right" },
    { header: "Forecast", w: 1, get: (p) => money(p.forecastCost, p.currency), align: "right" },
    { header: "Variance", w: 1, get: (p) => money(p.forecastCost - p.currentBudget, p.currency), align: "right" },
    { header: "RAG", w: 0.55, get: (p) => p.ragStatus, align: "center" },
  ], projects);
  return { deck };
}

async function vClients(): Promise<{ deck: Deck }> {
  const [clients, invoices, expenses] = await Promise.all([
    db.client.findMany({ include: { _count: { select: { projects: true, invoices: true } } }, orderBy: { name: "asc" } }),
    db.invoice.findMany({ include: { client: { select: { name: true } }, project: { select: { code: true } } }, orderBy: { createdAt: "desc" }, take: 200 }),
    db.expense.findMany({ include: { project: { select: { code: true } } }, orderBy: { expenseDate: "desc" }, take: 200 }),
  ]);
  const invoiced = invoices.filter((i) => i.status !== "VOID").reduce((s, i) => s + i.total, 0);
  const paid = invoices.filter((i) => i.status === "PAID").reduce((s, i) => s + i.total, 0);
  const outstanding = invoices.filter((i) => i.status === "SENT" || i.status === "OVERDUE").reduce((s, i) => s + i.total, 0);
  const deck = await deckFor({ deckTitle: "Clients & Billing", subtitle: `${clients.length} clients · ${invoices.length} invoices · ${expenses.length} expenses` });
  deck.kpiSlide("Summary KPIs", [
    { label: "Invoiced", value: money(invoiced) },
    { label: "Paid", value: money(paid), tone: "green" },
    { label: "Outstanding", value: money(outstanding), tone: outstanding > 0 ? "amber" : "green" },
    { label: "Expenses", value: money(expenses.reduce((s, e) => s + e.amount, 0)), sub: `${expenses.filter((e) => e.status === "PENDING").length} pending` },
  ]);
  deck.table("Clients", [
    { header: "Client", w: 1.9, get: (c) => c.name },
    { header: "Organization", w: 1.6, get: (c) => c.organization ?? "—" },
    { header: "Contact", w: 1.3, get: (c) => c.contactName ?? "—" },
    { header: "Status", w: 0.9, get: (c) => c.status, align: "center" },
    { header: "Projects", w: 0.7, get: (c) => c._count.projects, align: "center" },
    { header: "Invoices", w: 0.75, get: (c) => c._count.invoices, align: "center" },
  ], clients);
  deck.table("Invoices", [
    { header: "Number", w: 1.2, get: (i) => i.number },
    { header: "Client", w: 1.6, get: (i) => i.client?.name ?? "—" },
    { header: "Project", w: 0.85, get: (i) => i.project?.code ?? "—" },
    { header: "Issued", w: 0.9, get: (i) => fmtDate(i.issueDate) },
    { header: "Due", w: 0.9, get: (i) => fmtDate(i.dueDate) },
    { header: "Total", w: 1, get: (i) => money(i.total, i.currency), align: "right" },
    { header: "Status", w: 0.9, get: (i) => i.status, align: "center" },
  ], invoices);
  deck.table("Expenses", [
    { header: "Date", w: 0.9, get: (e) => fmtDate(e.expenseDate) },
    { header: "Description", w: 3.2, get: (e) => e.description },
    { header: "Project", w: 0.85, get: (e) => e.project?.code ?? "—" },
    { header: "Category", w: 0.95, get: (e) => e.category, align: "center" },
    { header: "Amount", w: 1, get: (e) => money(e.amount, e.currency), align: "right" },
    { header: "Billable", w: 0.7, get: (e) => (e.billable ? "YES" : "—"), align: "center" },
    { header: "Status", w: 0.95, get: (e) => e.status, align: "center" },
  ], expenses);
  return { deck };
}

// ============================================================ Field ops, proofing, strategy, collaboration

async function vField(projectId: string): Promise<{ deck: Deck; projectCode?: string }> {
  const p = await db.project.findUnique({ where: { id: projectId }, select: { code: true, name: true } });
  const [rfis, logs, punch] = await Promise.all([
    db.rfi.findMany({ where: { projectId }, orderBy: { dateOpened: "desc" }, take: 200 }),
    db.dailyLog.findMany({ where: { projectId }, orderBy: { logDate: "desc" }, take: 120 }),
    db.punchListItem.findMany({ where: { projectId }, orderBy: { code: "asc" }, take: 200 }),
  ]);
  const now = Date.now();
  const deck = await deckFor({ deckTitle: "Field Operations", subtitle: `${rfis.length} RFIs · ${logs.length} daily logs · ${punch.length} punch items`, project: p as never });
  deck.kpiSlide("Summary KPIs", [
    { label: "Open RFIs", value: rfis.filter((r) => r.status === "OPEN").length, tone: "amber" },
    { label: "RFI cost impact", value: money(rfis.reduce((s, r) => s + r.costImpact, 0)) },
    { label: "Safety incidents", value: logs.reduce((s, l) => s + l.safetyIncidents, 0), tone: "red" },
    { label: "Punch open", value: punch.filter((i) => i.status === "OPEN" || i.status === "IN_PROGRESS").length },
  ]);
  deck.table("RFI register", [
    { header: "RFI", w: 0.9, get: (r) => r.rfiCode },
    { header: "Subject", w: 3, get: (r) => r.subject },
    { header: "Discipline", w: 1.05, get: (r) => r.discipline, align: "center" },
    { header: "Status", w: 0.9, get: (r) => r.status, align: "center" },
    { header: "Age (d)", w: 0.65, get: (r) => Math.floor((now - r.dateOpened.getTime()) / DAY), align: "center" },
    { header: "Cost impact", w: 0.95, get: (r) => (r.costImpact ? money(r.costImpact) : "—"), align: "right" },
    { header: "Schedule (d)", w: 0.85, get: (r) => r.scheduleImpactDays || "—", align: "center" },
  ], rfis, { note: "Age over 7 days unanswered is flagged in the application." });
  deck.table("Daily logs", [
    { header: "Date", w: 0.95, get: (l) => fmtDate(l.logDate) },
    { header: "Weather", w: 1.05, get: (l) => l.weather ?? "—" },
    { header: "Crew", w: 0.6, get: (l) => l.crewCount, align: "center" },
    { header: "Work performed", w: 4, get: (l) => l.workPerformed ?? "—" },
    { header: "Delays", w: 2, get: (l) => l.delays ?? "—" },
    { header: "Safety", w: 0.65, get: (l) => l.safetyIncidents, align: "center" },
  ], logs);
  deck.table("Punch list", [
    { header: "Code", w: 0.95, get: (i) => i.code },
    { header: "Item", w: 3.4, get: (i) => i.title },
    { header: "Location", w: 1.4, get: (i) => i.location ?? "—" },
    { header: "Severity", w: 0.85, get: (i) => i.severity, align: "center" },
    { header: "Status", w: 1, get: (i) => i.status, align: "center" },
    { header: "Assignee", w: 1.15, get: (i) => i.assigneeName ?? "—" },
  ], punch);
  return { deck, projectCode: p?.code };
}

async function vProofing(projectId: string | null): Promise<{ deck: Deck; projectCode?: string }> {
  const p = projectId ? await db.project.findUnique({ where: { id: projectId }, select: { code: true, name: true } }) : null;
  const rounds = await db.proofRound.findMany({
    where: projectId ? { deliverable: { projectId } } : {},
    include: { deliverable: { select: { code: true, name: true } }, annotations: true },
    orderBy: { createdAt: "desc" }, take: 200,
  });
  const deck = await deckFor({ deckTitle: "Proofing & Approvals", subtitle: `${rounds.length} review rounds`, project: p as never });
  deck.table("Proof rounds", [
    { header: "Deliverable", w: 2.8, get: (r) => `${r.deliverable?.code ?? ""} ${r.deliverable?.name ?? ""}` },
    { header: "Round", w: 0.6, get: (r) => r.roundNumber, align: "center" },
    { header: "Version", w: 0.8, get: (r) => r.versionLabel, align: "center" },
    { header: "Status", w: 1.2, get: (r) => r.status, align: "center" },
    { header: "Reviewer", w: 1.2, get: (r) => r.reviewerName ?? "—" },
    { header: "Open notes", w: 0.85, get: (r) => r.annotations.filter((a) => !a.resolved).length, align: "center" },
    { header: "Decided", w: 0.95, get: (r) => fmtDate(r.decisionAt) },
  ], rounds);
  return { deck, projectCode: p?.code };
}

async function vFeedback(): Promise<{ deck: Deck }> {
  const posts = await db.feedbackPost.findMany({ include: { project: { select: { code: true } }, roadmapItem: { select: { title: true, quarter: true } } }, orderBy: { votesCount: "desc" }, take: 150 });
  const deck = await deckFor({ deckTitle: "Feedback & Voting", subtitle: `${posts.length} posts — sorted by demand` });
  const top = posts.slice(0, 10);
  deck.chart("Top voted", "bar", [{ name: "Votes", labels: top.map((p) => trunc(p.title, 28)), values: top.map((p) => p.votesCount) }], { legend: false });
  deck.table("Feedback board", [
    { header: "Post", w: 3.2, get: (p) => p.title },
    { header: "Category", w: 0.9, get: (p) => p.category, align: "center" },
    { header: "Votes", w: 0.6, get: (p) => p.votesCount, align: "center" },
    { header: "Status", w: 1.05, get: (p) => p.status, align: "center" },
    { header: "Source", w: 0.8, get: (p) => p.source, align: "center" },
    { header: "Roadmap", w: 1.3, get: (p) => p.roadmapItem ? `${p.roadmapItem.quarter}` : "—" },
  ], posts);
  return { deck };
}

async function vRoadmap(): Promise<{ deck: Deck }> {
  const items = await db.roadmapItem.findMany({ include: { project: { select: { code: true } }, linkedFeedback: { select: { id: true } } }, orderBy: [{ quarter: "asc" }, { orderIndex: "asc" }], take: 200 });
  const deck = await deckFor({ deckTitle: "Delivery Roadmap", subtitle: `${items.length} items across ${new Set(items.map((i) => i.quarter)).size} quarters` });
  deck.table("Roadmap", [
    { header: "Quarter", w: 0.85, get: (i) => i.quarter, align: "center" },
    { header: "Item", w: 3, get: (i) => i.title },
    { header: "Status", w: 1.05, get: (i) => i.status, align: "center" },
    { header: "Progress", w: 0.8, get: (i) => `${Math.round(i.progress)}%`, align: "center" },
    { header: "Release", w: 0.9, get: (i) => i.releaseTag ?? "—" },
    { header: "Project", w: 0.9, get: (i) => i.project?.code ?? "—" },
    { header: "Linked demand", w: 1, get: (i) => i.linkedFeedback.length, align: "center" },
  ], items);
  return { deck };
}

async function vGovernance(): Promise<{ deck: Deck }> {
  const [rules, alerts] = await Promise.all([
    db.governanceRule.findMany({ orderBy: { severity: "desc" }, take: 60 }),
    db.alertEvent.findMany({ include: { project: { select: { code: true } } }, orderBy: { createdAt: "desc" }, take: 150 }),
  ]);
  const deck = await deckFor({ deckTitle: "Governance & Alerts", subtitle: `${rules.length} rules · ${alerts.length} alerts` });
  deck.table("Rules", [
    { header: "Rule", w: 2.2, get: (r) => r.name },
    { header: "Metric", w: 1.2, get: (r) => r.metric, align: "center" },
    { header: "Condition", w: 1.2, get: (r) => `${r.operator} ${r.threshold}`, align: "center" },
    { header: "Severity", w: 0.9, get: (r) => r.severity, align: "center" },
    { header: "Active", w: 0.7, get: (r) => (r.isActive ? "YES" : "—"), align: "center" },
    { header: "Triggered", w: 0.8, get: (r) => r.executionCount, align: "center" },
  ], rules);
  deck.table("Alert backlog", [
    { header: "Raised", w: 1, get: (a) => fmtDate(a.createdAt) },
    { header: "Project", w: 0.9, get: (a) => a.project?.code ?? "—" },
    { header: "Alert", w: 3.6, get: (a) => a.title },
    { header: "Severity", w: 0.9, get: (a) => a.severity, align: "center" },
    { header: "Status", w: 0.9, get: (a) => a.status, align: "center" },
  ], alerts);
  return { deck };
}

async function vSimpleRegister(kind: "decisions" | "actions" | "kpis"): Promise<{ deck: Deck }> {
  const projects = await db.project.findMany({ select: { id: true, code: true } });
  const codeOf = (id: string | null) => (id ? projects.find((p) => p.id === id)?.code ?? "—" : "—");
  if (kind === "decisions") {
    const rows = await db.decision.findMany({ orderBy: { decisionDate: "desc" }, take: 200 });
    const deck = await deckFor({ deckTitle: "Decision Register", subtitle: rows.length + " decisions" });
    deck.table("Decisions", [
      { header: "Code", w: 0.85, get: (d) => d.code },
      { header: "Decision", w: 3, get: (d) => d.title },
      { header: "Project", w: 0.9, get: (d) => codeOf(d.projectId) },
      { header: "Owner", w: 1.15, get: (d) => d.decisionOwner ?? d.decidedBy ?? "—" },
      { header: "Priority", w: 0.8, get: (d) => d.priority, align: "center" },
      { header: "Status", w: 0.85, get: (d) => d.status, align: "center" },
      { header: "Required by", w: 1.05, get: (d) => fmtDate(d.requiredBy) },
    ], rows);
    return { deck };
  }
  if (kind === "actions") {
    const rows = await db.actionItem.findMany({ orderBy: { dueDate: "asc" }, take: 200 });
    const deck = await deckFor({ deckTitle: "Action Register", subtitle: rows.length + " actions" });
    deck.table("Actions", [
      { header: "Code", w: 0.85, get: (a) => a.code },
      { header: "Action", w: 3.1, get: (a) => a.title },
      { header: "Project", w: 0.9, get: (a) => codeOf(a.projectId) },
      { header: "Owner", w: 1.2, get: (a) => a.ownerName ?? "—" },
      { header: "Priority", w: 0.8, get: (a) => a.priority, align: "center" },
      { header: "Due", w: 0.9, get: (a) => fmtDate(a.dueDate) },
      { header: "Status", w: 0.9, get: (a) => a.status, align: "center" },
    ], rows);
    return { deck };
  }
  const rows = await db.projectKpi.findMany({ orderBy: { code: "asc" }, take: 200 });
  const deck = await deckFor({ deckTitle: "KPI Register", subtitle: rows.length + " KPIs" });
  deck.table("KPIs", [
    { header: "Code", w: 0.9, get: (k) => k.code },
    { header: "KPI", w: 2.7, get: (k) => k.name },
    { header: "Project", w: 0.9, get: (k) => codeOf(k.projectId) },
    { header: "Target", w: 0.85, get: (k) => num(k.targetValue, 1), align: "right" },
    { header: "Current", w: 0.85, get: (k) => num(k.currentValue, 1), align: "right" },
    { header: "Unit", w: 0.6, get: (k) => k.unit, align: "center" },
    { header: "Status", w: 0.95, get: (k) => k.status, align: "center" },
  ], rows);
  return { deck };
}

async function vDocs(): Promise<{ deck: Deck }> {
  const pages = await db.docPage.findMany({ orderBy: { updatedAt: "desc" }, take: 150 });
  const deck = await deckFor({ deckTitle: "Docs & Knowledge", subtitle: `${pages.length} pages across ${new Set(pages.map((p) => p.space)).size} spaces` });
  deck.table("Knowledge index", [
    { header: "Page", w: 2.6, get: (p) => `${p.icon ?? ""} ${p.title}`.trim() },
    { header: "Space", w: 1.1, get: (p) => p.space, align: "center" },
    { header: "Author", w: 1.1, get: (p) => p.authorName ?? "—" },
    { header: "Updated", w: 1, get: (p) => fmtDate(p.updatedAt) },
    { header: "Excerpt", w: 4.4, get: (p) => (p.content ?? "").replace(/[#*`>|]/g, "").slice(0, 120) },
  ], pages);
  return { deck };
}

async function vTechnology(): Promise<{ deck: Deck }> {
  const apps = await db.techApplication.findMany({ include: { _count: { select: { debts: true } } }, orderBy: { name: "asc" }, take: 200 });
  const deck = await deckFor({ deckTitle: "CTO Tower — Technology Portfolio", subtitle: `${apps.length} applications` });
  deck.table("Applications", [
    { header: "Application", w: 2.2, get: (a) => a.name },
    { header: "Category", w: 1.05, get: (a) => a.category, align: "center" },
    { header: "Criticality", w: 1.05, get: (a) => a.businessCriticality, align: "center" },
    { header: "Lifecycle", w: 0.9, get: (a) => a.lifecycleStatus, align: "center" },
    { header: "Health", w: 0.65, get: (a) => a.healthScore, align: "center" },
    { header: "Owner", w: 1.05, get: (a) => a.owner ?? "—" },
    { header: "Tech debt", w: 0.75, get: (a) => a._count.debts, align: "center" },
  ], apps);
  return { deck };
}

// ============================================================ Dispatcher

export interface BuiltDeck { buffer: Buffer; label: string; projectCode?: string }

export async function buildDeck(view: string, projectId?: string | null): Promise<BuiltDeck> {
  let out: { deck: Deck; projectCode?: string };
  switch (view) {
    case "executive-dashboard":
    case "leadership": {
      const r = view === "executive-dashboard" ? await vExecutive() : await vLeadership();
      out = { deck: r.deck };
      break;
    }
    case "portfolios": out = { deck: (await vPortfolios()).deck }; break;
    case "programs": out = { deck: (await vPrograms()).deck }; break;
    case "strategy": out = { deck: (await vStrategy()).deck }; break;
    case "projects": out = { deck: (await vProjects()).deck }; break;
    case "prioritization": out = { deck: (await vPrioritization()).deck }; break;
    case "investment": out = { deck: (await vInvestment()).deck }; break;
    case "project": out = await vProject(projectId as string); break;
    case "requirements": out = await vRequirements(projectId as string); break;
    case "wbs": out = await vWbs(projectId as string); break;
    case "tasks": out = await vTasks(projectId as string); break;
    case "gantt": out = await vGantt(projectId as string); break;
    case "milestones": out = await vMilestones(projectId as string); break;
    case "baselines": out = await vBaselines(projectId as string); break;
    case "project-financials": out = await vProjectFinancials(projectId as string); break;
    case "evm": out = await vEvm(projectId as string); break;
    case "health": out = await vHealth(projectId as string); break;
    case "raid": out = await vRaid(projectId as string); break;
    case "changes": out = await vChanges(projectId as string); break;
    case "gates": out = await vGates(projectId as string); break;
    case "agile": out = await vAgile(projectId as string); break;
    case "boards": out = await vBoards(projectId ?? null); break;
    case "workload": out = { deck: (await vWorkload()).deck }; break;
    case "resources": out = { deck: (await vResources()).deck }; break;
    case "timesheets": out = { deck: (await vTimesheets()).deck }; break;
    case "financials": out = { deck: (await vFinancials()).deck }; break;
    case "clients": out = { deck: (await vClients()).deck }; break;
    case "invoices": out = { deck: (await vClients()).deck }; break;
    case "expenses": out = { deck: (await vClients()).deck }; break;
    case "field": out = await vField(projectId as string); break;
    case "proofing": out = await vProofing(projectId ?? null); break;
    case "uat": out = await vRaid(projectId as string); break; // UAT rides the RAID workbook until its own view ships
    case "feedback": out = { deck: (await vFeedback()).deck }; break;
    case "roadmap": out = { deck: (await vRoadmap()).deck }; break;
    case "governance": out = { deck: (await vGovernance()).deck }; break;
    case "decisions": out = { deck: (await vSimpleRegister("decisions")).deck }; break;
    case "actions": out = { deck: (await vSimpleRegister("actions")).deck }; break;
    case "kpis": out = { deck: (await vSimpleRegister("kpis")).deck }; break;
    case "docs": out = { deck: (await vDocs()).deck }; break;
    case "technology": out = { deck: (await vTechnology()).deck }; break;
    case "analytics": out = { deck: (await vProjects()).deck }; break; // analytics = portfolio charts today
    default: throw new Error(`Unknown PPT view: ${view}`);
  }
  const buffer = await out.deck.buffer();
  return { buffer, label: view, projectCode: out.projectCode };
}
