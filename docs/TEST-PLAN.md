# PM CONTROL TOWER — Master Test Plan & E2E Test Cases (v1.6.0)

## 1. Strategy
- **Levels:** Unit (26 engine tests, `npm test`) → API integration (authenticated REST calls) → UI E2E (browser, role-based journeys) → Regression (after every release).
- **Environments:** local standalone build on :3000 against `db/custom.db`; reset via `start.bat` (full reseed) or per-module idempotent seeds (`seed-integrity`, `seed-technology`, `seed-connectors`, `seed-reporting`).
- **Test users:** pmo@pmct.io (PMO_ADMIN, super), pm.sarah@pmct.io (PM), ceo@pmct.io (EXECUTIVE), liam@pmct.io (MEMBER), auditor@pmct.io (read-only). Password `Pmct@2026`.
- **Auth:** every API test logs in via `POST /api/auth/login` and sends `Authorization: Bearer <token>`; UI tests use the demo-role buttons.
- **Golden rule:** verify numbers are COMPUTED (change an input → downstream values must move), and permission denials return 401/403 — never data.

## 2. Test Cases

### AUTH & RBAC
| ID | Steps | Expected |
|---|---|---|
| TC-AUTH-01 | Login pmo with correct password | 200 + JWT; dashboard loads with JB avatar |
| TC-AUTH-02 | Login with wrong password | 401, no token |
| TC-AUTH-03 | Call any /api/* without token | 401 Authentication required |
| TC-AUTH-04 | Login as liam → open /admin/users, /prioritization | Nav items hidden; direct API call → 403 |
| TC-AUTH-05 | Login as ceo → check Tech tower nav absent; Integrity visible (integrity.view) | Matches role matrix docs/07 |
| TC-AUTH-06 | Expired/old JWT (from previous DB) → call /api/auth/me | 401; UI redirects to login |

### PORTFOLIO → PROJECT DELIVERY (core cascade)
| ID | Steps | Expected |
|---|---|---|
| TC-PF-01 | Create portfolio → program → project (owner, dates, budget) | Appears in register + dashboard counts +1 |
| TC-WBS-01 | Create WBS tree + tasks with FS dependencies | CPM computes ES/EF/LS/LF/float; critical path flagged |
| TC-WBS-02 | Extend a critical task duration +50% | Project finish shifts; downstream tasks recompute; health recalc |
| TC-MS-01 | Create milestone with past due date, status PENDING | Overdue count +1 on dashboard; governance alert |
| TC-TS-01 | Team member submits weekly timesheet (hours on task) | Inbox item to approver; status SUBMITTED |
| TC-TS-02 | Approver approves | Task actualHours/actualCost += entries; WBS roll-up; EVM recomputed (EV/AC move); health snapshot created; freshness timesheets feed refreshes; realtime events fire |
| TC-TS-03 | Reject timesheet | Status REJECTED; member notified; no actuals change |
| TC-EVM-01 | Cockpit shows CPI/SPI/EAC matching manual math (EV/AC, EV/PV, BAC/CPI) | Values exact to 2dp |
| TC-EVM-02 | Full form: save MANUAL_PERIOD (BAC 1M, PV 250k, EV 220k, AC 275k) | CPI .80, SPI .88, EAC 1.25M, source=MANUAL_PERIOD, audited, health recalculated |
| TC-FIN-01 | Add budget line exceeding budget | Financial variance shown; governance financial warning |

### INTEGRITY LAYER
| ID | Steps | Expected |
|---|---|---|
| TC-INT-01 | Freshness tab: all projects scored; worst feed dominates | CRM-006 DEGRADE (gates 2.08×); per-feed ages match data |
| TC-INT-02 | Set grace window 48h → recently-updated stale feed | Level improves to CURRENT; graceApplied=true |
| TC-INT-03 | Leave project stale >2.5× cadence | CRITICAL alert → PMO inbox (deduped); health −12 |
| TC-INT-04 | Export evidence bundle → note doc count + manifest | 201; bundle in registry |
| TC-INT-05 | Tamper: change a gate evidence text → verify | FAIL + firstBrokenRef = that gate; restore → new bundle PASSes |
| TC-INT-06 | Download ZIP | Valid PK zip; INDEX.txt lists all docs; manifest.json matches |
| TC-INT-07 | Simulate (async): POST → 202 QUEUED → poll | Worker completes ≤5s; P50/P80 dates rendered; same seed → identical percentiles |
| TC-INT-08 | Change schedule → old run marked STALE | Stale badge; never shown as current |
| TC-INT-09 | Calibration: ≥5 completed dated tasks → factor appears | factor=median(actual/planned); <5 samples → not confident |
| TC-INT-10 | Create task with 5d duration on project with confident 1.2× factor | durationDays pre-filled 6d; note records the adjustment |
| TC-INT-11 | Scenario: fork → stretch longest task → diff | Finish delta = CPM-verified; production unchanged |
| TC-INT-12 | Merge with production drift (task changed since fork) | REBASED decision recorded; CR created in one transaction |
| TC-INT-13 | AI Actions: draft pack on project with SPI<0.9×3 | needsRePlan=true; 3 quantified recovery scenarios; approve → reviewer recorded, immutable |
| TC-INT-14 | Benefits: pass final gate → profiles activate | TRACKING badges; actual posting moves portfolio rollup |
| TC-INT-15 | Data Quality: remove a project sponsor → GET | Issue listed; score −12; DQ tab shows chip |

### TECHNOLOGY & CONNECTORS
| ID | Steps | Expected |
|---|---|---|
| TC-TECH-01 | CTO tower KPIs match register (legacy %, cloud %, debt hours) | Values = computed totals |
| TC-TECH-02 | Register new app (cloud) | Appears; cloud adoption % increases |
| TC-CONN-01 | Integration Hub shows 27 connectors | All CONFIGURED (not Connected); auth/direction metadata present |
| TC-CONN-02 | Enter Jira credentials + live test | Only then status → CONNECTED |

### REPORTING CENTER
| ID | Steps | Expected |
|---|---|---|
| TC-RPT-01 | Library shows 177 templates; search "budget" filters | Count + filter correct |
| TC-RPT-02 | Generate "Business Benefits Realization" | KPI snapshot = live numbers (7 projects, RAG counts, budget/actual/forecast); narrative cites same numbers |
| TC-RPT-03 | Favorite a template → refresh | Star persists (localStorage) |
| TC-RPT-04 | History shows generation with period/by/narrative | Matches action |
| TC-RPT-05 | Subscribe to template | Subscription saved (unique per user+template) |
| TC-RPT-06 | liam opens Reporting Center | Sees library; financial-template data stays permission-scoped |

### PRIORITIZATION
| ID | Steps | Expected |
|---|---|---|
| TC-PRI-01 | Score a project (7 criteria) | Weighted total = Σ(score×weight)/100 exact |
| TC-PRI-02 | Ranking order + classification bands | 90+ CRITICAL … <60 DEFER |
| TC-PRI-03 | Override score with reason | Shows override by/why, distinct from system score |
| TC-PRI-04 | Optimize @10M budget with 7 costed projects | Selected fits budget; every exclusion has reason (budget/dependency); scenario saved |
| TC-PRI-05 | Optimizer dependency guard: unfunded dependency | Dependent excluded with "Dependency not funded: X" |
| TC-PRI-06 | Matrix: bubble positions = cost/value normalized | Quadrants match labels |

### UI / REGRESSION GUARDS
| ID | Steps | Expected |
|---|---|---|
| TC-UI-01 | Fresh load every route: /dashboard /integrity /technology /reporting /prioritization /evm /resources /tasks /reports | No "Application error"; data renders |
| TC-UI-02 | Hard refresh (Ctrl+Shift+R) after any release | New bundle loads; no stale-chunk 404s |
| TC-UI-03 | Realtime: two browsers, approve timesheet in one | Other updates without reload |
| TC-UI-04 | 401 mid-session (expire token in localStorage) | Graceful redirect to login, no crash |
| TC-UI-05 | Error boundaries: force FreshnessRail failure | Rail hides; dashboard survives |

### NON-FUNCTIONAL
| ID | Check | Expected |
|---|---|---|
| TC-NFR-01 | Dashboard load < 3s on 7-project DB; indexes present | No full scans on open (network tab) |
| TC-NFR-02 | Audit trail rows exist for: project create, CR, gate decision, timesheet approve, evidence export, scenario merge, score save | Every mutation traceable with user+timestamp |
| TC-NFR-03 | Reset via start.bat | Fresh seed incl. integrity/tech/connectors/reporting data; login works |

## 3. Execution order (smoke → full)
1. **Smoke (15 min):** TC-AUTH-01, TC-UI-01, TC-TS-01/02, TC-INT-01, TC-RPT-02, TC-PRI-04.
2. **Full regression:** all cases top-to-bottom per module after each release tag.
3. **Bug protocol:** reproduce → capture API status + browser console → fix → add/extend a unit test where the engine is involved → re-run full suite → tag + backup.

## 4. Known watch-items (from live testing so far)
- Browser cache after rebuilds: always hard-refresh or bump `?v=` (stale chunks 404).
- FreshnessRail is boundary-isolated; console may log suppressed errors — check before treating as page failure.
- Transient `data=null` in useApi: guards added on Data Integrity; apply the same `!data` guard pattern to any new tab added to other views.

---

## 5. v3.0 Command Center test round (executed 2026-09-19)

All new-module cases executed against the live dev server (:3111) after `prisma db push`,
`sync:rbac` and `seed:command-center`. Result: **PASS** unless noted.

### API integration (authenticated)
| ID | Steps | Expected | Result |
|---|---|---|---|
| TC-CC-01 | GET all 13 new endpoints (agile, clients, invoices, expenses, rfis, daily-logs, punch-list, feedback, roadmap, docs, message-boards, proofing, capacity) | 200 `success:true` each | ✅ 13/13 |
| TC-CC-02 | PATCH /api/agile `{taskId, status:"IN_PROGRESS"}` | 200; status updated; sprint points recomputed | ✅ |
| TC-CC-03 | POST /api/feedback/[id]/vote (toggle twice) | votesCount +1 then back; unique per user | ✅ |
| TC-CC-04 | POST /api/message-boards/[id] reply | 201; replyCount and lastActivityAt update | ✅ |
| TC-CC-05 | PATCH /api/invoices/[id] `{status:"PAID"}` on SENT invoice | 200; status PAID; paidAt stamped; further status change → 400 (locked) | ✅ |
| TC-CC-06 | PATCH /api/rfis/[id] answer | status ANSWERED; dateAnswered stamped | ✅ |
| TC-CC-07 | PATCH /api/proofing/[id] `{status:"APPROVED"}` then annotation resolve | decisionAt stamped; annotation resolved | ✅ |
| TC-CC-08 | POST sprint → DELETE sprint with tasks | 201 → 200; tasks returned to backlog (sprintId null) | ✅ |
| TC-CC-09 | POST /api/invoices as TEAM_MEMBER (liam) | 403 | ✅ |
| TC-CC-10 | POST /api/rfis as TEAM_MEMBER | 403 | ✅ |
| TC-CC-11 | PATCH /api/feedback as TEAM_MEMBER (triage) | 403 | ✅ |
| TC-CC-12 | PATCH /api/agile card move as TEAM_MEMBER (nonexistent task) | 404 (permission passes — members may move cards) | ✅ |
| TC-CC-13 | POST /api/agile second ACTIVE sprint same project | 400 "Only one active sprint per project" | ✅ |

### UI E2E (browser, PMO login)
| ID | Steps | Expected | Result |
|---|---|---|---|
| TC-CC-20 | Open #/boards — Kanban tab | Columns per TASK_STATUS with seeded cards, counts, stat cards; drag lanes present | ✅ (screenshot t1) |
| TC-CC-21 | Boards — Calendar tab | Month grid, today marker, task/meeting chips | ✅ (t2) |
| TC-CC-22 | Boards — Workload tab | Resource × week heatmap, red over-allocation, avg column, weeks selector | ✅ (t3) |
| TC-CC-23 | #/agile — New sprint dialog | Fields (name/goal/dates) render; create succeeds | ✅ (t4) |
| TC-CC-24 | #/clients — tabs | Client register with revenue roll-ups; invoice totals in stat row | ✅ (t5) |
| TC-CC-25 | #/field — tabs | RFI aging (red >7d), impact totals, Answer action; logs; punch chain | ✅ (t6) |
| TC-CC-26 | #/feedback | Vote cards with counts, triage chips, roadmap lanes | ✅ (t7) |
| TC-CC-27 | #/docs | Page index with seeded docs, spaces filter, editor opens | ✅ (t8) |
| TC-CC-28 | #/boards-hub — open thread | Thread detail with comments, reply box, pin toggle | ✅ (t9) |
| TC-CC-29 | #/proofing | Round list + detail drawer, approve/changes actions | ✅ (t10) |
| TC-CC-30 | Project picker present on agile/proofing/field headers | Picker renders and persists shared selection | ✅ (t11) |

Known watch-item: the Radix select popup is hard to drive via browser automation
(re-render race) — project switching verified at API level; manual QA unaffected.
