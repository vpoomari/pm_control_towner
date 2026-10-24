# ULTIMATE MASTER PROMPT — PM CONTROL TOWER

> **Lineage (2026-09-23).** This is the authoritative build specification for PM Control Tower.
> The original "Ultimate Master Prompt" validated by `docs/ULTIMATE-PROMPT-VALIDATION.md`
> (2026-09-20) was never committed as a file; this document reconstructs and consolidates it
> from that validation report, the Command Center PRD, the master platform audit, the
> documentation suite, and the shipped v3.1.0 codebase. It is written as a single prompt:
> hand it to an AI builder (with no other context) and the platform described below is what
> must come out. Appendix A maps the validation report's §references onto this document.
> **Target state: PM Control Tower v3.1.0** — 115 data models · 168 API route files ·
> 24 engine modules · 40+ hash-routed views · 43 permissions × 8 roles · 177 report templates.

---

## §1 ROLE & MISSION

You are a senior enterprise platform team. Build **PM CONTROL TOWER (PMCT)** — a complete,
self-hosted enterprise Project, Program & Portfolio Management platform for corporate PMOs and
executive leadership, single-tenant, operations-light, deployable by one administrator.

The connected delivery model is the spine of the product:

**Strategy → Portfolio → Program → Project → WBS → Task → Dependency → Milestone → Resource →
Timesheet → Cost → EVM → Health → Governance → Benefits → Leadership Reporting**

The defining capability — never regress it: **leadership never needs to ask a project manager
for status.** The system continuously aggregates live operational data into decision-ready
views, an exception-first feed, traceable insights, and one-click executive reporting packs.
Every board-level number must trace back to computed operational data.

## §2 PRODUCT DEFINITION & PERSONAS

- **What it is:** one platform, one truth, no duplicated data. The same Project/Task core powers
  classical PPM *and* agile delivery *and* commercial operations *and* field operations *and*
  knowledge work — every module reads and writes the same rows.
- **Personas served (role → home experience):** Executive (portfolio oversight, executive tower),
  PMO Administrator (full administration), Portfolio Manager (selection & investment), Program
  Manager (program roll-ups), Project Manager (13-tab project workspace), Finance Controller
  (budget/cost/forecast), Team Member (inbox, timesheets, boards), Auditor (read-only trails),
  plus the CTO (Technology tower: applications, technologies, technical debt, releases).
- **Experience principle:** centralize truth, decentralize experience — role-aware home routing,
  persona towers, permission-filtered navigation.

## §3 THE CONSTITUTION (non-negotiable laws)

1. **Computed numbers only.** No hand-typed status colors, no invented percentages; every RAG,
   progress, and KPI is computed by an engine from source rows.
2. **Every mutation follows the pipeline:** validated (zod) → persisted → audited → engines
   recomputed → realtime event published.
3. **Engines are pure, deterministic, and unit-tested.** Same inputs, same outputs, no hidden I/O.
4. **AI drafts, humans approve.** AI never writes business data silently; every AI action is a
   draft in a human approval loop.
5. **Stale data is visible, never hidden.** Freshness tracking with honest staleness; insufficient
   data is shown GREY, never green.
6. **Seeded randomness.** All simulated/stochastic results (Monte Carlo) seed from persisted
   factors so runs are reproducible and auditable.
7. **No feature without seed data, docs, and cascade hooks.** A feature that ships without a
   reference dataset, documentation, and its recalculation hook is not done.
8. **Honest status discipline.** CONFIGURED ≠ CONNECTED everywhere (integrations, SSO, realtime).
   A connector flips to CONNECTED only after a successful live round-trip.
9. **No placeholder buttons, no mock APIs, no fabricated analytics.** Every control works; every
   number is real; an incomplete feature is hidden, not faked.

## §4 METHODOLOGY LAWS

- **One enterprise data model.** A single relational source of truth (one Prisma schema); all
  domains live in it; no side stores, no JSON dumps of business data.
- **One source of truth.** Kanban, Gantt, EVM, sprint boards, and reports read the same `Task`,
  `Project`, `Deliverable` rows — never copies.
- **Bi-directional traceability.** Strategy→Project *and* Task→Strategy without losing context
  (`Project.strategicObjectiveId` FK + portfolio strategy aggregation).
- **Exception-driven executive experience.** Executives see exceptions, not task lists; the
  leadership tower's feed is exception-first with traceable insights and a "nothing-missed"
  validation sweep.
- **Deterministic financial/schedule/resource math.** CPM, EVM, and finance are pure functions —
  auditable, testable, and recomputable from source rows at any time.
- **Server-side enforcement.** No frontend-only security: every API route runs the full
  `withApi` pipeline (§11) regardless of what the UI shows.
- **Audit everything.** Every mutation records user, timestamp, object, before/after JSON,
  action, IP and user agent (`AuditEvent`).
- **API-first.** All functionality is available through `/api/*`; the UI is a consumer of the
  same API the E2E validation exercises; no logic duplicated in the frontend.
- **Workflow engine.** Triggers/conditions/actions as data (`AutomationRule` +
  `GovernanceRule`), e.g. WHEN `health=RED` THEN alert → inbox → notify → health recalc, with an
  execution journal.
- **Command palette.** Global ⌘K palette: search projects/tasks + quick actions + keyboard
  shortcuts.

## §5 TECHNOLOGY STACK (pinned)

| Layer | Technology |
|---|---|
| UI | Next.js 16 App Router (standalone output; **single visible route `/`**), React 19, TypeScript 5, Tailwind CSS 4 + shadcn/ui (≈52 components), dnd-kit (drag & drop), Recharts, Lucide icons, react-markdown, framer-motion, sonner |
| App logic | Hash-based SPA router (`src/lib/router.ts`), typed `useApi` client hooks (TanStack Query), react-hook-form + zod, zustand |
| API | Next.js route files under `src/app/api/**` (168 files) |
| Data | Prisma ORM + SQLite single-file database (portable types so PostgreSQL is a `provider` change + push) |
| Realtime | Socket.IO 4 gateway as an independent mini-service (`mini-services/realtime`, Bun or tsx) |
| Security | JWT via jose (HS256, 12 h) + bcryptjs + RBAC catalog; TOTP MFA; SAML 2.0/OIDC SSO; SCIM |
| Export | pptxgenjs (server-side PowerPoint), CSV/JSON export, governed CSV import |
| Runtime | Node.js ≥ 20.9 standalone **or** Bun ≥ 1.2; multi-stage Dockerfile + docker-compose |

## §6 ARCHITECTURE & PROCESS TOPOLOGY

```
Browser ── HTTPS ──▶ reverse proxy (nginx/Caddy)
                        ├── /            ▶ Next standalone app :3000
                        └── /socket.io/  ▶ realtime gateway :3003 (JWT-verified)
app ──Prisma──▶ SQLite file      app ──POST /emit (shared secret)──▶ gateway
```

- The SPA loads once; all navigation is hash-based (`#/…`) — zero server round-trips for view
  changes; `src/views/registry.tsx` maps hash routes to lazy-loaded view modules.
- **Realtime is an enhancement, never a dependency of correctness.** Business writes publish
  events (fire-and-forget) to the gateway; subscribed clients refetch. If the gateway is down
  the data layer remains authoritative and sessions still refresh locally — system readiness
  reports realtime as "degraded", not broken.
- Production build: `next build` (standalone) copies static + public into the standalone dir;
  `PMCT_DIST_DIR` env may redirect the dist dir so certification builds never disturb a running
  instance. Health endpoints: `GET /api/system/health`, `GET /api/system/ready`.
- Docker Compose runs app + realtime gateway + persistent DB volume; first boot auto-creates
  the schema and loads the reference dataset on empty-database detection.

## §7 DATA MODEL — 115 PRISMA MODELS

Single `prisma/schema.prisma`, SQLite, indexed FKs. Migrations are **additive** (`prisma db push`);
never drop user data. Groups:

- **Identity & access:** User, Role, Permission, UserRole, RolePermission, IdentityProvider,
  ScimToken, MfaSecret, Session/UserAuth (jose JWT sessions)
- **Strategy:** StrategicObjective (weighted), ProjectObjective link, ProjectKpi
- **Portfolio:** Portfolio, Program, Project (owner, sponsor, phase, methodology, RAG health,
  budgets, strategicObjectiveId), PriorityCriterion, ProjectScore, PortfolioScenario,
  BusinessCase (cash-flow model, ROI/NPV/IRR/payback, best/base/worst)
- **Plan:** WBSNode (tree), Requirement (+acceptance criteria), Task (**unlimited nesting**;
  agile fields sprintId/epicId/storyPoints/backlogOrder), Dependency (FS/SS/FF/SF + lag),
  Milestone, Baseline (versioned), TaskEstimate
- **Agile:** Sprint (PLANNED/ACTIVE/COMPLETED, one active per project), Epic
- **Execute:** Resource, Assignment, Timesheet, TimesheetEntry, Approval, InboxItem, PlannerEntry
- **Control:** BudgetLine (CAPEX/OPEX classification), EvmPeriod, ProjectHealthSnapshot,
  ProjectForecast, Risk, Issue, Assumption, ActionItem, ChangeRequest, StageGate,
  GovernanceRule, AlertEvent, Decision, Deliverable
- **Integrity:** FreshnessMetric, EvidenceBundle, SimulationRun, CalibrationFactor, Scenario,
  ScheduleScenario, AiAction, AiMemory, AiKnowledge
- **Benefits:** BenefitProfile, BenefitActual, BenefitReview
- **Commercial:** Client, Invoice, InvoiceLine (server-computed totals), Expense, Vendor
- **Field ops:** Rfi, DailyLog, PunchListItem, QualityRecord
- **Strategy & knowledge:** FeedbackPost, FeedbackVote, RoadmapItem, DocPage, BoardThread,
  ProofRound, ProofAnnotation, Meeting, Comment (generic primitive), Stakeholder, Communication
- **Documents:** Document, DocumentVersion (versioning; gate evidence attaches documents)
- **UAT:** UatCycle, UatCase, UatExecution
- **Connect:** Integration, IntegrationCredential, IntegrationEvent, WebhookSubscription,
  WebhookDelivery, AIConnector, AIExecution, AutomationRule, AutomationExecution
- **Reporting:** ReportingTemplate, GeneratedReport, ReportSchedule, ReportSubscription,
  BoardPack, BoardPackPage, CustomReport, ReportSnapshot
- **Technology tower:** TechApplication, TechTechnology, TechnicalDebt, TechRelease
- **Admin metadata layer:** EntityDefinition, CustomFieldType, FieldDefinition, NamingConvention,
  Terminology, FeatureFlag, AdminSettings, SystemConfig, Template, TemplateVersion
- **Platform:** AuditEvent, Notification, IntakeSubmission, PriorityCriterion

## §8 THE 46 CAPABILITY DOMAINS

All 46 domains must exist and be demonstrable (model · route · view):

1 Strategy Management ✅ · 2 Goals/KPIs ✅ (OKR hierarchy is a documented exception E-5) ·
3 Portfolio ✅ · 4 Program ✅ · 5 Project ✅ · 6 WBS ✅ · 7 Task ✅ · 8 Schedule (CPM) ✅ ·
9 Gantt/Timeline ✅ · 10 Agile/Scrum ✅ · 11 Kanban ✅ · 12 Product Management ✅ ·
13 Requirements ✅ · 14 Test Management (UAT with gate hard-lock) ✅ · 15 Resource ✅ ·
16 Capacity Planning ✅ · 17 Timesheets ✅ · 18 Cost ✅ · 19 Financial ✅ (committed-cost POs
→ E-6) · 20 EVM ✅ · 21 Benefits ✅ · 22 Risk ✅ · 23 Issue ✅ · 24 Dependency ✅ · 25 RAID ✅ ·
26 Decision ✅ · 27 Change ✅ · 28 Governance ✅ · 29 Stage Gates ✅ · 30 Workflow Automation ✅ ·
31 Forms/Intake ✅ · 32 Document Management ✅ · 33 Knowledge ✅ · 34 Collaboration ✅ ·
35 Reporting (177 templates) ✅ · 36 Analytics ✅ · 37 Executive Control Tower ✅ ·
38 AI Intelligence ✅ · 39 Predictive Intelligence ✅ · 40 Scenario Planning ✅ ·
41 Integrations ✅ · 42 Enterprise Administration ✅ · 43 Security ✅ · 44 Audit ✅ ·
45 Data Governance ✅ · 46 Industry Extensions ✅ (construction field ops; other verticals
→ E-7).

## §9 NAVIGATION & VIEWS

Hash routes (lazy-loaded from `src/views/registry.tsx`) — all must exist:

- **Foundation:** `#/dashboard` (role-aware home), `#/login`
- **Portfolio:** `#/portfolios`, `#/programs`, `#/projects`, `#/projects/[id]` (13-tab
  ProjectWorkspace), `#/prioritization`, `#/investment`
- **Plan:** `#/register` (project register), `#/requirements`, `#/wbs`, `#/tasks`, `#/schedule`,
  `#/milestones`, `#/baselines`, `#/agile` (sprint board)
- **Execute:** `#/resources`, `#/timesheets`, `#/inbox`, `#/planner`, `#/boards` (Kanban /
  Calendar / Workload)
- **Control:** `#/financials`, `#/evm`, `#/health`, `#/raid`, `#/changes`, `#/gates`,
  `#/governance`, `#/integrity`, `#/technology`
- **Intelligence:** `#/reports` (report library), `#/reports/leadership` (Leadership Control
  Tower), `#/analytics`, `#/assistant` (AI), `#/reporting` (Reporting Center)
- **Connect:** `#/integrations`, `#/automations`, `#/notifications`, `#/webhooks`,
  `#/ai-gateway`, `#/extensions`
- **Command Center:** `#/clients`, `#/field`, `#/feedback` (portal + roadmap), `#/docs`,
  `#/boards-hub` (message boards), `#/proofing`
- **Admin:** `#/admin-center` (metadata config), `#/admin/users`, `#/admin/roles`,
  `#/admin/templates`, `#/admin/audit`, `#/admin/settings`

**Required view types across the app:** List, Table, Board/Kanban, Scrum sprint board, Gantt,
Timeline, Calendar, Workload heatmap, Capacity grid, Portfolio ranking, Program roll-up,
Roadmap, Backlog, Sprint, S-Curve, Financial, RAID, Intake form, Files/Documents, Activity,
Approval trails, Dependency register + Gantt arrows, Executive dashboard, Analytics, Scenario
planning, Strategy view, Risk register, plus Burndown/Burnup/CFD and Mind Map as documented
increments (E-3/E-4).

**UX standards:** exception-first feeds; RAG with **GREY honesty** (insufficient data never
shown green); keyboard-first with focus states; responsive; consistent `LoadingBlock`
skeletons; toasts via sonner; every list supports filters and CSV export.

## §10 COMPUTATION ENGINES (`src/lib/engines/`)

Pure, deterministic, unit-tested; results are **persisted** so EVM, health, governance and the
Leadership Tower read the same computed rows.

| Engine | Responsibility |
|---|---|
| `cpm.ts` | Critical Path Method: forward/backward pass → ES/EF/LS/LF, total/free float, critical flags, project finish |
| `rollup.ts` | Rescheduling roll-ups: task/WBS/dependency changes → project dates, progress, budget actualization |
| `evm.ts` | Earned Value: PV/EV/AC → CPI/SPI/EAC/ETC/VAC/TCPI + period snapshots |
| `health.ts` | Composite health score + RAG from schedule/cost/RAID/milestone signals; snapshot history |
| `governance.ts` | Threshold rules → alerts + inbox items + health recalculation |
| `timesheet.ts` | Submit → approve/reject → lock lifecycle with actuals cascade to tasks/projects/resources |
| `automations.ts` | Trigger/condition/action rules with execution journal |
| `leadership.ts` | Executive aggregation: control tower KPIs (RAG+GREY), exception-first feed, traceable insights, nothing-missed validation (16 checks), what-changed deltas, 30/60/90 outlook, 17 sub-reports, Leadership Pack versioning |
| `finance.ts` | ROI/NPV/IRR/payback from business-case cash flows |
| `prioritization.ts` | Weighted scoring + budget-constrained optimizer with executive scenarios |
| `montecarlo.ts` | Seeded P80 schedule/cost simulation |
| `calibration.ts` | Say/do calibration (promise vs delivery history) |
| `scenario.ts` | Scenario sandbox: branch, what-if, merge back |
| `freshness.ts` | Data freshness engine: per-entity staleness, honest staleness display |
| `evidence.ts` | Evidence bundles: SHA-256 tamper-evident chains, zip export |
| `benefits.ts` | Benefits realization tracking and reviews |
| `executive-portfolio.ts` | Portfolio-level executive aggregation (integrity score, anomalies) |
| `connectors.ts` | 27-connector catalog (Jira, Azure DevOps, ServiceNow, …) with CONFIGURED→CONNECTED discipline |
| `identity.ts` | SSO group→role mapping, SCIM transform, MFA enrollment logic |
| `metadata.ts` | Admin metadata layer: custom fields, naming conventions, terminology enforcement |
| `steering.ts` | AI-drafted steering packs (human-gated) |
| `pptx.ts` + `pptx-views.ts` | Universal PowerPoint export engine (pptxgenjs): 42 exportable views, intelligent data fitting, native-shape Gantt on a real date axis, vector charts |
| `zip.ts` | Zip packaging for exports/evidence |

## §11 API DESIGN RULES

- **Every route** goes through `withApi()` (`src/lib/api.ts`): **JWT auth → RBAC permission
  check → rate limit → zod body/query validation → handler → audit → realtime publish**.
  Structured JSON errors; no exceptions leak.
- Permissions match the §12 catalog (e.g. `project.manage`, `gate.decide`, `reports.view`);
  write 403s are tested for the least-privileged role (RBAC negative matrix).
- Domains (route prefixes): `/auth` (+`/auth/mfa`, `/auth/sso`), `/scim/v2`, `/admin`,
  `/portfolios`, `/programs`, `/projects`, `/portfolio/strategy`, `/portfolio/financial`,
  `/prioritization`, `/investment`, `/kpis`, `/requirements`, `/agile`, `/assignments`,
  `/capacity`, `/resources`, `/timesheets`, `/inbox`, `/planner`, `/financials`,
  `/financials/budget-lines`, `/evm`, `/health`, `/risks`, `/issues`, `/assumptions`,
  `/decisions`, `/changes`, `/gates`, `/governance` (+`/rules`, `/evaluate`), `/integrity/*`
  (freshness, evidence, simulate, calibration, scenarios, data-quality, ai-actions, approvals,
  benefits, config), `/intake`, `/documents`, `/deliverables`, `/uat`, `/clients`, `/invoices`,
  `/expenses`, `/rfis`, `/daily-logs`, `/punch-list`, `/feedback`, `/roadmap`, `/docs`,
  `/message-boards`, `/proofing`, `/meetings`, `/stakeholders`, `/notifications`, `/alerts`,
  `/automations`, `/webhooks`, `/integrations` (+`/sync`), `/assistant` (+`/memory`),
  `/reports` (+`/leadership`, `/executive`, `/analytics`, `/schedules`), `/reporting`
  (+`/boardpacks`, `/custom`, `/subs`), `/templates`, `/technology`, `/search`, `/export`
  (+`/ppt`, `/all-tabs`, `/[entity]`), `/import/[entity]`, `/system/health`, `/system/ready`.
- **Export/import:** CSV/JSON export for ~22 entities; governed CSV import (dry-run validation
  first) for ~13 master-data entities; `POST /api/export/ppt { view, projectId? }` (audited as
  EXPORT, 20/min rate limit).

## §12 RBAC — 43 PERMISSIONS × 8 ROLES

`src/lib/rbac.ts` is the single catalog, provisioned to DB at seed; runtime checks use the
session's resolved permission set (`hasPermission`: superadmin or `*` wildcard bypass).
`npm run sync:rbac` upserts the catalog into a live DB.

**Permissions (43):** executive.view, reports.view · portfolio.view/manage, program.view/manage,
project.view/manage · wbs.manage, schedule.manage, baseline.manage · resource.view/manage,
timesheet.own, timesheet.approve, inbox.use · financial.view/manage, evm.view/manage,
raid.manage, change.manage, gate.decide, governance.manage, integrity.view/manage,
scenario.manage, benefits.manage · agile.manage, client.manage, field.manage, product.manage,
docs.use, boards.use, proofing.manage · integration.view/manage, automation.manage, ai.use ·
admin.users, admin.templates, admin.audit, admin.config.

**Roles (level-ordered):** EXECUTIVE (100) · PMO_ADMIN (90, `*`) · PORTFOLIO_MANAGER (80) ·
PROGRAM_MANAGER (70) · PROJECT_MANAGER (60) · FINANCE (60) · AUDITOR (50, read-only) ·
TEAM_MEMBER (20, execute-only). Full role→permission matrix per `docs/07-RBAC-MATRIX.md`;
v3.0 permission codes are mapped into all 8 role templates.

## §13 SECURITY

JWT (jose HS256, 12 h) + bcryptjs password hashing · TOTP MFA per user with recovery codes and
enforce-by-role setting · SAML 2.0 + OIDC SSO (real Entra ID/Okta flows via jose; IdP
group→role mapping configurable; JIT provisioning; status stays CONFIGURED until a live
authentication succeeds) · SCIM RFC 7644 (`/scim/v2/Users`, Groups) with audit on every sync ·
brute-force lockout · session revocation · every admin action audited. See
`docs/10-SECURITY-GUIDE.md` for the hardening checklist.

## §14 THE INTEGRITY LAYER (the moat)

1. **Freshness engine** — per-entity freshness metrics with honest staleness; stale data is
   labeled, never hidden.
2. **Evidence bundles** — SHA-256 tamper-evident chains proving how each board number was
   computed; downloadable zip.
3. **Monte Carlo P80** — seeded simulation for schedule/cost forecasting (reproducible runs).
4. **Say/do calibration** — compares committed vs delivered dates per team/PM over time.
5. **Scenario sandbox** — branch the plan, what-if, merge back without touching production.
6. **Schedule scenarios** — saved what-if schedules (name + deltas + resulting finish) per
   project.
7. **AI steering packs** — AI-drafted, human-gated steering materials (`AiAction` lifecycle).
8. **Benefits realization** — profiles, actuals, reviews tied to projects.
9. **Anomaly detection** — statistical >2σ flags on cost burn rate vs portfolio mean (no fake AI).
10. **Data quality score + Portfolio Integrity Score** — composite of freshness + DQ +
    governance compliance as one board-level number.

## §15 AI GOVERNANCE

- Output classes: **FACT / CALCULATION / PREDICTION / RECOMMENDATION / DRAFT** — every AI output
  is labeled with which class it is; predictions must state data used, assumptions, confidence.
- Lifecycle: `AiAction` DRAFTED → EDITED → APPROVED/REJECTED. **Never auto-applied.**
- `AIExecution` logs prompt, scope, user; AI inherits the user's permissions, never more.
- Build rule (strict order): reliable data → reliable calculation → reliable reporting →
  reliable AI. No AI features before the data underneath them is governed.
- Assistant: `/api/assistant` + learning memory (`AiMemory`/`AiKnowledge`), draft-first writes.

## §16 REPORTING

Reporting Center with **177 report templates** (viewer + print/PDF), My Reports, Board Packs
(ordered multi-report packs), Scheduled reports, Subscriptions (email digests), History,
Administration, custom report builder. **Leadership Pack:** one-click, versioned, comparable
over time. Executive status reports, What-Changed deltas, analytics endpoints. All reports
consume persisted engine results — never recompute ad hoc in the view.

## §17 ADMIN CONTROL CENTER (metadata layer)

Metadata-driven configuration, **server-side enforced**: EntityDefinition + FieldDefinition
(custom fields with 14 base types), CustomFieldType, NamingConvention, Terminology dictionary,
FeatureFlag, AdminSettings (org settings incl. confidentiality footer used by PPT export), PMO
template library (Template/TemplateVersion). Custom fields validate and persist server-side;
terminology renames apply across the UI.

## §18 COMMAND CENTER MODULES (v3.0 — same core, no duplicated data)

- **Agile (`/agile`):** Sprints (goals, date windows, one active per project, server-recomputed
  committed points), Epics, story points (Fibonacci), backlog grooming with pull-into-sprint,
  drag-and-drop sprint board with optimistic moves.
- **Omni views (`/boards`):** Kanban (status lanes, drag & drop, cross-project), delivery
  Calendar (tasks + meetings), Workload heatmap (resource × week, over-allocation in red).
- **Product strategy (`/feedback`):** feedback portal, one-vote-per-user toggling, triage
  workflow (NEW → UNDER_REVIEW → PLANNED → IN_PROGRESS → SHIPPED/DECLINED), quarter roadmap
  with demand linking.
- **Knowledge (`/docs`, `#/boards-hub`):** six-space markdown docs workspace with search and
  edit/preview; message boards (pinned announcements, standups, Q&A threads) on the generic
  Comment primitive.
- **Commercial (`/clients`):** client register with revenue roll-ups, invoices with line items
  (server-computed subtotal/tax/total, DRAFT→SENT→PAID, paid locked, milestone/task-linked),
  expenses with approval workflow (PENDING→APPROVED/REJECTED→REIMBURSED, billable, categories).
- **Field ops (`/field`):** RFIs with aging discipline (unanswered >7d flagged, cost/schedule
  impact), daily construction logs (weather/crew/work/delays/safety), punch list
  OPEN→IN_PROGRESS→CLOSED→VERIFIED, BIM viewer embed.
- **Proofing (`/proofing`):** versioned proof rounds per deliverable, threaded annotations with
  page/timecode locators and resolve toggling, APPROVED / CHANGES_REQUESTED with reopen.
- **UAT + gates:** UAT cycles/cases/executions with **hard gate lock** — a Go-Live gate cannot
  pass while critical UAT cases are unresolved (enforced server-side in the gate decision path).

## §19 UNIVERSAL POWERPOINT EXPORT (v3.1)

- Standardized **Export-PPT** button in the app shell topbar; maps the current hash route (+
  current project context) to one of **42 exportable views** (executive/leadership towers,
  portfolio/program/project suites, strategy, prioritization, investment, agile, boards, field
  ops, proofing, clients, resources, governance, analytics, …).
- One server-side engine (`src/lib/engines/pptx.ts` + `pptx-views.ts`, registry
  `src/lib/pptx/registry.ts`, pptxgenjs, `serverExternalPackages`-isolated) used by both the web
  app and the desktop wrapper — identical output.
- Intelligent data fitting: fixed row budgets per slide, repeated headers, per-column character
  budgets (never wraps/overlaps); Gantt rendered as native shapes on a real month/date axis with
  today marker, critical path, progress fills, milestone diamonds, split parts sharing one axis;
  charts as native PPT vector charts (doughnut/bar/line).
- Project alignment: cover slide with project metadata (status/phase, health RAG, budget vs
  actual vs forecast, dates, strategic objective), project line in every slide header,
  confidentiality footer from Admin Settings, automatic slide numbers.
- API: `POST /api/export/ppt { view, projectId? }` — audited (EXPORT), rate-limited 20/min.

## §20 REALTIME

Socket.IO 4 gateway (independent mini-service, own package lock, JWT-verified sockets), app
publishes via `POST /emit` with a shared `REALTIME_SECRET`; event taxonomy per domain
(`agile:changed`, `field:changed`, health, inbox, …). Clients refetch on events. Graceful
degradation is mandatory (§6).

## §21 REFERENCE DATA & SEEDING

- `npm run db:seed` — reference enterprise dataset (top organization, 15 users across all 8
  roles, portfolios/programs/projects, 600+ tasks, timesheets, financials, EVM history, RAID,
  gates, KPIs) + leadership dataset. Idempotent; empty-DB auto-seed on first boot.
- `npm run seed:command-center` — demo data for v3.0 modules (idempotent).
- `npm run seed:strategy` — 4 weighted `StrategicObjective` rows + 7 aligned projects (makes
  Strategy→Project traceability demonstrable).
- `npm run sync:rbac` — permission/role upsert into a live DB.
- All randomness is **seeded** (deterministic datasets, reproducible simulations).
- Logins and customization documented in `docs/08-REFERENCE-DATA-GUIDE.md`; demo passwords must
  be changeable from Admin → Users.

## §22 TESTING & VALIDATION

- **Engine unit tests** (`tests/engines/*.test.ts`, `npm test`) — every pure engine covered;
  50+ tests green is the floor.
- **Golden-path E2E** — `scripts/validate-golden-path.mjs` runs the 20-step acceptance (§23)
  against a running server; it must pass 20/20 at any time.
- **RBAC negative matrix** — least-privileged role gets 403 on every manage route.
- **Production certification** — isolated `next build` (PMCT_DIST_DIR), standalone boot,
  `/api/system/ready` 200, authenticated smoke across endpoint families, zero runtime errors.
- **GUI passes** — screenshot round over all views (`gui-test-screenshots/`).
- Prisma validate/push clean; `tsc` clean for all new code.

## §23 GOLDEN PATH ACCEPTANCE (must execute 20/20 live, over seeded data)

```
01 Strategy → Objectives          weighted objectives; aligned investment computed
02 Portfolio                      portfolio exists with computed health
03 Program in portfolio           program nested under portfolio
04 Project in program             ACTIVE project with computed progress %
05 Project → Strategy traceability  strategicObjectiveId linked and aggregated
06 WBS tree                       nested tree with flat count > 0
07 Task under WBS                 task linked to WBS node
08 Resource assigned              resource with allocation %
09 CPM schedule computed          critical tasks + floats computed
10 Timesheets present             sheets with lifecycle status
11 Financial roll-up              budget / actual / forecast aggregated from source rows
12 EVM deterministic              CPI/SPI/EAC recomputed from persisted periods
13 Risk register                  project risks present
14 Issue register                 project issues present
15 Dependency map                 dependencies with typed links (FS/SS/FF/SF)
16 Decision register              decisions recorded
17 Approval trail                 approved/locked timesheets + decided gates
18 Benefits realization           benefit profiles API live
19 KPIs                           project KPIs present
20 Executive Control Tower        exception-driven feed + traceable insights
```

## §24 PERFORMANCE TARGETS

Interactive 1,000-task Gantt ≤ 2 s · API p95 < 300 ms on reference data · realtime fan-out
< 1 s · datasets designed to scale to 250k+ tasks (k6/Lighthouse baselines and load execution
are a documented Phase-12 exception, E-2 — state them honestly, never claim unmeasured numbers).

## §25 DOCUMENTATION (ship with the platform)

14-guide docs suite: 01 Deployment · 02 Admin · 03 User · 04 Architecture · 05 API Reference ·
06 Data Model · 07 RBAC Matrix · 08 Reference Data · 09 Operations Runbook · 10 Security ·
11 Integrity & Trust · 12 Master Platform Audit · 13 Master Prompt (this lineage) ·
Command-Center PRD + Test Plan. Every release: CHANGELOG entry, VERSION bump, README capability
map refresh, docs regeneration, tagged backup.

## §26 BUILD ORDER (follow it; priorities never override architectural dependencies)

1. Foundation: schema + auth + RBAC + withApi + audit + SPA shell + login + dashboard
2. Core work: portfolios → programs → projects → WBS → tasks → dependencies → CPM schedule →
   Gantt → baselines → milestones → requirements
3. Governance: health engine → RAID → changes → gates → governance rules → decisions
4. Resource & financial: resources → assignments → timesheets (cascade) → budget lines →
   finance/EVM → investment/business case
5. Integrations: connector catalog → integration hub → webhooks → automations
6. Analytics & reporting: Reporting Center (templates → board packs → schedules →
   subscriptions) → analytics
7. Intelligence: leadership tower → executive portfolio → integrity layer (freshness,
   evidence, Monte Carlo, calibration, scenarios, benefits)
8. AI: assistant → AI gateway → AiAction draft-first → steering packs
9. Identity depth: SSO (SAML/OIDC) → SCIM → MFA → admin role separation
10. Industry & delivery depth: UAT + documents + field ops
11. Command Center: agile → omni views → product strategy → docs & boards → clients & billing
    → proofing
12. UX polish + universal PPT export + admin metadata layer + accessibility + docs

## §27 DEFINITION OF DONE (every feature)

Schema (+ indexes/FKs, additive) · engine (pure + tested) · API (withApi pipeline, audited,
permission-coded) · view (loading/empty/error states, filters, export) · seed data · cascade
hook (downstream recalc) · realtime event where meaningful · docs updated · CHANGELOG entry ·
tests green · no console errors.

## §28 CERTIFICATION STATE (honest, carry it forward)

Certification matrix: **30 PASS / 4 PARTIAL / 0 FAIL.** Exceptions register (each with owner,
phase, priority, remediation — never silently dropped):

| ID | Exception | Target |
|---|---|---|
| E-1 | Multi-tenancy not implemented (single-tenant enterprise instance; add Tenant domain + tenantId scoping for SaaS resale) | Phase 7 (P2) |
| E-2 | Load/scale execution (k6/Lighthouse, 250k+ task datasets) not run | Phase 12 (P5) |
| E-3 | Mind Map view pending | Phase 12 (P5) |
| E-4 | Burndown/Burnup/CFD charts + velocity/cycle-time metrics pending (compute from Task sprint history — no schema change) | Phase 6 increment (P2) |
| E-5 | OKR key-result hierarchy not modeled (add `KeyResult`) | Phase 6/10 |
| E-6 | Committed cost from open POs/contracts not modeled (add `Contract`/`PurchaseOrder`) | Phase 5 increment (P2) |
| E-7 | Industry extensions beyond construction not started (per-industry templates on the metadata layer) | Phase 11 (P4) |
| E-8 | Formal accessibility audit (axe/WCAG 2.1 AA report) not executed | Phase 12 (P5) |
| E-9 | Dev/test/UAT/prod environment promotion is deployment-specific | Phase 7 (P2) |

## §29 FINAL ACCEPTANCE

The build is done when:

1. A new user authenticates via SSO and is SCIM-provisioned with mapped permissions, zero local
   password.
2. A connector activated with real credentials flips CONFIGURED → CONNECTED only after a
   successful live round-trip; sync runs are audited item-level.
3. A Go-Live gate is provably blocked by unresolved critical UAT cases.
4. The CFO sees Budget / Committed / Actual / Forecast per project and portfolio.
5. Every board-level number traces to computed operational data with the Integrity Layer's
   evidence chain intact.
6. The golden path executes 20/20 live; engines are 100% unit-green; production build boots and
   smokes clean; the certification matrix and exceptions register are published with the
   release.

---

## APPENDIX A — Cross-reference to `docs/ULTIMATE-PROMPT-VALIDATION.md`

The validation report references the original prompt's §numbers. Map to this document:

| Validation ref | Topic | This document |
|---|---|---|
| §2–§4 | Methodology | §4 |
| §6 | 46 domains | §8 |
| §8 | Required views | §9 |
| §10 | Strategy/OKR | §7, §8, E-5 |
| §14 | Agile | §18 |
| §19 | Financial | §7, §10 (`finance.ts`), E-6 |
| §24 | Workflow engine | §4, §7 (AutomationRule) |
| §29 | 150–200 report templates | §16 (177) |
| §30–§33 | Exception-first tower, AI classes | §4, §15 |
| §36 | Server-side enforcement / tenancy | §4, §11, E-1 |
| §37 | Audit | §3.2, §4, §7 (AuditEvent) |
| §39 | API-first | §11 |
| §40 | Data architecture | §7 |
| §44–§46 | Performance/scale | §24, E-2 |
| §48 | Accessibility | §9, E-8 |
| §50–§52 | Phase/priority model | §26 |
| §55–§57 | Gates, exit criteria, lifecycle | §27 |
| §59 | Acceptance | §29 |
| §60 (rules 1–18) | Constitution | §3, §4 |
| §65 | Command palette | §4 |
| §67 | Exception-first feed | §4, §10 (`leadership.ts`) |
| §73 | Environment separation | E-9 |
| §75 | Golden path | §23 |
| §79 | Exceptions register | §28 |
| §80 | Build order | §26 |
| §81 | AI build rule | §15 |
| §83 | Definition of done | §27 |
| §85 | No fake AI / shallow features | §3.9, §15 |
| §87 | Certification matrix | §28 |
