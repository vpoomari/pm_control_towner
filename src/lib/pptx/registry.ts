// PM CONTROL TOWER — PPT export registry (client-safe: no server imports).
// Maps hash routes to exportable views; the shell uses matchPptView() to power
// the universal "Export PPT" button, and the API validates the requested view
// against the same registry — one source of truth on both sides.

export interface PptViewDef {
  key: string;
  label: string;
  /** View is rendered per-project; the shell sends the stored project id. */
  projectScoped?: boolean;
}

export const PPT_VIEWS: Record<string, PptViewDef> = {
  "executive-dashboard": { key: "executive-dashboard", label: "Executive Control Tower" },
  leadership: { key: "leadership", label: "Leadership Control Tower" },
  portfolios: { key: "portfolios", label: "Portfolio Register" },
  programs: { key: "programs", label: "Program Register" },
  projects: { key: "projects", label: "Projects Register" },
  strategy: { key: "strategy", label: "Strategic Objectives" },
  prioritization: { key: "prioritization", label: "Prioritization & Selection" },
  investment: { key: "investment", label: "Investment & Business Cases" },
  // project-scoped
  project: { key: "project", label: "Project Report (full deck)", projectScoped: true },
  requirements: { key: "requirements", label: "Requirements", projectScoped: true },
  wbs: { key: "wbs", label: "WBS", projectScoped: true },
  tasks: { key: "tasks", label: "Task Register", projectScoped: true },
  gantt: { key: "gantt", label: "Schedule (Gantt)", projectScoped: true },
  milestones: { key: "milestones", label: "Milestones", projectScoped: true },
  baselines: { key: "baselines", label: "Baselines", projectScoped: true },
  "project-financials": { key: "project-financials", label: "Project Financials", projectScoped: true },
  evm: { key: "evm", label: "Earned Value (EVM)", projectScoped: true },
  health: { key: "health", label: "Health & Trend", projectScoped: true },
  raid: { key: "raid", label: "RAID", projectScoped: true },
  changes: { key: "changes", label: "Change Requests", projectScoped: true },
  gates: { key: "gates", label: "Stage Gates", projectScoped: true },
  agile: { key: "agile", label: "Agile Delivery (sprints/backlog)", projectScoped: true },
  boards: { key: "boards", label: "Boards (Kanban / Calendar / Workload)", projectScoped: true },
  field: { key: "field", label: "Field Operations (RFI / logs / punch)", projectScoped: true },
  proofing: { key: "proofing", label: "Proofing & Approvals", projectScoped: true },
  uat: { key: "uat", label: "UAT Cycles", projectScoped: true },
  // cross-project
  financials: { key: "financials", label: "Portfolio Financials" },
  clients: { key: "clients", label: "Clients & Billing" },
  invoices: { key: "invoices", label: "Invoices" },
  expenses: { key: "expenses", label: "Expenses" },
  resources: { key: "resources", label: "Resources & Capacity" },
  workload: { key: "workload", label: "Resource Workload" },
  timesheets: { key: "timesheets", label: "Timesheets" },
  governance: { key: "governance", label: "Governance & Alerts" },
  decisions: { key: "decisions", label: "Decision Register" },
  actions: { key: "actions", label: "Action Register" },
  kpis: { key: "kpis", label: "KPI Register" },
  feedback: { key: "feedback", label: "Feedback & Voting" },
  roadmap: { key: "roadmap", label: "Delivery Roadmap" },
  docs: { key: "docs", label: "Docs Index" },
  technology: { key: "technology", label: "CTO Tower" },
  analytics: { key: "analytics", label: "Analytics" },
};

/** Ordered most-specific-first: match by longest prefix against the hash route. */
const ROUTE_MAP: { prefix: string; view: string }[] = [
  { prefix: "/projects", view: "project" },        // project workspace (has an id segment)
  { prefix: "/reports/leadership", view: "leadership" },
  { prefix: "/reports", view: "reports-redirect" },// handled below (falls back to analytics)
  { prefix: "/reporting", view: "analytics" },
  { prefix: "/analytics", view: "analytics" },
  { prefix: "/dashboard", view: "executive-dashboard" },
  { prefix: "/portfolios", view: "portfolios" },
  { prefix: "/programs", view: "programs" },
  { prefix: "/register", view: "projects" },
  { prefix: "/requirements", view: "requirements" },
  { prefix: "/wbs", view: "wbs" },
  { prefix: "/tasks", view: "tasks" },
  { prefix: "/agile", view: "agile" },
  { prefix: "/schedule", view: "gantt" },
  { prefix: "/milestones", view: "milestones" },
  { prefix: "/baselines", view: "baselines" },
  { prefix: "/boards-hub", view: "docs" },
  { prefix: "/boards", view: "boards" },
  { prefix: "/resources", view: "resources" },
  { prefix: "/timesheets", view: "timesheets" },
  { prefix: "/financials", view: "financials" },
  { prefix: "/clients", view: "clients" },
  { prefix: "/field", view: "field" },
  { prefix: "/investment", view: "investment" },
  { prefix: "/evm", view: "evm" },
  { prefix: "/health", view: "health" },
  { prefix: "/raid", view: "raid" },
  { prefix: "/changes", view: "changes" },
  { prefix: "/gates", view: "gates" },
  { prefix: "/governance", view: "governance" },
  { prefix: "/prioritization", view: "prioritization" },
  { prefix: "/feedback", view: "feedback" },
  { prefix: "/docs", view: "docs" },
  { prefix: "/proofing", view: "proofing" },
];

/** Resolve the exportable view for a hash route ("" or "/" → executive dashboard). */
export function matchPptView(path: string): { view: PptViewDef; projectIdFromRoute?: string } | null {
  const clean = (path || "/").split("?")[0].replace(/\/+$/, "") || "/";
  if (clean === "/" || clean === "") {
    return { view: PPT_VIEWS["executive-dashboard"] };
  }
  // project workspace: /projects/<id>
  const segs = clean.split("/").filter(Boolean);
  if (segs[0] === "projects" && segs[1]) {
    return { view: PPT_VIEWS.project, projectIdFromRoute: segs[1] };
  }
  // longest prefix wins
  const hit = ROUTE_MAP.filter((r) => clean === r.prefix || clean.startsWith(r.prefix + "/"))
    .sort((a, b) => b.prefix.length - a.prefix.length)[0];
  if (!hit) return null;
  if (hit.view === "reports-redirect") return { view: PPT_VIEWS.analytics };
  return { view: PPT_VIEWS[hit.view] ?? null };
}
