# MASTER DEVELOPMENT PROMPT v2 — PM CONTROL TOWER "MARKET LEADER" PROGRAM

> **Status note (2026-09-19, v3.0):** this was the v2 program charter. The v3.0
> "Command Center" expansion has since shipped the omni-functional scope (agile,
> omni views, product strategy, docs/boards, clients/billing, field ops, proofing).
> Current capabilities and architecture: `docs/COMMAND-CENTER-PRD.md` and
> `docs/12-MASTER-PLATFORM-AUDIT.md`. Phases below are preserved as history.

## CONTEXT (DO NOT REGRESS)
PM Control Tower v1.9.2 already ships: connected delivery model (Portfolio→Program→Project→WBS→Task→Dependency→Milestone→Resource→Timesheet→Cost→EVM→Health→Governance→Benefits), CPM Gantt, EVM engine, S-Curve + forecast controls, the Integrity Layer (freshness engine, evidence bundles, P80 Monte Carlo, calibration, scenario sandbox, draft-first AI + learning memory, data quality), Technology tower, Reporting Center (177 templates + viewer + print/PDF), Prioritization engine + budget-constrained selection, Investment & Business Case (ROI/NPV/IRR/payback), 27-connector catalog, Admin Control Center metadata layer (field builder, naming conventions, terminology, feature flags — server-side enforced), 40/40 engine tests.

## THE MISSION
Close every gap that blocks enterprise adoption versus Jira/RTC-ELM/Clarity/ServiceNow/Trello, then LEAPFROG them. After this program PMCT must win on: identity & security, ecosystem sync, delivery depth, financial depth, and trust — while keeping the Integrity moat.

## PHASE 1 — ENTERPRISE IDENTITY & ACCESS (highest priority)
1. **SAML 2.0 + OIDC SSO (live)**: real Entra ID + Okta flows using jose; IdP group→role mapping rules configurable in Admin Center; JIT user provisioning with role assignment; session bridging for API tokens. Acceptance: a user authenticates via Entra ID and lands in PMCT with mapped permissions, zero local password.
2. **SCIM provisioning (live)**: RFC 7644 endpoints (/scim/v2/Users, Groups); create/update/deactivate propagates to sessions and assignments; audit every sync.
3. **MFA (TOTP) per user** with recovery codes; enforce-by-role setting in Admin Center.
4. **Separate administrator roles** implemented as real permission sets: System Admin, Config Admin, Security Admin, Reporting Admin, Integration Admin, Finance Admin.

## PHASE 2 — ECOSYSTEM SYNC (CONFIGURED → CONNECTED, for real)
5. **Jira two-way sync**: inbound (issues→tasks with field mapping metadata, status mapping table, webhook-driven incremental), outbound (PMCT task status→Jira); conflict resolution last-writer-wins with audit; mapping UI in Integration Manager using the metadata layer.
6. **Azure DevOps inbound**: work items + builds + releases → task progress + CTO tower release metrics.
7. **ServiceNow inbound**: incidents→risks/issues, demands→project intake.
8. **Email/Outbound digest (live)**: scheduled report delivery via Graph sendMail (Reporting Center subscriptions become real emails).
Acceptance: activate with real credentials → status flips CONFIGURED→CONNECTED only after a successful live round-trip; sync runs are audited with item-level results.

## PHASE 3 — DELIVERY DEPTH
9. **UAT module**: UATCycle, UATCase, UATExecution entities; cycles linked to projects; pass/fail/blocked execution with defect linkage (issue); **hard gate lock**: Go-Live gate cannot pass while critical UAT cases are unresolved (enforced server-side in the gate decision path).
10. **Document management**: Document entity (name, version, file ref, entity linkage to projects/deliverables/gates); version history; gate evidence can attach documents.
11. **Gantt drag editing**: pointer-based drag (move) + resize (duration) on the existing CPM Gantt writing through to tasks with audit + cascade (reschedule + health); dependency lines drawn on the chart.
12. **Schedule scenario save**: the existing what-if math gets a "save scenario" (name + deltas + resulting finish) listed in the project without touching production.

## PHASE 4 — FINANCIAL DEPTH (CFO)
13. **Committed cost + invoices + contracts**: Contract, Invoice entities linked to vendors and projects; committed cost = open POs + contracts; project financial view shows Budget / Committed / Actual / Forecast.
14. **Portfolio financial ratios**: ROI, NPV, IRR, payback computed per project from Investment & Business Case and rolled to portfolio level.
15. **CAPEX/OPEX classification on budget lines** with category roll-up reports (CAPEX by project/portfolio, OPEX trend).

## PHASE 5 — PORTFOLIO PRIORITIZATION UX + STRATEGY
16. **Strategy → Strategic Objective entities**: objectives with target weights; projects link to objectives; strategic alignment % computed as investment-weighted coverage.
17. **Prioritization executive UX**: one-screen ranking + bubble chart (value vs cost vs risk) + budget slider that live-recalculates the optimizer.
18. **"Better than them" differentiators to add**:
    - **Decision Quality Tracking**: every recorded decision gets revisited after N days — did the predicted outcome hold? (unique: nobody closes the decision loop)
    - **Anomaly detection (statistical, no fake AI)**: flag cost/progress weeks that deviate >2σ from the project's own history.
    - **Portfolio Integrity Score**: composite of freshness + DQ + governance compliance as a single board-level number.

## CONSTITUTION (unchanged)
Computed numbers only; every mutation validated→persisted→audited→engines→realtime; engines pure + unit-tested; AI drafts/humans approve; stale data visible; seeded randomness; no feature without seed + docs + cascade hook; honest status discipline (CONFIGURED ≠ CONNECTED); no placeholder buttons; no fabricated analytics.

## ENGINEERING
- Extend Prisma schema with: SamlConfig, OidcConfig, ScimToken, MfaSecret, IntegrationMapping, UatCycle, UatCase, UatExecution, Document, DocumentVersion, Contract, Invoice, StrategicObjective, ProjectObjective, ScheduleScenario, DecisionReview, AnomalyEvent, PortfolioIntegritySnapshot (+ indexes, FKs).
- New engines pure + tested: sso mapping, scim transform, sync conflict resolution, uat gate guard, schedule scenario diff, decision review, anomaly detection, integrity score.
- APIs under /api/* consistent with existing withApi patterns; permissions: sso.manage, sync.manage, uat.manage, docs.manage, finance.manage reuse.
- UI: Integration Manager mapping UI, UAT tab in ProjectWorkspace, Documents tab, Strategy page, Prioritization exec UX, Admin sections for new config.
- Docs: update README, docs/12 audit, CHANGELOG each phase; regenerate test report + Important Documents.

## EXECUTION PHASES (each: build → test → live verify → docs → commit+tag+backup)
- Phase 1: Identity & Access (SSO/SCIM/MFA/admin roles)
- Phase 2: Jira + ADO + ServiceNow sync + live email digests
- Phase 3: UAT + Documents + Gantt drag + schedule scenarios
- Phase 4: Financial depth (contracts/invoices/committed + portfolio ratios)
- Phase 5: Strategy objectives + prioritization UX + the three leapfrog differentiators
- Final: uniqueness matrix re-audit vs market, full regression (final-verify.ts + unit suite), Important Documents regeneration, release tag.

## ACCEPTANCE
The program is done when: (1) a new user authenticates only via Entra ID/Okta and is provisioned by SCIM; (2) a Jira issue change appears in PMCT and vice versa within a minute; (3) a Go-Live gate is provably blocked by unresolved critical UAT; (4) CFO sees Budget/Committed/Actual/Forecast per project; (5) every board-level number traces to computed operational data with the Integrity Layer's evidence chain intact.
