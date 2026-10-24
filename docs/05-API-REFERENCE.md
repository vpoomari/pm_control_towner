# 05 — API Reference

Base URL: `https://<host>/api` · All routes are JSON in/out.

## Conventions

- **Authentication**: `Authorization: Bearer <JWT>` (12 h) or the `pmct_token`
  cookie issued at login. Unauthenticated calls → `401 {"success":false,"error":"Authentication required"}`.
- **Envelope**: success `{ "success": true, "data": … }`; failure
  `{ "success": false, "error": "human message" }` with appropriate 4xx/5xx.
- **Authorization**: every route checks RBAC permission codes server-side
  (see `docs/07-RBAC-MATRIX.md`); insufficient grants → `403`.
- **Rate limiting** applies per session; bulk imports are capped (2000 rows).
- **Audit**: mutating calls write `AuditEvent` rows automatically.
- **Realtime**: mutations emit Socket.IO events (`project:updated`, `raid:changed`,
  `data:imported`, `report:generated`, …) consumed by open UI sessions.

---

## Authentication & system

| Method & path | Purpose |
|---|---|
| `POST /api/auth/login` | Email + password → `{data.token}` + sets cookie |
| `POST /api/auth/logout` | Clear session cookie |
| `GET /api/auth/me` | Current session user with roles + permission codes |
| `GET /api/system/ready` | Public readiness probe (db counts + realtime reachability) |
| `GET /api/system/health` | Authenticated deep health |
| `GET /api/health` | Authenticated basic health |
| `GET /api/search?q=` | Global search across entities |

## Portfolio domain

| Route | Methods | Purpose |
|---|---|---|
| `/api/portfolios`, `/api/portfolios/[id]` | GET, POST / GET, PATCH, DELETE | Portfolio register & roll-ups |
| `/api/programs`, `/api/programs/[id]` | GET, POST / GET, PATCH, DELETE | Program register |
| `/api/projects`, `/api/projects/[id]` | GET, POST / GET, PATCH, DELETE | Project register & detail |

## Planning domain (nested under project)

| Route | Methods | Purpose |
|---|---|---|
| `/api/projects/[id]/requirements` (+`[reqId]`) | GET, POST / PATCH, DELETE | Requirements with acceptance criteria |
| `/api/projects/[id]/wbs` (+`[nodeId]`) | GET, POST / PATCH, DELETE | WBS tree nodes |
| `/api/projects/[id]/tasks` (+`[taskId]`) | GET, POST / GET, PATCH, DELETE | Tasks (writes trigger CPM reschedule) |
| `/api/projects/[id]/dependencies` (+`[depId]`) | GET, POST / PATCH, DELETE | FS/SF/SS/FF + lag (recomputes schedule) |
| `/api/projects/[id]/schedule` | GET | Computed CPM schedule (ES/EF/LS/LF, float, critical path) |
| `/api/projects/[id]/milestones` (+`[msId]`) | GET, POST / PATCH, DELETE | Milestones |
| `/api/projects/[id]/baselines` (+`[baselineId]/activate`) | GET, POST / POST activate | Versioned baselines |
| `/api/projects/[id]/audit` | GET | Per-project audit trail |

Cross-project planning screens read the same nested routes via filters.

## Execution domain

| Route | Methods | Purpose |
|---|---|---|
| `/api/resources` (+`[id]`) | GET, POST / GET, PATCH, DELETE | Resource register (auto-links user accounts by email) |
| `/api/assignments` (+`[id]`) | GET, POST / PATCH, DELETE | Resource assignments (allocation %) |
| `/api/capacity` | GET | Capacity vs demand analysis |
| `/api/timesheets` (+`[id]`) | GET, POST(upsert rows) / GET, PATCH | Weekly timesheets |
| `/api/timesheets/[id]/submit` · `/approve` · `/reject` · `/lock` | POST | Lifecycle cascade (approvals roll actuals into projects) |
| `/api/planner` (+`[id]`) | GET, POST / PATCH, DELETE | Focus planner entries |
| `/api/inbox` (+`[id]`) | GET, POST / PATCH, DELETE | Work inbox (actions, alerts, escalations) |

## Control domain

| Route | Methods | Purpose |
|---|---|---|
| `/api/financials` | GET | Portfolio/project financial roll-up |
| `/api/financials/budget-lines` (+`[id]`) | GET, POST / PATCH, DELETE | Budget lines |
| `/api/evm` | GET, POST | EVM snapshots (CPI/SPI/EAC/…) + history |
| `/api/risks` (+`[id]`) | GET, POST / PATCH, DELETE | Risk register (score/severity computed) |
| `/api/issues` (+`[id]`) | GET, POST / PATCH, DELETE | Issue register |
| `/api/assumptions` (+`[id]`) | GET, POST / PATCH, DELETE | Assumption log |
| `/api/changes` (+`[id]`) | GET, POST / PATCH, DELETE | Change requests with impact fields |
| `/api/gates` (+`[id]`) | GET, POST / PATCH, DELETE | Stage gates + decisions |
| `/api/governance/rules` (+`[id]`) | GET, POST / PATCH, DELETE | Threshold rules |
| `/api/governance/evaluate` | POST | Run all active rules → alerts/inbox/health |
| `/api/alerts` (+`[id]`) | GET, POST / PATCH, DELETE | Alert backlog (acknowledge/resolve) |
| `/api/health-snapshots` → via `/api/projects/[id]` | — | Health snapshots (engine-managed) |

## Leadership & reporting

| Route | Methods | Purpose |
|---|---|---|
| `GET /api/reports/leadership` | GET | Full executive bundle (tower, exceptions, insights, validation, outlook, 17 sub-reports) — `executive.view` |
| `GET /api/reports/leadership/status-report?projectId=` | GET | Per-project executive status report |
| `POST /api/reports/leadership/pack` | POST | Generate + persist versioned Leadership Pack snapshot (audited, emits `report:generated`) |
| `GET /api/reports/leadership/history` (+`/[id]`) | GET | Snapshot list / full payload |
| `POST /api/reports/leadership/run-due` | POST | Execute due report schedules (scheduler entry point) |
| `/api/reports/schedules` (+`[id]`) | GET, POST / PATCH, DELETE | Report schedule CRUD (frequency, sections, recipients) |
| `/api/reports/analytics` | GET | Analytics aggregates |
| `/api/decisions` (+`[id]`) | GET, POST / PATCH | Decision register (raise requires `project.manage`, record requires `gate.decide`) |
| `/api/actions` (+`[id]`) | GET, POST / PATCH | Leadership action register (uses `inbox.use`) |
| `/api/kpis` (+`[id]`) | GET, POST / PATCH | KPI / benefits register |

## Delivery & collaboration

| Route | Methods | Purpose |
|---|---|---|
| `/api/deliverables` | GET, POST, PATCH, DELETE | Deliverables with acceptance/quality status |
| `/api/meetings` | GET, POST, PATCH, DELETE | Meetings (STEERCO etc.) with minutes |
| `/api/stakeholders` | GET, POST, PATCH, DELETE | Stakeholder register |
| `/api/notifications` (+`[id]`) | GET, POST / PATCH | In-app notifications |

## Command Center domain (v3.0)

All routes follow the standard conventions (JWT → RBAC → zod → audit → rate-limit) and emit realtime events (`agile:changed`, `field:changed`).

| Route | Methods | Purpose |
|---|---|---|
| `GET /api/agile?projectId&sprintId` | GET | Agile board bundle: projects, sprints, epics, task cards (code/status/priority/points/sprint/epic/assignee) + summary (active sprint, backlog count, total points) — `project.view` |
| `POST /api/agile` | POST | Create `type:"SPRINT"` (goal, window, one ACTIVE per project) or `type:"EPIC"` (code, color, business value) — `agile.manage` |
| `PATCH /api/agile` | PATCH | Move/update a task card: `{taskId, status?, sprintId?, epicId?, storyPoints?, backlogOrder?}` — cross-project guards, sprint points recomputed, completing sets progress 100% — `inbox.use` |
| `DELETE /api/agile?type=SPRINT\|EPIC&id=` | DELETE | Remove sprint (tasks return to backlog) or epic — `agile.manage` |
| `/api/clients` (+`[id]`) | GET, POST / PATCH, DELETE | Client register with invoiced/paid/outstanding roll-ups per client; delete blocked while invoices exist — view `financial.view`, write `client.manage` |
| `/api/invoices` (+`[id]`) | GET, POST / GET, PATCH, DELETE | Invoice register with line items; totals (subtotal/tax/total) computed server-side; lifecycle DRAFT→SENT→PAID (locked when paid), OVERDUE/VOID — `client.manage` |
| `/api/expenses` (+`[id]`) | GET, POST / PATCH, DELETE | Expense register with category roll-ups and PENDING→APPROVED/REJECTED→REIMBURSED approval (approver stamped) — `client.manage` |
| `/api/rfis` (+`[id]`) | GET, POST / PATCH, DELETE | RFI register with ageDays, unanswered>7d flag, cost/schedule impact totals; auto-code `RFI-####` per project; answer workflow stamps dateAnswered — view `project.view`, write `field.manage` |
| `/api/daily-logs` (+`[id]`) | GET, POST / DELETE | Site diary (weather, crew, work, delays, safety) with summary (peak crew, incidents) — `field.manage` |
| `/api/punch-list` (+`[id]`) | GET, POST / PATCH, DELETE | Punch items OPEN→IN_PROGRESS→CLOSED→VERIFIED with overdue tracking; auto-code `PUNCH-###` — `field.manage` |
| `/api/feedback` (+`[id]`) | GET, POST / PATCH, DELETE | Feedback board sorted by votes; triage status + roadmap linking — view/mine `inbox.use`, triage `product.manage` |
| `POST /api/feedback/[id]/vote` | POST | Toggle the caller's vote (unique per user) — `inbox.use` |
| `/api/roadmap` (+`[id]`) | GET, POST / PATCH, DELETE | Roadmap items by quarter with progress, release tag, linked feedback counts — `product.manage` |
| `/api/docs` (+`[id]`) | GET, POST / GET, PATCH, DELETE | Docs workspace: space-filtered page index with excerpts + full-text search; markdown content — `docs.use` |
| `/api/message-boards` (+`[id]`) | GET, POST / GET, POST, PATCH, DELETE | Thread list (pinned first, last-activity) and thread detail with comments; reply updates replyCount/lastActivityAt — `boards.use` |
| `/api/proofing` (+`[id]`) | GET, POST / GET, PATCH, POST, DELETE | Proof rounds per deliverable (auto round number) with annotation counts; PATCH takes a decision or `{annotationId, annotationResolved}`; POST adds an annotation (locator/xPct/yPct) — view `project.view`, decide `proofing.manage`, annotate `inbox.use` |

## Connect domain

| Route | Methods | Purpose |
|---|---|---|
| `/api/integrations` (+`[id]`) | GET, POST / PATCH, DELETE | Connector registry |
| `/api/integrations/[id]/credentials` | GET, POST | Credential vault entries (masked) |
| `/api/integrations/[id]/enable` · `/disable` | POST | Connector lifecycle |
| `/api/webhooks` (+`[id]`) | GET, POST / PATCH, DELETE | Subscriptions (HMAC signing) |
| `/api/webhooks/[id]/deliveries` | GET | Delivery log |
| `/api/automations` (+`[id]`) | GET, POST / PATCH, DELETE | Automation rules |
| `/api/automations/[id]/run` | POST | Manual run |
| `/api/assistant` | POST | AI PM assistant (uses configured AI connector) |

## Admin domain

| Route | Methods | Purpose |
|---|---|---|
| `/api/admin/users` (+`[id]`) | GET, POST / PATCH, DELETE(deactivate) | User administration (`admin.users`) |
| `/api/admin/roles` (+`[id]`) | GET, POST / PATCH, DELETE | Role administration |
| `/api/templates` (+`[id]`) | GET, POST / PATCH, DELETE | PMO template library (`admin.templates`) |
| `/api/templates/[id]/apply` | POST | Scaffold project from template |
| `/api/admin/templates-config` | GET | Config bootstrap (env-provided) |

## Data exchange

| Route | Methods | Purpose |
|---|---|---|
| `GET /api/export/[entity]` | GET | CSV export (UTF-8 BOM) — `?format=json` for all fields, `?template=1` import template, `?meta=1` column metadata. 22 entities. Audited `EXPORT`. |
| `POST /api/import/[entity]` | POST | `{rows, mode:"validate"|"apply"}` — dry-run validation (rolled-back transaction) then transactional upsert. 13 master-data entities. Audited `IMPORT` + `data:imported` event. |
| `POST /api/export/ppt` | POST | **Universal PowerPoint export (v3.1)** — `{ view, projectId? }` → 16:9 `.pptx` deck (cover with project metadata, KPI cards, auto-paginated tables, native charts, multi-slide Gantt). 40+ views listed in `src/lib/pptx/registry.ts`; server-side engine so web and desktop output is identical. Permission ANY-of `reports.view`/`project.view`; audited; 20/min. |

---

### Example — generate a Leadership Pack

```bash
TOKEN=$(curl -s -X POST https://pm.example.com/api/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"pmo@yourco.com","password":"…"}' | jq -r .data.token)

curl -s -X POST https://pm.example.com/api/reports/leadership/pack \
  -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' -d '{}' | jq .data.version
```
