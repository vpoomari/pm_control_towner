# 03 — User Guide

Audience: every persona — executives, PMO, portfolio/program/project managers,
finance, teams. The UI is a single-page workspace with hash navigation
(`#/dashboard`, `#/projects/<code>/schedule`, …), a global search (⌘K), quick-create
actions and live realtime refresh.

Screens adapt to your role: what you cannot act on is hidden, and the server
enforces the same rules.

---

## 1. Dashboard

The landing view after login: portfolio health donut (RAG + GREY), active projects,
investment vs budget, my inbox, my timesheet status, upcoming milestones, critical
alerts and capacity pressure. Every card is a drill-down into the underlying module.
For executives, an **Executive Control Tower** entry button opens the leadership
workspace directly.

## 2. Portfolio (`#/portfolios`, `#/programs`, `#/projects`)

- **Portfolios** group investments with strategic objectives, budget targets and
  roll-up health. **Programs** sit inside portfolios and carry their own budgets.
- **Projects register**: filter by business unit/health/status/owner; open any
  project to enter its **workspace** (below).
- Project fields worth knowing: sponsor, manager, phase, methodology, risk level,
  baseline vs current budget, planned/actual hours, progress, health (RAG + score).

## 3. Project workspace (`#/projects/<code>`)

Thirteen tabs, one source of truth per project:

| Tab | What you do there |
|---|---|
| Overview | Charter, objectives, success criteria, key facts, health summary |
| Scope | Requirements with acceptance criteria → linked to WBS |
| WBS | Tree editor (work packages, owners, planned cost/hours) |
| Tasks | Task register per WBS node, assignees, priorities, criticality |
| Schedule | **CPM view**: dependencies (FS/SS/FF/SF + lag), computed ES/EF/LS/LF, float, critical path, baseline vs current dates |
| Milestones | Due/baseline dates, critical flags, gate linkage |
| Baselines | Create/activate versioned baselines; compare current schedule vs baseline |
| Financials | Budget lines (baseline/current/actual/forecast), spend tracking |
| EVM | Period snapshots: PV/EV/AC → CPI, SPI, EAC, ETC, VAC, TCPI with trend charts |
| RAID | Risks, issues, assumptions with scores, owners, mitigation, escalation |
| Changes | Change requests with cost/schedule/risk impact and decision trail |
| Gates | Stage gates with criteria, evidence and approve/hold decisions |
| Health | Health score history + snapshot detail |

The engines work for you: saving tasks/dependencies recalculates the schedule
(CPM), timesheet approvals roll up actuals, EVM/health/governance recompute from
live data.

## 4. Plan module (cross-project views)

`#/register` (all projects), `#/requirements`, `#/wbs`, `#/tasks`, `#/schedule`
(Gantt with critical path), `#/milestones`, `#/baselines` — multi-project planning
views with the same editor components and Import/Export support.

## 4b. Agile Delivery (`#/agile`) — v3.0

For software and hybrid projects that work in iterations — the same tasks the Gantt
and EVM modules govern, no separate backlog silo:

- **Sprints**: create sprints with a goal and date window (one ACTIVE sprint per
  project). The sprint strip shows task counts, burned points and progress per
  sprint; deleting a sprint returns its cards to the backlog (nothing is lost).
- **Sprint board**: drag task cards across Not Started → In Progress → Completed /
  Blocked. Committed story points update automatically; completing a card sets
  progress to 100%.
- **Backlog tab**: cards without a sprint, with a Fibonacci story-point picker
  (0/1/2/3/5/8/13/21) and a pull-into-sprint selector for grooming.
- **Epics**: color-coded business themes; each epic shows its done/total task count.

Who can do what: every role with project access can view boards and move cards;
managing sprints/epics/story-point assignments requires the `agile.manage`
permission (PM/Program/Portfolio roles and above).

## 4c. Boards — Kanban · Calendar · Workload (`#/boards`) — v3.0

Three representations of the same work, switched by tabs:

- **Kanban**: status-lane board across the selected project (or all projects when
  no project is picked). Drag cards between lanes; a filter box narrows cards by
  code or name.
- **Calendar**: month grid of task due dates (color-coded by status) plus
  meetings; navigate months, jump back with "Today".
- **Workload**: resource × week heatmap of allocated hours vs capacity — amber
  near capacity, red when over-allocated, with average utilization per person and
  a 4–26 week window selector.

## 4d. Strategy & Knowledge — v3.0

- **Feedback & Roadmap** (`#/feedback`): submit feedback (BUG/FEATURE/IDEA/
  INTEGRATION/UX), vote with one click (one vote per user, toggled), and triage
  posts through the lifecycle chips. The **Roadmap** tab lays items out in quarter
  lanes with progress bars, release tags, and the count of linked feedback posts
  (demand signal) per item.
- **Docs & Knowledge** (`#/docs`): docs-first workspace — pages organized into
  spaces (General, Engineering, Construction, Finance, Product, Governance),
  markdown authoring with live preview (tables and checklists render), full-text
  search over titles and content.
- **Message Boards** (`#/boards-hub`): project-anchored discussions distinct from
  task comments — categories for Announcements, Standup, Q&A, Risks and Wins;
  pin the threads that matter; replies post inline (Enter to send).

## 4e. Proofing & Approvals (`#/proofing`) — v3.0

Structured review for deliverables (video, PDF, design):

1. Open a **proof round** on a deliverable (round number auto-increments, version
   label + reviewer + due date).
2. Reviewers add **annotations** — each note carries a locator (page number or
   timecode) and can be resolved after rework.
3. Record the decision: **Approve** or **Changes Requested** (rounds can be
   reopened). The stat cards give the review pipeline at a glance.

## 5. Execute

- **Resources** (`#/resources`): register (skills, rates, capacity), capacity view
  with over/under-allocation, assignments.
- **Timesheets** (`#/timesheets`): weekly grid (activity, hours, start/end), submit
  week → approver queue (program managers) → approve/reject with reason → lock.
  Approved hours flow into project actuals automatically.
- **Inbox** (`#/inbox`): personal action queue (approvals, alerts, escalations,
  leadership actions) with links to the source records.
- **Planner** (`#/planner`): personal focus planner (day grid, planned vs actual).

## 6. Control (cross-project)

`#/financials` (portfolio budget/actual/forecast), `#/evm` (portfolio EVM with
CPI/SPI scatter and trends), `#/health` (health snapshots & trend board),
`#/raid` (cross-project risks/issues/assumptions), `#/changes`, `#/gates`,
`#/governance` (rules + alert backlog; see Admin Guide § 4).

## 6b. Clients & Billing (`#/clients`) — v3.0

The commercial register for client-facing and billable work:

- **Clients**: contact details, status (PROSPECT / ACTIVE / ON_HOLD / CHURNED)
  and per-client revenue roll-ups (invoiced / paid / outstanding) with project
  and invoice counts.
- **Invoices**: build invoices with line items (quantity × unit price, optional
  tax %) — totals are computed server-side and invoices can reference the project
  (and tasks) they bill against. Lifecycle: Draft → Send → Mark Paid; paid
  invoices are locked (void first to reopen). The stat row tracks invoiced,
  outstanding and overdue.
- **Expenses**: log costs per project (category, vendor, billable flag) and run
  the approval queue (Approve / Reject / Reimbursed — approver name stamped
  server-side).

Who can do what: viewing requires `financial.view`; creating clients/invoices and
approving expenses requires `client.manage` (Finance and PMO roles).

## 6c. Field Operations (`#/field`) — v3.0

Construction field-to-office loop for capital projects:

- **RFIs**: raise requests for information (discipline + priority routing);
  the register shows age with a red flag past 7 days unanswered, cost and
  schedule impact totals, and an inline **Answer** action that stamps the reply
  and date.
- **Daily logs**: the site diary — date, weather, crew count, work performed,
  delays, safety incidents. Crew counts drive labor actuals; delays feed
  change-control evidence.
- **Punch list**: closeout quality items with the OPEN → IN_PROGRESS → CLOSED →
  VERIFIED chain (verify is the final acceptance step).
- **BIM viewer**: paste an embeddable model URL (e.g. Autodesk Construction Cloud)
  and the model renders inline for field-to-office coordination.

## 7. Intelligence — Reports & the Executive Control Tower

**Reports** (`#/reports`): report library with CSV/JSON export across entities.

**Leadership Control Tower** (`#/reports/leadership`) — the flagship. Twenty tabs in
four groups; everything is computed from live operational data, never hand-typed:

- **Control Tower**: portfolio KPIs with RAG **and GREY (insufficient data — never
  shows green when data is missing)**, answer cards ("Are we within budget?"),
  exception-first feed (CRITICAL → decisions needed now → at risk → overdue → due
  soon → changes), traceable auto-insights (each sentence links to its source
  entity; missing facts are stated as *INSUFFICIENT DATA*), nothing-missed
  validation grid, 30/60/90-day outlook.
- **Portfolio**: one row per project — PM/business owner, health, progress, status,
  pending decisions, next milestone, forecast finish, last update — with drill-through
  to a per-project **Executive Status Report** (exec summary, 7-dimension health,
  planned vs actual vs variance, leadership actions with WHAT/WHO/BY-WHEN/
  IF-NO-DECISION) and print/PDF support.
- **Sub-reports**: What-Changed (vs last snapshot), Risks, Issues, Milestones,
  Financials (forecast trend vs previous report), Resources, Schedule, Dependencies
  (cross-project blocking + downstream impact), Decisions (raise → record lifecycle),
  Scope, Actions (central register), Deliverables, Quality, KPIs (targets vs actuals).
- **Meeting Mode**: nine numbered sections for steering meetings (dark projection
  view).
- **History & Schedules**: versioned Leadership Pack snapshots with headline
  comparison v(n-1)→v(n), scheduled report runs (daily/weekly/monthly) with
  in-app distribution to recipients.

**Generate Leadership Pack** button: creates the full executive pack as an audited,
versioned snapshot (and auto-escalates overdue decisions into critical actions).

## 8. Intelligence — Analytics & Assistant

`#/analytics`: trend dashboards. `#/assistant`: AI PM assistant (uses the configured
AI connector; data scope is logged with each execution). If the AI provider is not
configured/reachable, the rest of the platform is unaffected.

## 9. Connect & Admin

Automations, integrations, webhooks, notifications center, AI gateway, and the Admin
screens (users/roles/templates/audit) — see the Admin Guide.

---

## 10. Universal PowerPoint export (v3.1)

The **Export PPT button** in the topbar (next to the PDF button) exports the module you
are looking at as a presentation-ready 16:9 deck — no screenshots, no manual adjustment:

- **What you get**: a cover slide with project metadata (status, phase, health RAG,
  budget vs actual vs forecast, dates, strategic objective), section dividers, KPI
  cards, native editable PPT charts (health distribution, EVM trend, budget vs actual),
  cleanly paginated data tables (headers repeated on every part, fixed row budgets —
  nothing overflows), and a **multi-slide Gantt** on a real date axis with month
  gridlines, today marker, critical path, progress fills and milestone diamonds.
- **Where it works**: every major module — executive and leadership towers, portfolio/
  program/project registers, the full project report (18+ slides), planning views,
  agile, boards, financials, clients & billing, resources/workload, field operations,
  proofing, governance, registers, feedback and roadmap. Views needing a project use
  the project selected in the header.
- **Web and desktop are identical**: the deck is generated server-side by the same
  engine behind `POST /api/export/ppt`, so the browser dashboard and the Windows
  application produce the same file for the same data.
- Permissions: `reports.view` or `project.view`; exports are audited (EXPORT) and
  rate-limited to 20 per minute.

---

## 11. Daily habits that make the tower work

1. Teams file timesheets weekly (approvals drive actuals → EVM → health).
2. PMs keep RAID + decisions current (the tower reads them — gaps show as GREY).
3. PMO evaluates governance rules periodically (or after major changes).
4. Executives read the Control Tower, act on the exception feed, and generate a
   Leadership Pack before each steering meeting (History keeps the week-over-week
   comparison).
