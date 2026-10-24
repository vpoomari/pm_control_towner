# PM CONTROL TOWER — BUSINESS PLAN & COMMERCIAL STRATEGY 2026–2027

**Document:** PMCT-BP-2026 · **Version:** 1.0 · **Date:** 23 September 2026 · **Classification:** Confidential — CEO / Investor / Management use
**Basis:** PM Control Tower v3.1.0 (shipped product) + verified 2026 market research
**Currency:** USD primary; INR secondary at an assumed **1 USD = ₹88** (state actual rate at use)
**Evidence legend:** **[V]** = verified from official vendor page/price list · **[R]** = reported by third-party/market estimate · **[E]** = PMCT planning assumption

> **Headline verdicts (developed in Parts 8, 25, 26, 35, 36):**
> **DIFFERENTIATION VERDICT: SUFFICIENT** for mid-market and upper-mid enterprise segments
> (100–5,000 employees), **PARTIAL** for global large enterprise until certifications and scale
> land. **POSITIONING: "Enterprise Project & Portfolio Control Tower."** **MOTION: coexistence-first**
> — PMCT sits above Jira/ServiceNow/SAP/HR/Finance and replaces the spreadsheet/BI glue layer
> before it ever replaces a work tool.

---

## STRATEGIC FRAMING

PMCT is not analyzed here as another task-management tool. The commercial frame throughout:

```
Jira · ServiceNow · SAP · HR · Finance · Teams        (the project ecosystem — systems of record)
                 ↓
        PM CONTROL TOWER                              (the aggregation, intelligence & control layer)
                 ↓
        CEO · CFO · CTO · PMO                         (decisions)
```

- Work-management tools (Tier 1) are the layer **below** PMCT; enterprise PPM/SPM suites
  (Tier 2) are the **direct** competitive tier; the status quo PMCT actually replaces is the
  **glue layer** — spreadsheets + Power BI + manual PMO reporting + reconciliation.
- Individual features do not differentiate (Jira and ClickUp have absorbed planning, AI,
  automation and governance). The tested claim is the **combination**: portfolio prioritization
  + financial intelligence (ROI/NPV/IRR/payback/EVM) + resource capacity + governance +
  executive reporting + configurable enterprise control + integrations + self-hosted deployment.
- The buyer is senior (CEO/CFO/CIO/PMO Director): committee sales, security review, procurement.
- Pricing is value-based on the layer — never the cheapest seat.

---

## PART 1 — EXECUTIVE BUSINESS PLAN

### 1.1 Company/Product Concept

**PMCT is an enterprise Project, Program & Portfolio Management (PPM) control tower**: a
self-hostable platform that brings planning, execution, governance, financials, resources,
reporting, automation, integrations and executive decision-making into one governed system —
and aggregates the systems the organization already runs (Jira, ServiceNow, SAP, HR, Finance,
Teams) into one decision surface for leadership.

- **Who it is for:** corporate PMOs, portfolio/program leadership, CFOs and CEOs of mid-market
  and enterprise organizations (100–5,000 employees first), especially in project-intensive and
  regulated industries.
- **What problem it solves:** leadership cannot see or steer the project portfolio in real time.
  Delivery truth lives in Jira; money lives in SAP/Excel; demand lives in ServiceNow; status is
  re-typed into PowerPoint. PMCT replaces that glue layer with computed, auditable, live
  intelligence: "leadership never needs to ask a project manager for status."
- **What existing tools fail to solve completely:** work tools stop at task level; PPM suites
  are expensive, slow to deploy and weak below the project line; BI dashboards are passive,
  manually refreshed and unaudited. No mainstream product combines portfolio optimization +
  financial intelligence + governance + executive reporting on top of the ecosystem, at
  mid-market price, with a self-hosted option.
- **Why organizations need it now:** tool sprawl + AI-sprinkled dashboards without governance
  have increased, not reduced, reporting burden; boards demand traceable numbers; DPDP/GDPR and
  data-residency pressure favors controllable deployment.

### 1.2 Business Vision

- **Vision:** every enterprise runs its portfolio from one truthful control tower.
- **Mission:** make executive project intelligence computed, auditable and immediate — not
  hand-made monthly.
- **Positioning:** "The Enterprise Project & Portfolio Control Tower — the layer above your
  project ecosystem."
- **Target market:** mid-market and enterprise organizations in IT services, banking/financial
  services, telecom, infrastructure/EPC, manufacturing, pharma, government-linked entities —
  starting with India and the Gulf (relationship-rich, price-sensitive-but-value-hungry,
  data-residency motivated), then US/EU mid-market via partners.
- **Business model:** tiered SaaS subscription (seat-based to ~500 users, hybrid platform+seat
  above), one-time implementation services, optional perpetual/on-prem licensing for regulated
  and sovereign buyers, annual maintenance.
- **Long-term opportunity:** the PPM software market is **$6.8–9.8B in 2026, growing 10–13%
  CAGR to $10.1–17.8B by 2030–31** [V: MarketsandMarkets 2026 report — $9.79B 2026 → $17.75B
  2031; The Business Research Company — $6.81B 2026 → $10.13B 2030]. PMCT aims at the
  mid-market band that Tier-2 suites over-serve on price and Tier-1 tools under-serve on depth.

### 1.3 Elevator Pitches

**30-second:** "Jira tells you what tasks are open. SAP tells you what was spent. Nobody tells
the CEO whether the portfolio is on track — until someone builds a slide deck. PM Control Tower
is the layer above your project ecosystem: it aggregates Jira, ServiceNow, SAP, HR and Finance
into one live, audited control tower with EVM, governance gates and board-ready reporting.
Deployed in weeks, self-hostable, at a tenth of enterprise PPM cost."

**60-second:** adds — "Every number is computed from source data with an audit trail: CPI/SPI,
critical path, budget vs committed vs forecast, P80 Monte Carlo, gate compliance. Executives get
an exception-first tower; the PMO stops hand-building board packs. We don't replace Jira — we
make it finally answer to the business."

**2-minute corporate pitch:** adds the wedge — "Enterprises already pay for the layer today,
invisibly: PMO analysts, Power BI models, reconciliation spreadsheets — typically 2–5x the cost
of the tools themselves. PMCT consolidates that spend into one governed product. We sell
coexistence first: keep Jira, kill the glue. Land at $15–21/user, expand to platform
licensing, with a self-hosted option no SaaS incumbent offers."

**Investor pitch:** adds — "PPM is a $9.8B market growing 12%+ with no mid-market winner.
PMCT ships today (115 data models, 168 APIs, CPM/EVM/Monte-Carlo engines, 177 report templates,
27-connector catalog, SSO/SCIM/MFA). Year-1 base plan: $481k revenue, 35 customers, break-even
inside Year 3 at ~$1M ARR with < $800k cumulative cash need."

---

## PART 2 — PROBLEM PMCT SOLVES

**The fragmentation problem.** Large organizations run delivery through a patchwork: Jira
(engineering), spreadsheets (plans), Smartsheet/Excel (portfolios), ServiceNow (demand/tickets),
SAP (money), PowerPoint (status). Each layer re-types the same facts; each re-typing loses
fidelity, freshness and trust.

**The concrete pains** (with business impact):

| Pain | Typical impact [E unless cited] |
|---|---|
| Project fragmentation across tools | PMO spends days/month consolidating; versions conflict |
| Portfolio visibility gaps | Decisions made on stale, hand-built summaries |
| PMO governance by email | Gates passed without evidence; audit findings |
| Resource allocation blind spots | Over-allocation discovered after burnout/delay |
| Capacity planning absent | Hiring and commitments unquantified |
| Financial tracking outside delivery | Budget overrun surfaces after the money is spent |
| CAPEX/OPEX, ROI/NPV/IRR manual | Business cases built once, never tracked |
| EVM not computed | CPI/SPI reserved for government contractors; early-warning lost |
| RAID scattered | Risks escalate by luck, not by rule |
| Dependencies invisible | Cross-project collisions found at go-live |
| Manual executive/steering/board reporting | 2–5 FTE-equivalents of assembly per month |
| Data duplication + multiple licenses | Duplicate tool spend; reconciliation errors |
| Disconnected Jira/ServiceNow/SAP/HR/Finance | No single truth; "whose number is right?" |
| Spreadsheet dependency | Unaudited, single-point-of-failure reporting |

**Quantified context:**

- Large IT projects run **45% over budget and 7% over time while delivering 56% less value**
  than predicted (McKinsey–Oxford study of 5,400 projects; industry-cited, dated 2012 but still
  the canonical figure) [R].
- **~9–12% of every project dollar is wasted** through poor performance; only ~one-third of
  organizations report mostly/highly successful delivery outcomes (PMI Pulse of the Profession,
  industry-cited) [R].
- The **glue-layer cost is the hidden baseline**: for a 100-person delivery organization, PMO
  reporting effort, BI maintenance and reconciliation typically cost **$150k–350k/year** before
  any tool license [E — model in Parts 9/12].

**The consequence:** decision latency. Portfolio corrections that should take days take
quarters, because the truth is assembled monthly by hand. PMCT's value proposition is measured
in *decision speed* and *waste avoided*, not in task features.

---

## PART 3 — PMCT PRODUCT SCOPE (CAPABILITY MAP)

Roles: **A = Aggregation · D = Decision · C = Control · R = Reporting** — the four functions of
a control tower. (Shipped = v3.1.0; all items below are shipped unless marked *Roadmap*.)

**Table 1 — PMCT Product Capability Map**

| # | Group | Capabilities (shipped v3.1.0) | Role |
|---|---|---|---|
| 1 | Portfolio Management [D] | Portfolio dashboard, hierarchy (portfolio→program→project), weighted strategic objectives, prioritization scoring + budget-constrained optimizer, investment & business cases (ROI/NPV/IRR/payback, best/base/worst), benefits realization, scenario planning, portfolio health, executive portfolio dashboard, portfolio financials (Budget/Committed/Actual/Forecast) | D |
| 2 | Project Management [D/C] | Project register & 13-tab workspace, charter/plan, WBS tree, tasks (unlimited nesting), milestones, dependencies (FS/SS/FF/SF+lag), **CPM engine** (ES/EF/LS/LF, float, critical path), enterprise Gantt v2.7 (split panel, dependency arrows, zoom, drag), versioned baselines, schedule variance, project health (RAG+GREY) | D |
| 3 | PMO Governance [C] | Governance rules engine (thresholds → alerts → inbox → health recalc), stage gates with evidence + UAT hard-lock, approvals, RAID (risks/issues/assumptions/actions), decisions register, change requests with impact, audit trail on every mutation, intake forms | C |
| 4 | Resource Management [D/C] | Resource register, assignments, capacity + demand, workload heatmap, utilization, over-allocation flags, timesheets (submit→approve→lock with actuals cascade) | C |
| 5 | Financial Management [C] | Budget lines (CAPEX/OPEX), actuals from timesheets, forecast (SPI-extrapolated, labeled), EVM engine (PV/EV/AC → CPI/SPI/EAC/ETC/VAC/TCPI + history), S-Curves, committed-cost roll-up (*Roadmap: PO/contract depth*), client invoicing & expenses | C |
| 6 | Reporting & Analytics [R] | **Executive/Leadership Control Tower** (exception-first feed, traceable insights, 16-check nothing-missed validation, 30/60/90 outlook), persona dashboards (CEO/CFO/CTO/PMO/PM), **177 report templates**, board packs, scheduled reports, email subscriptions, What-Changed deltas, analytics, **universal PowerPoint export (42 views)** | R |
| 7 | Automation [C] | Automation rules (trigger/condition/action + journal), governance alerts (risk/budget/schedule/overload/dependency), escalations, scheduled board packs, webhooks | C |
| 8 | AI [D/R] | AI PM assistant (draft-first, human-approved), AI gateway & connector registry, AI-drafted steering packs, statistical anomaly detection (>2σ, no fake AI), seeded Monte Carlo P80 forecasting, say/do calibration, AI memory/learning (*Roadmap: generative status narratives, meeting assistant*) | D |
| 9 | **The Integrity Layer** [C/R — the moat] | Data freshness engine (honest staleness, GREY honesty), **SHA-256 tamper-evident evidence bundles**, 43-permission RBAC × 8 roles, SSO (SAML/OIDC) + SCIM + MFA, full audit trail, portfolio integrity score, data-quality score, 27-connector integration catalog with CONFIGURED→CONNECTED honesty, metadata-driven admin configuration (custom fields/types, naming conventions, terminology, feature flags), self-hosted single-tenant deployment | C |

**Command Center modules (shipped v3.0+):** agile sprints/epics/story points, Kanban/Calendar/
Workload views, product feedback + roadmap, docs workspace + message boards, client invoicing
and expenses, construction field ops (RFIs, daily logs, punch list, BIM embed), deliverable
proofing rounds.

---

## PART 4 — TARGET CUSTOMERS

**ICP ladder (primary → exploratory):**

| Segment | Size | Fit | Why |
|---|---|---|---|
| **Mid-Market** | 50–500 employees, 20–200 project staff | **Primary** | Tier-2 PPM too expensive/slow; Tier-1 tools too shallow; glue layer most painful per dollar |
| **Enterprise (upper-mid)** | 500–5,000 employees | **Primary** | Governance + financial intelligence + integrations matter; self-hosted/data-residency resonates; sells against one ServiceNow/Planview seat block |
| Large Enterprise | 5,000+ | Later (Y2+) | Needs certifications, scale proofs (E-1/E-2 exceptions), partner delivery |
| Small Business | 10–50 | Opportunistic | Starter tier; self-serve only; not the core motion |

**Industry shortlist (strongest first):** IT Services & Consulting (portfolio visibility + client
billing shipped), Banking/FS & Insurance (governance, audit, data residency), Telecom (capex
programs), Infrastructure/EPC & Construction (field ops + proofing shipped), Manufacturing &
Automotive (NPI programs), Pharma (gated R&D-like governance), Government-linked (sovereign
deployment), Energy & Utilities (capex portfolio). Buying decision maker: PMO Director/CIO
(mid-market), CIO/CFO/Transformation Office (enterprise). Sales cycle: 4–10 weeks (mid-market,
remote) / 3–9 months (enterprise).

---

## PART 5 — BUYER PERSONAS (condensed)

| Persona | Core problem | PMCT value | Buying role | Killer objection → answer |
|---|---|---|---|---|
| **CEO** | No live portfolio truth; surprises late | Exception-first tower, 30/60/90 outlook, board pack in one click | Economic buyer | "Another dashboard?" → *it's computed + audited, not re-typed* |
| **CFO** | Budget vs actual vs forecast disconnected from delivery | Budget/Committed/Actual/Forecast, EVM, business-case ROI/NPV/IRR tracking, invoice/expense module | Economic buyer | "ERP does finance" → *ERP records spend; PMCT predicts completion cost* |
| **CIO/IT Director** | Tool sprawl; security review burden | SSO/SCIM/MFA, audit trail, self-hosted option, 27-connector catalog | Evaluator/approver | "Integration burden" → *JWT+webhooks, governed import, metadata config* |
| **PMO Director** | Manual reporting treadmill; weak governance adoption | Governance engine, gates with UAT lock, 177 templates, integrity score | **Champion** | "Team won't adopt" → *team keeps Jira; PMO gets truth without policing* |
| **Portfolio Manager** | Prioritization is political, not analytic | Weighted scoring, budget-constrained optimizer, scenarios | Champion | "Scores are subjective" → *transparent criteria, computed alignment %* |
| **Program/Project Manager** | Status reporting overhead | Auto-rolled health, What-Changed, PPT export | User/beneficiary | "Surveillance tool?" → *it removes their reporting work* |
| **Resource Manager** | Invisible over-allocation | Capacity, heatmap, utilization, timesheet cascade | User | — |
| **Finance Manager** | Manual cost joins | Budget lines, CAPEX/OPEX, invoices/expenses | User/approver | — |
| **CTO** | Tech estate opaque | Technology tower (apps, tech, debt, releases) | Evaluator | — |
| **Auditor** | Evidence gaps | Evidence bundles (SHA-256), audit trail, read-only role | Influencer | — |

**The "we already have Jira/ServiceNow" objection — strongest counters:** (1) Jira answers
"what is the team doing?", never "is the portfolio worth it and will it land on budget" —
Atlassian's own portfolio answer is Jira Align/Enterprise at a **$166k+/year floor** [V];
(2) ServiceNow SPM costs **~$100–200+/user/mo estimated** with 6–12-month implementations [R];
(3) the PMO glue layer today costs more than PMCT's total price while producing unaudited
numbers; (4) PMCT ships **coexistence** — connectors, webhooks, governed import — so the
question is not rip-and-replace.

---

## PART 6 — COMPETITIVE LANDSCAPE (TIERED)

**Table 2 — 20-Competitor Comparison (tiered)**

| # | Tool | Tier | Primary purpose | Target customer | Portfolio depth | Financial depth | Governance | Acts as cross-ecosystem layer? | Pricing model |
|---|---|---|---|---|---|---|---|---|---|
| 1 | **Jira** | 1 | Dev work tracking | Dev teams→enterprise | Low (Align = separate $$$) | Minimal | Via Atlassian Guard/Enterprise | No (its own data) | Per-user [V] |
| 2 | **ClickUp** | 1 | All-in-one work | SMB→MM | Basic dashboards | Time/billing only | Basic | No | Per-user + AI add-on [V] |
| 3 | **Trello** | 1 | Boards | SMB | No | No | No | No | Per-user [V] |
| 4 | **Asana** | 1 | Work management | MM | Portfolios (Advanced) | Goals; no EVM | Forms/approvals basic | No | Per-user [V] |
| 5 | **Monday.com** | 1 | Work OS | SMB→MM | Dashboards | Budget columns | Basic automations | Partial (many integrations, same data) | Per-seat [V] |
| 6 | **Smartsheet** | 3 | Grid work management | MM | Portfolio roll-ups | Basic | Basic | Partial | Per-member [V] |
| 7 | **Wrike** | 3 | PM + marketing ops | MM | Folders/dashboards | Budgeted time | Approvals | Partial | Per-user [V] |
| 8 | **Planview** | 2 | Enterprise PPM/SPM | Large ent | **Deep** | **Deep** (Portfolios) | Deep | Partial (AdaptiveWork+Portfolios, mainly own suite) | Custom [R] |
| 9 | **Broadcom Clarity** | 2 | Enterprise PPM | Large ent | Deep | Deep (cost plans) | Deep gates | Partial | Custom [R] |
| 10 | **ServiceNow SPM** | 2 | SPM on ServiceNow | Large ent | Deep | Roadmap/cost | Deep | Strong **within** ServiceNow estate | Custom [R] |
| 11 | **Microsoft Planner/Project** | 3 | Familiar PM | MS shops | P5 portfolio basic | Cost fields | Basic | Partial (M365) | Per-user [V] |
| 12 | **Oracle Primavera** | 2 | EPC/schedule PPM | EPC/infra | Schedule-centric | Cost-loaded schedules | Gates | No | Custom [R] |
| 13 | **Aha! Roadmaps** | 3 | Product roadmaps | Product orgs | Roadmap only | No | No | No | Per-user [V] |
| 14 | **Teamwork** | 1 | Agency PM | Agencies | Basic | Billing/time | Basic | No | Per-user [V] |
| 15 | **Zoho Projects** | 1 | Budget PM | SMB | Basic | Invoices | Basic | No | Per-user [V] |
| 16 | **Basecamp** | 1 | Simple collaboration | SMB | No | No | No | No | Flat/per-user [V] |
| 17 | **Notion** | 1 | Docs+wikis | SMB→MM | Manual | No | No | No | Per-member [V] |
| 18 | **Airtable** | 1 | No-code bases | SMB→MM | DIY | DIY | DIY | No | Per-seat [V] |
| 19 | **Celoxis** | 3 | Mid-market PPM | MM | Good | Good (financials) | Moderate | Partial | Per-user + on-prem [V] |
| 20 | **PPM Express / Triskell / Sciforma** | 2/3 | PPM overlays/suites | MM→Ent | Good | Moderate | Moderate | Partial (overlay on MS/ADO/Jira) | Custom/per-user [R] |
| **21** | **PMCT** | **Layer** | **Portfolio control tower above the ecosystem** | MM→Ent | **Deep + optimizer + scenarios** | **Deep (EVM, NPV/IRR, CAPEX/OPEX)** | **Deep + UAT hard-lock + evidence bundles** | **Yes — designed as the layer** | Per-user → platform, self-hosted option |

**Tier rules applied in Parts 7/8:** vs Tier 1 → coexistence/above analysis; vs Tier 2 →
capability-for-capability + TCO; vs Tier 3 → both.

---

## PART 7 — FEATURE COMPARISON MATRIX (TOP 12)

**Table 3 — Feature-by-Feature Matrix** (Y = native, P = partial/add-on/enterprise-tier, N = no,
C = custom/quote; PMCT column = shipped v3.1.0)

| Capability | PMCT | Jira | ClickUp | Asana | Monday | Smartsheet | Wrike | MS Proj/Planner | Aha! | Celoxis | ServiceNow SPM | Planview |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Project mgmt (WBS/tasks/deps) | Y | Y | Y | P | P | P | Y | Y | P | Y | Y | Y |
| Portfolio mgmt & hierarchy | Y | P (Align $) | N | P | P | P | P | P (P5) | P | Y | Y | Y |
| Prioritization optimizer (budget-constrained) | Y | N | N | N | N | N | N | N | N | P | P | Y |
| Business case ROI/NPV/IRR/payback | Y | N | N | N | N | N | N | N | N | P | P | Y |
| CAPEX/OPEX classification | Y | N | N | N | N | N | N | P | N | P | Y | Y |
| EVM (CPI/SPI/EAC/TCPI) | Y | N | N | N | N | N | N | N | N | P | P | Y |
| CPM critical path | Y | P | N | N | N | P | P | Y | N | Y | P | Y |
| Gantt (enterprise, deps, baselines) | Y | P | P | P | P | P | P | Y | P | Y | Y | Y |
| Resource capacity & heatmap | Y | P | P | P | P | P | P | P | N | Y | Y | Y |
| Timesheets w/ actuals cascade | Y | P | P | N | P | P | Y | P | N | Y | Y | Y |
| RAID + decisions + change mgmt | Y | P | P | P | P | P | P | P | N | P | Y | Y |
| Stage gates + evidence | Y | N | N | P | N | P | P | N | N | P | Y | Y |
| Governance rules engine (auto alerts) | Y | P | P | P | Y | P | P | N | N | P | Y | Y |
| Executive exception-first tower | Y | N | P | P | P | P | P | N | N | P | P | P |
| Board packs / scheduled reports | Y | P | P | P | P | P | P | P | P | P | Y | Y |
| AI (in-price, draft-gated) | Y | P | P (add-on) | P | P (add-on) | P (add-on) | P (add-on) | P (M365 Copilot) | P | N | P (Now Assist $$) | P |
| Monte Carlo / P80 forecasting | Y | N | N | N | N | N | N | N | N | N | N | P |
| Evidence bundles (SHA-256, tamper-evident) | Y | N | N | N | N | N | N | N | N | N | N | N |
| Say/do calibration + anomaly detection | Y | N | N | N | N | N | N | N | N | N | N | N |
| Configurable metadata layer (fields/types/naming/terminology) | Y | P | P | P | P | P | P | P | P | P | Y | Y |
| Custom objects/entities | P (metadata) | P | P | P | P | P | P | P | N | P | Y | Y |
| Workflow automation + journal | Y | Y | Y | Y | Y | Y | Y | P | P | Y | Y | Y |
| Forms / intake | Y | Y | Y | Y | Y | Y | Y | P | P | P | Y | Y |
| Universal PowerPoint export | Y (42 views) | N | N | N | N | P | P | P | N | P | P | P |
| SSO SAML/OIDC | Y | P (Guard/Ent) | P (Ent) | P (Ent) | P (Ent) | P (Ent) | P (Ent) | Y (M365) | P (Ent+) | P | Y | Y |
| SCIM provisioning | Y | P (Ent) | P (Ent) | P (Ent) | P (Ent) | P (Ent) | P (Ent) | P | P | N | Y | Y |
| MFA (TOTP, per-user) | Y | P | P | P | P | P | P | P | P | P | Y | Y |
| Audit trail on every mutation | Y | P | P | P | P | P | P | P | P | P | Y | Y |
| Self-hosted / on-prem option | **Y (ships)** | N (Cloud/DC $$) | N | N | N | N | N | P (Server retired) | N | **Y** | N | P |
| Jira integration | Y (connector catalog) | — | Y | Y | Y | Y | Y | P | Y | Y | Y | Y |
| ServiceNow integration | Y | P | P | P | P | P | P | P | N | P | — | P |
| SAP / finance integration | P (connector catalog; live-credential flip) | N | N | N | P | N | N | P | N | P | Y (estate) | Y |
| API | Y (168 routes) | Y | Y | Y | Y | Y | Y | P | Y | Y | Y | Y |
| Mobile | P (responsive web) | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y |

Honest gaps for PMCT vs Tier 2: **Mobile native apps, scale certification, SaaS-only buyers'
hosting preference, brand trust, ISV ecosystem.** These are roadmap/exception items (Part 29/33),
not hidden.

---

## PART 8 — PMCT DIFFERENTIATION (WITH LAYER TEST)

Applying the interrogation checklist + **layer test** ("does it operate across third-party
systems of record, or only within its own data?") to the 10 areas:

| # | Differentiation area | PMCT today | Best Tier-1 response | Best Tier-2 response | Layer test | Defensible? |
|---|---|---|---|---|---|---|
| 1 | Unified PMO control tower | One schema, 46 domains, one truth | Jira: fragments across products | Planview/Clarity: deep but siloed suites | Both operate mostly in their own data | **Yes** |
| 2 | Executive-first architecture | Leadership tower: exception-first, GREY honesty, traceable insights | Dashboards afterthought | Dashboards exist but per-suite | Executives still need per-tool logins | **Yes** |
| 3 | Financial intelligence | EVM + NPV/IRR/payback + CAPEX/OPEX + forecast, all computed | N | Planview deep, $$$ | ERP ≠ delivery-predictive | **Yes** |
| 4 | Portfolio optimization | Weighted criteria + budget-constrained optimizer + scenarios | N | Y (Planview) | — | Partial — must prove parity |
| 5 | Resource intelligence | Capacity + heatmap + timesheet cascade | P | Y | — | Partial |
| 6 | Enterprise reporting | 177 templates + board packs + PPT export (42 views) | P (add-ons) | Y | — | **Yes** (breadth + one-click) |
| 7 | Configurable enterprise control | Metadata layer: fields/types/naming/terminology, server-enforced | P | Y | — | Partial |
| 8 | Integration-first | 27-connector catalog, webhooks, governed CSV import, Jira/ADO/ServiceNow sync with honest CONNECTED status | Y (within ecosystem) | Y | PMCT explicitly designed to sit above 3rd-party estates | **Yes — the core** |
| 9 | AI-driven PMO | Draft-first, human-gated, labeled classes; anomaly + Monte Carlo + calibration | Y (AI everywhere, auto-ish) | Y (Now Assist $$) | PMCT's AI is governed — differentiator in regulated buyers | **Yes** (governance angle) |
| 10 | **The aggregation layer itself + self-hosted** | Designed as the layer; self-hosted single-tenant ships today; evidence bundles | N | N (except partial estate plays) | **Only PMCT says yes to both** | **Yes — the thesis** |

**Verdict — Tier 1 (Jira/ClickUp/etc.):** they will keep absorbing features, but their business
model sells seats inside their own walls; none monetizes "truth across SAP+Jira+ServiceNow".
PMCT does not compete for the same seat — it sells to a different budget (PMO/executive).

**Verdict — Tier 2 (Planview/Clarity/ServiceNow SPM):** capability parity is within reach
(Part 3 map), at 20–40% of the per-user cost, deployed in weeks not quarters, with self-hosted
option and evidence-chain auditability that none of them ship.

**DIFFERENTIATION VERDICT: SUFFICIENT** for mid-market and upper-mid enterprise (100–5,000
employees), driven by areas 1, 2, 3, 8, 10 (+ 6, 9); **PARTIAL** for global large enterprise
until SOC 2/ISO 27001, native mobile, and 5,000+ user scale evidence exist (E-1/E-2/E-8).

**Top 3 defensible differentiators:** (1) the aggregation layer + self-hosted sovereignty;
(2) financial intelligence computed from live delivery data (EVM/NPV/IRR) with tamper-evident
evidence; (3) executive exception-first tower with honest GREY discipline.

---

## PART 9 — "WHY PMCT?" VALUE PROPOSITION

**Traditional organization (status quo stack), 100 project staff [E model]:**

| Cost element | Annual |
|---|---|
| Jira Premium (100 u) | $17,448 |
| Smartsheet Business (100 u) | $22,800 |
| Power BI Pro (30 analysts) | ~$5,040 |
| PMO analysts assembling status/board packs (2 FTE) | ~$160,000 |
| Reconciliation/admin of 4+ tools (0.5 FTE) | ~$40,000 |
| Misc. (PowerPoint effort, meetings to align numbers) | ~$25,000 |
| **Status-quo glue total** | **~$270,000/yr** — producing unaudited, stale numbers |

**PMCT (Business, 100 users):** $25,200/yr + $30,000 one-time implementation + ~$5,000 self-hosted
infra = **~$60,000 in year 1, $25–30k/yr thereafter** — producing computed, audited numbers.

**Benefit model (all percentages are assumptions unless cited):** reporting effort −70–90%;
tool consolidation −2–4 licenses; decision latency weeks→same-day; overrun detection weeks
earlier via EVM/CPI (value scales with portfolio size); audit/governance compliance by default.
Even at **zero productivity benefit**, license + glue consolidation alone typically pays for
PMCT 3–5x over at mid-market pricing [E].

---

## PART 10 — CURRENT MARKET PRICING (2026, VERIFIED)

**Table 4 — 2026 Pricing Comparison** (per user/month; **A** = annual billing, **M** = monthly)

| Tool | Free | Entry paid [A] | Mid [A] | Top published [A] | Enterprise | AI pricing | Source |
|---|---|---|---|---|---|---|---|
| Jira | ≤10 users | Standard **$7.91** [V] (M: $9.05) | — | Premium **$14.54** [V] (M: $18.30) | Annual-only, **from ~$166k/yr** [V] | Included Premium+ (Atlassian Intelligence/Rovo) | atlassian.com; Tech.co 5/2026 |
| ClickUp | 5 users | Unlimited **$7** [V] (M: $10) | Business **$12** [V] (M: $19) | Business Plus / Enterprise custom | Custom | **Add-on $9–28/user** (Brain/Everything AI) [V] | clickup.com/pricing |
| Trello | Yes | Standard **$5** [V] | Premium **$10** [V] | Enterprise **$17.50** [V] | — | — | trello.com |
| Asana | ≤10 users | Starter **$10.99** [V] | Advanced **$24.99** [V] | — | Custom (est. $35–45) [R] | AI Studio metered; Copilot-era add-ons [R] | asana.com |
| Monday.com | ≤2 users | Basic **$9** [V] | Standard **$12** [V] | Pro **$19** [V] (min 3 seats) | Custom | AI add-on [R] | monday.com |
| Smartsheet | Trial | Pro **$9** [V] | — | Business **$19** [V] | Custom | Add-ons [R] | smartsheet.com; Tech.co |
| Wrike | ≤5 users | Team **$10** [V] | — | Business **$25** [V] | Enterprise/Pinnacle/Apex custom [V] | Add-on [R] | wrike.com |
| Teamwork | Yes | Starter **$9.50** [V] | Pro/Deliver **$13.99–17** [R] | Grow **$25.99–33** [R] | Scale custom | — | teamwork.com |
| Zoho Projects | ≤5 users/3 projects | Premium **$4** [V] | — | Enterprise **$9** [V] | — | — | zoho.com |
| Basecamp | Yes | — | — | **$15/user** or flat **$299/mo** unlimited [V] | — | — | basecamp.com |
| Notion | Yes | Plus **$10** | Business **$20** (AI included) [V] | — | Custom | Included Business [V] | notion.com |
| Airtable | Yes | Team **$20** [V] | — | Business **$45** [V] | Custom | Add-on credits [R] | airtable.com |
| MS Planner/Project | Planner in M365 | Planner P1 **$10** [V] | Planner+Project P3 **$30** [V] | P5 **$55** [V] | — | M365 Copilot add-on $30 [R] | microsoft.com |
| Aha! Roadmaps | No | — | Premium **$59** [V] | Enterprise **$99** / **E+ $149** [V] | — | AI add-ons [R] | aha.io |
| Celoxis | No | Cloud **~$22.50** [R] (from $10) | — | — | **On-prem ~$450/user one-time** [R] | — | celoxis.com; Capterra |
| **Planview Portfolios** | — | — | — | — | **Custom/quote** [V]; est. **$19–100+/user/mo**; AdaptiveWork est. $60–100 [R] | — | planview.com; TDPM; G2 |
| **ServiceNow SPM** | — | — | — | — | **Custom/quote** [V]; est. **$100–200+/user/mo**; avg contract ~**$130k/yr** [R] | Now Assist add-on [R] | servicenow.com; Unthread 4/2026; Desk365 |
| **Broadcom Clarity** | — | — | — | — | **Custom/quote** [V]; est. **~$60/user/mo**; ~$69k/yr baseline [R] | — | RFP.wiki; PPM Express |
| **Oracle Primavera P6 EPPM** | — | — | — | Cloud **~$125–145/user/mo** [R] | On-prem **~$2,750/user + $605/yr** [R] | — | Oracle price list (resellers); ProjectManager |
| **PMCT (proposed)** | ≤5 users read-only | Starter **$9** | Professional **$15** / Business **$21** | Enterprise **$29** or platform | **Platform from ~$75k/yr**; perpetual from **$75k one-time** [E] | **Included in price** [E] | This plan, Part 14 |

Reading of the spectrum: **$4–10** entry work management → **$10–25** advanced work management →
**$45–149** specialist (Airtable Business, Aha!) → **$60–200+ quote-only** enterprise PPM/SPM.
The gap between $25 and $60 is exactly where a portfolio control tower for the mid-market
belongs — and where PMCT prices (Part 14).

---

## PART 11 — ORGANIZATION COST SIMULATION

Annual figures, USD, using Table 4 prices; implementation estimated as % of year-1 subscription
(Tier-2 suites typically 50–150% — ServiceNow-class often ≥100%). Enterprise-tier tools marked
with estimates use **planning ranges, clearly labeled [R]**. AI add-on costs included where the
vendor charges them separately (ClickUp modeled with Brain $9/user).

**Table 5 — 25-user organization (annual)**

| Tool | Plan | Subscription | Add-ons/AI | Implementation | Y1 TCO |
|---|---|---|---|---|---|
| Jira Standard | $7.91 | $2,373 | — | $356 | $2,729 |
| Jira Premium | $14.54 | $4,362 | — | $654 | $5,016 |
| ClickUp Business | $12 | $3,600 | $2,700 | $360 | $6,660 |
| Trello Premium | $10 | $3,000 | — | $150 | $3,150 |
| Asana Advanced | $24.99 | $7,497 | — | $1,499 | $8,996 |
| Monday Pro | $19 | $5,700 | — | $1,140 | $6,840 |
| Smartsheet Business | $19 | $5,700 | — | $1,140 | $6,840 |
| Wrike Business | $25 | $7,500 | — | $1,500 | $9,000 |
| MS Planner+Project P3 | $30 | $9,000 | — | $1,350 | $10,350 |
| Aha! Premium | $59 | $17,700 | — | $2,655 | $20,355 |
| Celoxis Cloud | $22.50 | $6,750 | — | $1,688 | $8,438 |
| Planview Portfolios | est. $60 [R] | ~$18,000 | — | ~$13,500 | ~$31,500 |
| ServiceNow SPM | est. $100 [R] | ~$30,000 | — | ~$30,000 | ~$60,000 |
| Clarity | est. $60 [R] | ~$18,000 | — | ~$13,500 | ~$31,500 |
| Primavera P6 EPPM | est. $125 [R] | ~$37,500 | — | ~$28,125 | ~$65,625 |
| **PMCT Professional** | **$15** | **$4,500** | included | **$7,500** | **$12,000** |

**Table 6 — 50-user organization (annual):** same structure; headline rows — Jira Premium
$8,724 / ClickUp $13,320 (incl. AI) / Asana $17,993 / Monday $13,680 / Smartsheet $13,680 /
Wrike $18,000 / MS P3 $20,700 / Aha! $40,710 / Planview ~$63,000 / ServiceNow ~$120,000 /
Clarity ~$63,000 / Primavera ~$131,250 / **PMCT Professional $9,000 + $7,500 = $16,500**.

**Table 7 — 100-user organization (annual)**

| Tool | Subscription | Add-ons/AI | Implementation | Y1 TCO |
|---|---|---|---|---|
| Jira Standard | $9,492 | — | $1,424 | $10,916 |
| Jira Premium | $17,448 | — | $2,617 | $20,065 |
| ClickUp Business | $14,400 | $10,800 | $1,440 | $26,640 |
| Trello Premium | $12,000 | — | $600 | $12,600 |
| Asana Advanced | $29,988 | — | $5,998 | $35,986 |
| Monday Pro | $22,800 | — | $4,560 | $27,360 |
| Smartsheet Business | $22,800 | — | $4,560 | $27,360 |
| Wrike Business | $30,000 | — | $6,000 | $36,000 |
| MS Planner+Project P3 | $36,000 | — | $5,400 | $41,400 |
| Aha! Premium | $70,800 | — | $10,620 | $81,420 |
| Celoxis Cloud | $27,000 | — | $6,750 | $33,750 |
| Planview Portfolios [R] | ~$72,000 | — | ~$54,000 | ~$126,000 |
| ServiceNow SPM [R] | ~$120,000 | — | ~$120,000 | ~$240,000 |
| Clarity [R] | ~$72,000 | — | ~$54,000 | ~$126,000 |
| Primavera P6 EPPM [R] | ~$150,000 | — | ~$112,500 | ~$262,500 |
| **PMCT Business** | **$25,200** | included | **$30,000** | **$48,000** |

**Table 8 — 250-user organization (annual):** Jira Premium $43,620 / ClickUp $66,600 (incl. AI) /
Asana $89,964 / Monday $68,400 / Smartsheet $68,400 / Wrike $90,000 / MS P3 $103,500 / Aha!
$203,550 / Celoxis $84,375 / Planview ~$315,000 / ServiceNow ~$600,000 / Clarity ~$315,000 /
Primavera ~$656,250 / **PMCT Business $63,000 + $45,000 = $108,000**.

**Table 9 — 500-user organization (annual):** Jira Premium $87,240 (Enterprise tier typically
required for SSO at this scale → **~$166k+ floor**) / ClickUp $133,200 / Asana $179,928 /
Monday $136,800 / Smartsheet $136,800 / Wrike $180,000 / MS P3 $207,000 / Aha! $407,100 /
Celoxis $168,750 / Planview ~$630,000 / ServiceNow ~$1,200,000 / Clarity ~$630,000 / Primavera
~$1,312,500 / **PMCT Enterprise $126,000 + $90,000 = $216,000**.

**Table 10 — 1,000-user organization (annual):** Jira Premium $174,480 (+Align/Enterprise for
portfolio → custom) / ClickUp $266,400 / Asana $359,856 / Monday $273,600 / Smartsheet $273,600 /
Wrike $360,000 / MS P3 $414,000 / Aha! $814,200 / Celoxis $337,500 / Planview ~$1,260,000 /
ServiceNow ~$2,400,000 / Clarity ~$1,260,000 / Primavera ~$2,625,000 / **PMCT Enterprise
$348,000 seat-based, or platform license ~$220,000 negotiated + $120,000 implementation**.

**Table 11 — 5,000-user organization (annual):** all Tier-1/3 tools scale to seven figures
(Asana ~$1.8M, MS P3 ~$2.07M, ClickUp ~$1.33M incl. AI); Tier-2 quote-based planning ranges:
Planview ~$6.3M, ServiceNow ~$12M (pre-discount; enterprise discounting typically 30–50% →
realistic $4–7M), Clarity ~$6.3M, Primavera ~$13.1M. **PMCT Global platform license planning
range $450k–700k/yr + implementation** — the self-hosted option makes this economics possible.

> Every [R] row is a planning estimate, not a quote. The pattern, not the point estimates, is
> the finding: **Tier-2 PPM costs 5–15x PMCT at the same user count.**

---

## PART 12 — TOTAL COST OF OWNERSHIP

TCO = Subscription + Implementation + Configuration + Integration + Training + Administration +
**Reporting effort** + Data migration + Support + Add-ons + AI + Unused licenses.

**Table — 100-user TCO comparison, 3-year horizon [E model]:**

| Cost line (3 yr) | Jira Premium + Smartsheet + Power BI + PMO effort (status quo stack) | ServiceNow SPM [R] | Planview Portfolios [R] | **PMCT** |
|---|---|---|---|---|
| Subscription | $18k + $68k + $15k = ~$101k | ~$360k | ~$216k | $75.6k (Y1 $25.2k + Y2–3) |
| Implementation/config | ~$40k | ~$250k+ | ~$180k | $30k |
| Integration build/maintenance | ~$30k | ~$60k | ~$45k | $10k (connector catalog) |
| Training/admin | ~$20k | ~$40k | ~$30k | $12k |
| **PMO reporting effort** (the glue) | **~$480k** (2 FTE × 3 yr) | ~$120k | ~$120k | **~$60k** (0.25 FTE) |
| Data reconciliation fixes | ~$60k | ~$30k | ~$30k | ~$5k |
| **3-year TCO** | **~$730k** | **~$860k** | **~$620k** | **~$193k** |

**Findings:** (1) the status-quo stack is *not* the cheap option — reporting effort dominates;
(2) Tier-2 suites lower the glue cost but carry 5–10x subscription; (3) PMCT wins the TCO
comparison even against doing nothing, because it replaces effort, not just tools. PMCT's
self-hosted option adds a customer-controlled infrastructure line (~$3–8k/yr) that SaaS-only
competitors cannot offer at any price.

---

## PART 13 — PMCT PRICING STRATEGY

Four models analyzed:

| Model | Mechanics | Pros | Cons | Verdict |
|---|---|---|---|---|
| A — Per user | $X/user/mo | Simple; benchmark-familiar | Underprices executive value; punishes adoption that feeds the layer | Keep for ≤500 users |
| B — Org license | $X/mo up to N users | Predictable; rewards adoption | Caps expansion revenue | Retire |
| C — Enterprise platform | $X/yr unlimited users | Matches how Tier-2 is bought; high ACV | Requires sales-led motion | Adopt ≥500 users |
| D — **Hybrid (recommended)** | Platform fee + user bands above included block + role-based value metric | Monetizes the layer; protects contributor adoption | Explaining complexity | **Adopt** |

**Value-metric analysis:** seats alone misprice an executive layer (10 executives + 500
contributors). Recommended value metric: **full-price "working" seats are contributors AND
PMO/executive users alike** (simplicity), but the *plan ladder* is gated by value delivered
(portfolio optimization, financial intelligence, governance, integrations, AI included), and
above 500 users the platform fee captures organizational value while per-seat increments
shrink. Read-only viewer licenses free or nominal — viewers spread the data that deepens
switching costs.

---

## PART 14 — RECOMMENDED PMCT PRICING

Positioning: **premium-to-work-management, value-to-enterprise-PPM.** Never the cheap option.

**Table 12 — PMCT Recommended Pricing** (USD; INR at ₹88)

| | **Starter** | **Professional** | **Business** | **Enterprise** | **Enterprise Plus** |
|---|---|---|---|---|---|
| For | Small orgs (≤25 users) | Growing orgs (≤100) | Medium enterprises (≤500) | Large (≤2,000) | Strategic/global |
| Monthly (per user) | $11 | $19 | $26 | $36 | custom |
| Annual (per user/mo) | **$9** (₹792) | **$15** (₹1,320) | **$21** (₹1,848) | **$29** (₹2,552) | custom |
| Platform fee | — | — | — | optional $75k+/yr unlimited | $150k+/yr |
| Users | ≤25 | ≤100 | ≤500 | ≤2,000 | unlimited |
| Projects/portfolios | 5 / 1 | 50 / 3 | Unlimited | Unlimited | Unlimited |
| Core PPM (WBS/CPM/Gantt/EVM) | ✔ | ✔ | ✔ | ✔ | ✔ |
| Prioritization optimizer | — | ✔ | ✔ | ✔ | ✔ |
| Investment/business cases | — | ✔ | ✔ | ✔ | ✔ |
| Governance engine, gates, RAID | Basic | ✔ | ✔ | ✔ | ✔ |
| Integrity Layer (freshness, evidence bundles, Monte Carlo) | — | Read | ✔ | ✔ | ✔ |
| Reporting Center (177 templates) + PPT export | 25 templates | ✔ | ✔ | ✔ | ✔ |
| AI assistant (draft-gated) | — | ✔ | ✔ | ✔ | ✔ |
| Automations, webhooks | — | ✔ | ✔ | ✔ | ✔ |
| Integrations catalog | 3 connectors | 10 | All 27 | All + custom | All + custom dev |
| SSO (SAML/OIDC) | — | ✔ | ✔ | ✔ | ✔ |
| SCIM + MFA enforcement | — | — | ✔ | ✔ | ✔ |
| Self-hosted deployment | — | — | ✔ | ✔ | ✔ (+air-gapped) |
| Admin metadata center (custom fields/types/terminology) | — | ✔ | ✔ | ✔ | ✔ |
| Support | Community | Business hours | Business hours, 8×5 | 24×5, SLA 99.5% | 24×7, SLA 99.9%, named CSM |
| API | ✔ | ✔ | ✔ | ✔ + sandbox | ✔ + rate-limit lift |
| Storage (self-hosted = customer-controlled) | 5 GB | 25 GB | 100 GB | Custom | Custom |

Annual-prepaid discount: 25% off monthly rates (built into the table). Design note: PMCT
includes AI in the plan price (competitors charge $9–28/user add-ons [V]) and includes SSO at
Professional (competitors gate it to Enterprise [V]) — two deliberate "included" anchors that
reprice the comparison.

---

## PART 15 — ONE-TIME LICENSE / PERPETUAL SALE

PMCT ships self-hosted today (Docker/bare-metal, single-tenant, one-file DB) — perpetual
licensing is genuinely shippable. Includes: **binary/application license, private-cloud or
on-prem deployment, dedicated database, 12 months of upgrades and support; source code only in
Global/sovereign deals under escrow**; annual maintenance **18–20%** from year 2 (support +
upgrade rights).

**Table — Recommended perpetual pricing [E]**

| Edition | Scale | One-time license | Implementation | Maintenance (Y2+) |
|---|---|---|---|---|
| Small Enterprise | ≤100 users | **$75,000** (₹66 L) | $7.5–30k | 18% /yr |
| Mid Enterprise | ≤500 | **$150,000** (₹1.32 Cr) | $30–90k | 18–20% /yr |
| Large Enterprise | ≤2,000 | **$300,000** (₹2.64 Cr) | $90–150k | 20% /yr |
| Global Enterprise | 2,000+ / sovereign | **$500,000–900,000** | $200k+ | 20% /yr |

Anchor check: Celoxis on-prem ≈ $450/user one-time [V] → 500 users ≈ $225k; PMCT's mid-enterprise
$150k undercuts the only published on-prem PPM benchmark while including governance/financial
depth Celoxis lacks. Rationale: perpetual price ≈ 2.5–4x annual SaaS value at plan rates —
attractive to cash-rich, cloud-averse buyers (governments, banks, DPDP/sovereignty-driven)
without cannibalizing SaaS (maintenance ensures 90%+ of lifetime value still accrues).

---

## PART 16 — ENTERPRISE DEAL EXAMPLES

Assumption: organization keeps Jira (coexistence) and kills Smartsheet/BI/status glue. Glue
layer est.: $160k base + $900/user/yr [E]. PMCT plan: $21/user (≤500), $29 (>500).

**Table 20 — Enterprise Deal Examples (annual, USD)**

| Users | Jira Premium | ClickUp | Asana Adv. | Monday Pro | Smartsheet | Status-quo glue [E] | **PMCT** | **PMCT coexistence saving (vs Jira+glue)** |
|---|---|---|---|---|---|---|---|---|
| 100 | $17,448 | $14,400 | $29,988 | $22,800 | $22,800 | ~$250,000 | **$25,200** | **~$242,000 (−83%)** |
| 250 | $43,620 | $36,000 | $74,970 | $57,000 | $57,000 | ~$385,000 | **$63,000** | **~$366,000 (−80%)** |
| 500 | $87,240 | $72,000 | $149,940 | $114,000 | $114,000 | ~$610,000 | **$126,000** | **~$571,000 (−78%)** |
| 1,000 | $174,480 | $144,000 | $299,880 | $228,000 | $228,000 | ~$1,060,000 | **$348,000** | **~$886,000 (−68%)** |

Plus unquantified but real: reporting latency weeks→same-day; overruns detected via EVM weeks
earlier; audit evidence automatic. In INR (₹88): the 250-user saving ≈ ₹3.2 crore/year.

---

## PART 17 — PMCT REVENUE MODEL (PLANNING SCENARIOS — NOT FORECASTS)

Assumptions [E]: Y1 churn ≈ 0 (immature base); SMB/mid customers join at month start; blended
price/user/mo — Conservative $12 (Starter/Professional mix), Base $15, Aggressive $19 (mix
shifts up-market); avg users/customer — 35 / 60 / 90; one-time onboarding — $2,000 / $6,000 /
$10,000 per SMB customer; enterprise platform deals listed separately in the tables. Label:
**planning scenarios based on stated assumptions; no guarantee of customer acquisition**.

## PART 18 — YEAR-1 REVENUE SIMULATION (12-MONTH TABLES)

**Table 14 — Conservative (12 customers, SMB only)**

| Month | New | Total | Avg Users | Paid Users | Avg Rev/Cust | MRR | New ARR | Cum ARR | One-time | Monthly Rev | Cum Rev |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 1 | 1 | 35 | 35 | $420 | $420 | $5,040 | $5,040 | $2,000 | $2,420 | $2,420 |
| 2 | 1 | 2 | 35 | 70 | $420 | $840 | $5,040 | $10,080 | $2,000 | $2,840 | $5,260 |
| 3 | 1 | 3 | 35 | 105 | $420 | $1,260 | $5,040 | $15,120 | $2,000 | $3,260 | $8,520 |
| 4 | 1 | 4 | 35 | 140 | $420 | $1,680 | $5,040 | $20,160 | $2,000 | $3,680 | $12,200 |
| 5 | 1 | 5 | 35 | 175 | $420 | $2,100 | $5,040 | $25,200 | $2,000 | $4,100 | $16,300 |
| 6 | 1 | 6 | 35 | 210 | $420 | $2,520 | $5,040 | $30,240 | $2,000 | $4,520 | $20,820 |
| 7 | 1 | 7 | 35 | 245 | $420 | $2,940 | $5,040 | $35,280 | $2,000 | $4,940 | $25,760 |
| 8 | 1 | 8 | 35 | 280 | $420 | $3,360 | $5,040 | $40,320 | $2,000 | $5,360 | $31,120 |
| 9 | 1 | 9 | 35 | 315 | $420 | $3,780 | $5,040 | $45,360 | $2,000 | $5,780 | $36,900 |
| 10 | 1 | 10 | 35 | 350 | $420 | $4,200 | $5,040 | $50,400 | $2,000 | $6,200 | $43,100 |
| 11 | 1 | 11 | 35 | 385 | $420 | $4,620 | $5,040 | $55,440 | $2,000 | $6,620 | $49,720 |
| 12 | 1 | 12 | 35 | 420 | $420 | $5,040 | $5,040 | **$60,480** | $2,000 | $7,040 | **$56,760** |

**Table 15 — Base (34 SMB/mid + 1 enterprise platform deal M10)**

| Month | New | Total | Avg Users | Paid Users | Avg Rev/Cust | MRR | New ARR | Cum ARR | One-time | Monthly Rev | Cum Rev |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 1 | 1 | 60 | 60 | $900 | $900 | $10,800 | $10,800 | $6,000 | $6,900 | $6,900 |
| 2 | 2 | 3 | 60 | 180 | $900 | $2,700 | $21,600 | $32,400 | $12,000 | $14,700 | $21,600 |
| 3 | 2 | 5 | 60 | 300 | $900 | $4,500 | $21,600 | $54,000 | $12,000 | $16,500 | $38,100 |
| 4 | 3 | 8 | 60 | 480 | $900 | $7,200 | $32,400 | $86,400 | $18,000 | $25,200 | $63,300 |
| 5 | 3 | 11 | 60 | 660 | $900 | $9,900 | $32,400 | $118,800 | $18,000 | $27,900 | $91,200 |
| 6 | 3 | 14 | 60 | 840 | $900 | $12,600 | $32,400 | $151,200 | $18,000 | $30,600 | $121,800 |
| 7 | 3 | 17 | 60 | 1,020 | $900 | $15,300 | $32,400 | $183,600 | $18,000 | $33,300 | $155,100 |
| 8 | 4 | 21 | 60 | 1,260 | $900 | $18,900 | $43,200 | $226,800 | $24,000 | $42,900 | $198,000 |
| 9 | 4 | 25 | 60 | 1,500 | $900 | $22,500 | $43,200 | $270,000 | $24,000 | $46,500 | $244,500 |
| 10 | 3 + 1 ent | 29 | 60 | 2,180 | $1,145 | $33,200 | $128,400 | $398,400 | $93,000 | $126,200 | $370,700 |
| 11 | 3 | 32 | 60 | 2,360 | $1,122 | $35,900 | $32,400 | $430,800 | $18,000 | $53,900 | $424,600 |
| 12 | 3 | 35 | 60 | 2,540 | $1,103 | $38,600 | $32,400 | **$463,200** | $18,000 | $56,600 | **$481,200** |

*(M10 enterprise deal: $96,000/yr platform ARR + $75,000 implementation.)*

**Table 16 — Aggressive (54 SMB/mid + 2 enterprise platform deals M6, M11)**

| Month | New | Total | Avg Users | Paid Users | Avg Rev/Cust | MRR | New ARR | Cum ARR | One-time | Monthly Rev | Cum Rev |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 2 | 2 | 90 | 180 | $1,710 | $3,420 | $41,040 | $41,040 | $20,000 | $23,420 | $23,420 |
| 2 | 3 | 5 | 90 | 450 | $1,710 | $8,550 | $61,560 | $102,600 | $30,000 | $38,550 | $61,970 |
| 3 | 3 | 8 | 90 | 720 | $1,710 | $13,680 | $61,560 | $164,160 | $30,000 | $43,680 | $105,650 |
| 4 | 4 | 12 | 90 | 1,080 | $1,710 | $20,520 | $82,080 | $246,240 | $40,000 | $60,520 | $166,170 |
| 5 | 5 | 17 | 90 | 1,530 | $1,710 | $29,070 | $102,600 | $348,840 | $50,000 | $79,070 | $245,240 |
| 6 | 5 + 1 ent | 23 | 90 | 2,680 | $2,070 | $47,620 | $222,600 | $571,440 | $140,000 | $187,620 | $432,860 |
| 7 | 5 | 28 | 90 | 3,130 | $2,006 | $56,170 | $102,600 | $674,040 | $50,000 | $106,170 | $539,030 |
| 8 | 6 | 34 | 90 | 3,670 | $1,954 | $66,430 | $123,120 | $797,160 | $60,000 | $126,430 | $665,460 |
| 9 | 6 | 40 | 90 | 4,210 | $1,917 | $76,690 | $123,120 | $920,280 | $60,000 | $136,690 | $802,150 |
| 10 | 6 | 46 | 90 | 4,750 | $1,890 | $86,950 | $123,120 | $1,043,400 | $60,000 | $146,950 | $949,100 |
| 11 | 5 + 1 ent | 52 | 90 | 6,100 | $2,077 | $108,000 | $252,600 | $1,296,000 | $160,000 | $268,000 | $1,217,100 |
| 12 | 4 | 56 | 90 | 6,460 | $2,051 | $114,840 | $82,080 | **$1,378,080** | $40,000 | $154,840 | **$1,371,940** |

*(Enterprise deals: M6 $120k ARR + $90k impl; M11 $150k ARR + $110k impl.)*

**Table 13 — SaaS Revenue Model summary (Year 1 exit)**

| Scenario | Customers | Paid users | Exit MRR | Exit ARR run-rate | One-time Y1 | Total Y1 revenue |
|---|---|---|---|---|---|---|
| Conservative | 12 | 420 | $5,040 | $60,480 | $24,000 | **$56,760** |
| Base | 35 | 2,540 | $38,600 | $463,200 | $287,000 | **$481,200** |
| Aggressive | 56 | 6,460 | $114,840 | $1,378,080 | $500,000 | **$1,371,940** |

## PART 19 — CUSTOMER SEGMENT REVENUE (steady-state illustrative mix [E])

| Segment | Typical ACV | Customers (steady state) | ARR contribution |
|---|---|---|---|
| SMB (Starter/Professional) | $6,500 | 600 | $3.9M |
| Mid-Market (Business) | $25,000 | 220 | $5.5M |
| Enterprise (platform) | $100,000 | 28 | $2.8M |
| Global Enterprise (Enterprise Plus) | $280,000 | 5 | $1.4M |
| **Blended** | **ARPU $15,944/customer** | **853** | **$13.6M** |

Blended ARPU ≈ $16k/customer confirms the platform-plus-seats architecture: the same 853-customer
count at pure Starter pricing would yield ~$3.5M — the up-market ladder nearly quadruples ARPU.

## PART 20 — ONE-TIME LICENSE REVENUE (alternative model [E])

5 enterprise perpetual customers in Year 1 (Mid ×2, Large ×2, Global ×1): license $150k+$150k+
$300k+$300k+$600k = **$1.5M**; implementation (avg $90k ×5) = **$450k**; integration/training
~**$125k**; support (year 1 included) — total **~$2.08M Year-1 cash**; maintenance from Y2
(18–20% of license = **$270–300k/yr recurring**). Comparison: ~4.3x the Base-case SaaS year-1
revenue with 5 deals instead of 35 — but lower multiple on exit (Part 21).

## PART 21 — SaaS vs PERPETUAL BUSINESS MODEL

| Dimension | SaaS | Perpetual | PMCT read |
|---|---|---|---|
| Initial revenue | Low | **High** | Perpetual smooths Y1 cash |
| Recurring quality | **High (ARR multiple 4–8x)** | Maintenance only (18–20%) | SaaS compounds |
| Cash flow | Ramped | **Upfront** | Mix per deal |
| Scalability | **High** | Services-constrained | — |
| Enterprise procurement | Friction (security, vendor review) | **Familiar** | Perpetual unlocks sovereign/bank buyers |
| Valuation implication | **4–8x ARR + growth** | 1–3x revenue | SaaS is the equity story |
| Predictability | **High (NRR)** | Re-buy cycles | — |
| Long-term revenue | Expansion + NRR | Maintenance ceiling | — |

**Recommendation:** SaaS-led company with a **perpetual/sovereign lane** (target ≤20% of new
bookings) for regulated/air-gapped/DPDP-driven buyers; hybrid deals (platform fee + implementation)
are the enterprise bridge. Both models ship from the same codebase — no fork, no margin dilution.

---

## PART 22 — UNIT ECONOMICS [E — assumptions stated]

| Metric | Conservative | Base | Aggressive |
|---|---|---|---|
| Blended ACV (per customer/yr) | $5,040 | $10,800 | $20,520 |
| Gross margin | 85% | 85% | 85% |
| Annual churn (assumption) | 10% | 12% | 15% |
| **LTV** (ACV×GM÷churn) | $42,840 | $76,500 | $116,280 |
| CAC — founder-led/lean [E] | $2,200 | $4,500 | $7,000 |
| CAC — fully-loaded with enterprise sales [E] | — | $15,000 | $25,000 |
| **LTV:CAC (lean / loaded)** | 19.5 / — | **17.0 / 5.1** | 16.6 / 4.7 |
| CAC payback (loaded) | — | ~10.5 mo | ~8.7 mo |
| NRR assumption (expansion: users + tier ladder) | 100% | 105–115% | 120%+ |

Honesty note: the lean-CAC ratios (16–19x) are a founder-led-sales artifact, not a steady state;
the loaded view (≈5x) is the planning number. Both beat the SaaS viability bar (LTV:CAC ≥ 3,
payback ≤ 18 months).

---

## PART 23 — BREAK-EVEN ANALYSIS [E]

Operating cost assumptions (monthly, fully loaded): Conservative $38k (4 engineers, founder-led
sales, minimal stack); Base $65k (7 engineering/PM, 2 sales/CS, marketing, cloud, AI API,
legal/admin); Aggressive $110k (12 engineering, 4 sales/CS, partner program, security audits).
Contribution margin per customer = ACV × 85%.

**Table 19 — Break-Even**

| | Conservative | Base | Aggressive |
|---|---|---|---|
| Monthly burn | $38,000 | $65,000 | $110,000 |
| Annual fixed cost | $456,000 | $780,000 | $1,320,000 |
| Contribution margin/customer | $4,284 | $9,180 | $17,442 |
| **Break-even customers** | **107** | **85** | **76** |
| **Break-even ARR** | **$539,280** | **$918,000** | **$1,559,520** |
| Year-1 exit ARR (from Part 18) | $60,480 | $463,200 | $1,378,080 |
| Distance to break-even at Y1 exit | −89% | −50% | −12% |

Read: Base reaches ~50% of break-even within Year 1; Aggressive is nearly break-even on an ARR
basis by month 12 (helped by one-time services; EBITDA-positive Year 1 including services).
Conservative requires either a cost reset or a deliberate shift up-market — the strategy
conclusion (Part 36) follows directly.

## PART 24 — 3-YEAR BUSINESS MODEL [E — planning assumptions, not forecasts]

Method: Y1 revenue = 12-month simulation (Part 18, incl. one-time services). Y2/Y3 = retained
ARR (85% GRR) + new ARR added mid-year at half-weight + one-time services. Costs scale with
hiring plan.

**Table 18 — 3-Year Model**

| | Conservative | Base | Aggressive |
|---|---|---|---|
| **Year 1** — customers / ARR / revenue / EBITDA | 12 / $60k / $57k / **−$399k** | 35 / $463k / $481k / **−$299k** | 56 / $1,378k / $1,372k / **+$52k** |
| **Year 2** — customers / ARR / revenue / EBITDA | 30 / $151k / ~$133k / **−$507k** | 85 / $1,033k / ~$1,044k / **−$206k** | 145 / $2,313k / ~$2,970k / **+$1,020k** |
| **Year 3** — customers / ARR / revenue / EBITDA | 55 / $297k / ~$242k / **−$578k** | 150 / $1,807k / ~$1,666k / **−$84k** | 240 / $4,000k / ~$3,890k / **+$1,290k** |
| **Cumulative cash requirement** | **~$1.48M** | **~$0.59M** | **cash-positive from Y1** |
| Break-even point | Not reached in 3 yr | Early Year 4 | Inside Year 1–2 |

## PART 25 — MARKET POSITIONING

| Option | Strength | Weakness | Verdict |
|---|---|---|---|
| "PMO Control Tower" | Familiar to PMO buyers | Narrow; sounds like a PMO tool, not a C-level platform | Good subtitle |
| "Enterprise Project Control Tower" | Clear, credible | "Project" undersells portfolio/financial depth | Acceptable |
| **"The Control-Tower Layer Above the Project Ecosystem"** | **Category-defining; explains coexistence; justifies premium; matches shipped integrations + integrity stack** | Needs integration proof on day one; educates the market | **Lead narrative** |
| "Project-to-Portfolio Intelligence Platform" | Accurate | Generic; blends into BI/analytics noise | Avoid |
| "Enterprise Delivery Intelligence Platform" | Modern | "Intelligence" is AI-washed everywhere in 2026 | Avoid |
| "Unified Project, Portfolio & Resource Control Tower" | Complete | Long; feature-list energy | Tagline only |

**Recommendation:** Position as **"PM Control Tower — the Enterprise Project & Portfolio Control
Tower"**, with the layer narrative as the story told in the first five minutes of every meeting:
*your tools keep their jobs; the truth gets a home*. This positioning is credible **because**
PMCT ships the integration catalog, connector honesty discipline, and evidence bundles that the
claim requires — and it prices like infrastructure, not like a seat.

## PART 26 — SALES STRATEGY

- **Ideal customer:** 100–1,000 delivery staff, existing Jira/ADO estate, PMO + CFO pain,
  data-residency sensitivity a plus.
- **Economic buyer:** PMO Director (champion) → CIO/CFO (approvers). Team-lead buyers are the
  *users*, never the buyers — pricing and packaging must never optimize for them alone.
- **Sales process:** remote-first discovery → live demo on the prospect's own scenario data →
  **paid pilot** (4–8 weeks, fixed fee, success criteria: exception feed adopted, board pack
  generated, 2 connectors live) → security review → procurement → implementation → go-live →
  expansion (users → tiers → platform).
- **Cycle:** 4–10 weeks mid-market; 3–9 months enterprise. Negotiation anchors: multi-year
  prepay discount 10–15%; platform fee traded for 3-year commitment; perpetual only for
  sovereignty cases.
- **Contract structure:** annual subscription, auto-renew with 90-day notice; SLA from
  Enterprise tier; DPA + data-residency schedule standard.

## PART 27 — GO-TO-MARKET STRATEGY

Priority order for a layer product sold to senior buyers:

1. **Direct founder-led sales** (Y1 core): outbound to PMO Directors; PMO-community content;
   live demo discipline. Channels: LinkedIn, PMI/IPMA chapters, webinars with the Integrity
   Layer as the hook ("board numbers you can prove").
2. **Consulting partners / SIs** (Y2 accelerator): Big-4-adjacent PMO consultancies and regional
   ERP integrators (Gulf/India) earn implementation revenue; 15–20% referral fees.
3. **Cloud marketplaces** (Y2+): AWS/Azure listings mainly unlock procurement budgets, not
   discovery.
4. **Self-serve** only for Starter (free ≤5 viewers, 14-day trial, no credit card) — it feeds
   the funnel and creates land-and-expand, but is never the core motion.
5. **ABM for Tier-2 displacement:** target accounts running ServiceNow or Clarity at renewal —
   the TCO table (Part 12) is the campaign.

## PART 28 — IMPLEMENTATION PACKAGES [E]

| Package | Contents | Indicative fee | Duration |
|---|---|---|---|
| Basic | Config + admin/user training (remote) | **$7,500** | 1–2 weeks |
| Professional | Basic + data migration + 2 integrations | **$30,000** | 3–5 weeks |
| Enterprise | Professional + SSO/SCIM/MFA + governance design + reporting setup | **$90,000** | 8–12 weeks |
| Global Enterprise | Full transformation: multi-entity rollout, partner-delivered, bespoke connectors | **$200,000+** | 3–6 months |

Target: services ≈ 25–40% of first-year total contract value; margin-positive at blended
delivery rates.

## PART 29 — SECURITY & ENTERPRISE READINESS

| Capability | Status in PMCT v3.1.0 | Category |
|---|---|---|
| SSO SAML 2.0 / OIDC (Entra ID, Okta), JIT provisioning | **Shipped** | Existing |
| SCIM (RFC 7644) user/group provisioning | **Shipped** | Existing |
| MFA (TOTP + recovery codes, enforce-by-role) | **Shipped** | Existing |
| RBAC (43 permissions × 8 roles) + audit on every mutation | **Shipped** | Existing |
| JWT (HS256 12 h) + bcrypt + lockout | **Shipped** | Existing |
| Self-hosted single-tenant (Docker/bare-metal, one-file DB, backup scripts) | **Shipped** | Existing |
| Data residency (deploy in-country), air-gapped install | **Shipped by architecture** | Existing |
| Encryption in transit (TLS via nginx/Caddy) | Shipped | Existing |
| Encryption at rest (disk/DB-level) | Partial (OS/infra level) | **Required** |
| PostgreSQL migration (scale ceiling removal) | Portable schema — execution required | **Required** |
| Multi-tenancy + tenant isolation | Not built (documented exception E-1) | **Roadmap** |
| SOC 2 Type II | Not started | **Roadmap** (Y2, ~$60–120k) |
| ISO 27001 | Not started | **Roadmap** (Y2–Y3) |
| GDPR/DPDP compliance program (DPA, RoPA, retention) | Architecture-compatible; formal program required | **Required** |
| DR/HA (multi-AZ, RPO/RTO targets) | Backup/restore scripts + docs; HA execution required | **Required** |
| Penetration test (external) | Not executed | **Required before enterprise push** |
| Secrets management, vulnerability management, SAST/SCA in CI | Partial (deps pinned; formal pipeline required) | **Required** |

Honest gate: **no SOC 2, no pen-test report, no formal a11y audit yet** — budget and sequence
them in the roadmap below; do not sell Enterprise into US/EU banks before SOC 2 exists.

## PART 30 — PRODUCT ROADMAP (commercially sequenced)

| Phase | Theme | Features | Business value | Target buyer | Success criteria |
|---|---|---|---|---|---|
| **Done (v1–v3.1)** | Platform + Command Center + PPT export | 46 domains, engines, 177 reports, integrations, integrity layer | The sellable product | Mid-market PMO | Golden path 20/20; production-certified ✔ |
| **Phase A (0–3 mo)** | **Sales readiness** | Jira two-way live connector GA, SAP/Oracle-finance read connector, pen test, SOC 2 kickoff, pricing page, demo dataset | Removes top 3 sales objections | First 20 customers | 2 connectors demo-able in <1 day |
| **Phase B (3–9 mo)** | **Layer proof** | SAP + HR + Finance connectors, Teams/Slack distribution of the tower, PostgreSQL, SOC 2 Type I→II | Earns the "layer" claim technically | 100–500-user deals | 50% of new deals with ≥2 live connectors |
| **Phase C (9–18 mo)** | **Enterprise readiness** | Multi-tenancy (E-1), native mobile, scale execution (E-2), ISO 27001 start, a11y audit (E-8) | Unlocks 5,000+ user and SaaS-only buyers | Large enterprise, partners | 1 global-enterprise deployment |
| **Phase D (18–36 mo)** | **AI PMO + industry templates** | Generative status narratives (governed), meeting assistant, portfolio scenario AI, industry templates on metadata layer (E-7) | ARPU expansion; defense against incumbents | Installed base | NRR ≥ 115% |

## PART 31 — SWOT

**Strengths (current):** breadth already shipped (46 domains; CPM/EVM/Monte Carlo; 177 reports;
PPT export); integrity/auditability as architecture, not add-on; self-hosted option; lean cost
base; the layer thesis with connectors and honest status discipline.
**Potential strengths:** financial-intelligence depth vs Tier 1; price/performance vs Tier 2;
India/Gulf wedge with DPDP/sovereignty demand.
**Weaknesses (current):** no brand/trust signals; no SOC 2/ISO/pen-test; single-tenant SQLite
scale ceiling; no native mobile; small team = delivery capacity risk; features outpaced by
incumbent marketing spend.
**Opportunities:** mid-market gap between $25 and $60/user; glue-layer consolidation spend;
DPDP/sovereignty-driven deployments; partner channel; Atlassian/ServiceNow pricing pressure
pushing buyers to look.
**Threats:** Atlassian/ServiceNow extending upward into their estates; Planview moving
down-market; AI dashboards commoditizing "insight"; buyer inertia ("Jira is fine"); a two-person
sales motion missing quarters.

## PART 32 — COMPETITIVE MOAT

| Candidate | Real moat? | Why |
|---|---|---|
| Aggregated cross-system data model | **Yes — strongest** | Compounds with every connector and customer; incumbents' data is walled |
| Integration ecosystem (27 connectors, webhooks, honest status) | **Yes** | Time and trust to replicate; grows with Phase B |
| Evidence/freshness/governance chain (SHA-256, audit, gates) | **Yes** | Rare, hard to retrofit, decisive in regulated sales |
| Financial engine (EVM/NPV/IRR computed live) | Partial | Replicable math; moat only when fed by live delivery data |
| Metadata-driven configuration | Partial | Adoption lock-in grows with configured fields/terminology |
| Workflow/automation engine | Weak alone | Table stakes |
| Reporting library (177) | Weak alone | Copiable; matters in aggregate UX |
| AI layer | Emerging | Governance-gated AI is differentiating in regulated buyers; raw models are not |
| Switching costs | **Yes (over time)** | Configured metadata + connectors + historical evidence = rising exit cost |
| Brand/trust | **To build** | The honest gap — SOC 2 + reference logos are the moat purchase |

Easily replicated by incumbents: individual features, dashboards, AI summaries, Gantt. Not
easily replicated: **the layer position itself** — it would require them to cooperate with
competitors' systems of record, against their commercial interest.

## PART 33 — KEY RISKS & MITIGATIONS

| Risk | Severity | Mitigation |
|---|---|---|
| Incumbents extend upward (Atlassian/ServiceNow) | High | Stay the neutral layer; integrate deeply with them (co-option beats confrontation); win on neutrality + self-hosted |
| No certifications blocks enterprise pipeline | High | Phase A/B security budget ($100–200k); don't chase certifications before pipeline justifies |
| SQLite scale ceiling exposed in deal | Medium | PostgreSQL migration in Phase B; be honest per E-2 |
| Sales capacity (founder-led ceiling) | High | Hire 2 enterprise AEs at first $30k MRR; partner channel Phase B |
| Long enterprise cycles starve cash | High | Land SMB/mid for cash flow; services revenue; perpetual lane |
| Feature-copying by ClickUp/monday | Medium | Compete on depth + governance, not features; publish integrity moat |
| AI expectations exceed governed scope | Medium | Sell the governance as the answer, not the gap |
| Data migration failures damage trust | Medium | Governed dry-run import (already shipped); migration rehearsals |
| Key-person dependency | High | Documentation suite (ships today), hiring plan, escrow for perpetual deals |
| Currency/FX (INR pricing) | Low | Price in USD; INR indicative |

## PART 34 — MANAGEMENT KPI DASHBOARD

| Category | KPIs |
|---|---|
| Product | MAU/seat ≥ 60%; exception-feed adoption; connectors live per customer (target ≥2); reports auto-generated per month; time-to-first-board-pack < 1 week |
| SaaS | MRR, ARR, ARPU, GRR ≥ 85%, NRR ≥ 105%, churn ≤ 12%, GM ≥ 85%, LTV:CAC ≥ 3 (loaded CAC) |
| Sales | Pipeline coverage ≥ 3x; demo→pilot ≥ 40%; pilot→paid ≥ 60%; win rate ≥ 25% (mid-market); cycle ≤ 8 weeks mid / ≤ 2 quarters ent; ACV by tier |
| Customer | NPS ≥ 40; time-to-value ≤ 30 days; support tickets/customer ≤ 1/mo; logo retention ≥ 88% |
| Financial | Revenue vs plan; burn multiple ≤ 2; runway ≥ 18 mo; EBITDA trajectory (Part 24) |

## PART 35 — INVESTOR / MANAGEMENT SUMMARY

- **What:** PMCT is the Enterprise Project & Portfolio Control Tower — the layer above Jira,
  ServiceNow, SAP, HR and Finance that gives CEO/CFO/CTO/PMO computed, auditable, real-time
  portfolio intelligence.
- **Problem:** leadership steers portfolios on hand-built, stale, unaudited summaries; the glue
  layer costs more than the tools it stitches.
- **Buyer:** PMO Director champions; CFO/CIO approve; mid-market and upper-mid enterprise
  (100–5,000 staff) first.
- **Why they pay:** consolidation of glue spend (3–5x PMCT's price), decision speed, audit
  evidence, data residency — value-based pricing between work management and enterprise PPM.
- **Market:** PPM software $6.8–9.8B (2026) growing 10–13% CAGR to $10–18B by 2030–31 [V].
- **Competition:** Tier-1 tools can't leave their walls; Tier-2 suites cost 5–15x and take
  quarters to deploy; Tier-3 hybrids lack depth.
- **Differentiation verdict: SUFFICIENT** (mid-market/upper-mid) on the combination: portfolio
  optimization + financial intelligence + governance + executive reporting + integrations +
  self-hosted + integrity chain. **PARTIAL** for global enterprise until certifications/scale.
- **Pricing:** $9/15/21/29 per user tiers + platform ≥$75k/yr + perpetual $75k–900k; AI and SSO
  included where competitors charge extra.
- **Year 1 (base planning scenario):** 35 customers, ~2,540 paid users, $463k exit ARR, $481k
  revenue; conservative $57k; aggressive $1.37M. **No guarantees — planning scenarios.**
- **Investment required:** ~$0.6–0.8M cumulative cash to break-even (base), concentrated in
  engineering + security certifications + 2 sales hires.
- **Biggest risks:** incumbent response, certification gate, sales capacity.
- **Next 90 days:** GA the Jira live connector; run 10 paid pilots; publish pricing; start SOC 2
  + pen test; close first 5 reference logos.

## PART 36 — FINAL RECOMMENDATION

1. **Product strategy:** sell what ships (v3.1.0), and spend the next two quarters on the three
   things sales needs: live Jira connector GA, SAP/Finance read connectors, and security
   certification. Everything else waits.
2. **Pricing:** **$9 / $15 / $21 / $29 per user/month (annual)** for Starter/Professional/
   Business/Enterprise; platform fee from $75k/yr above 500 users; AI and SSO always included.
   Annual-prepay 25% discount. Do not discount below Professional for the mid-market — the
   price point is the positioning.
3. **Enterprise strategy:** platform deals **$75k–250k/yr** (2,000-user ceiling until Phase C),
   3-year prepay discount 10–15%, implementation bundled.
4. **Perpetual license:** **$75k–900k one-time** by size class + 18–20% maintenance; reserved
   for sovereignty/regulated buyers; ≤20% of bookings.
5. **Implementation:** **$7.5k / $30k / $90k / $200k+** packages; target 25–40% of first-year
   TCV; partner-delivered at the top end.
6. **Support:** included business-hours; **$8–12%/yr premium support** for subscription;
   maintenance carries it for perpetual.
7. **Go-to-market:** founder-led direct sales to PMO Directors in India + Gulf first (100–500
   delivery staff, Jira estates, residency-sensitive), paid pilots as the standard wedge,
   partner channel from month 6.
8. **Year 1 targets:** Conservative — 12 customers / $57k revenue (validate); Base — 35
   customers / $481k revenue / $463k exit ARR (plan); Aggressive — 56 customers / $1.37M
   revenue incl. 2 platform deals (stretch). **These are planning scenarios, not commitments.**
   The conservative scenario is not viable as-is: if pipeline lags base by month 6, cut costs
   and move up-market rather than burning through the cash plan.

**The one-sentence commercial thesis:** organizations already pay 3–5x PMCT's price for the
broken glue layer between their project tools and their executives — PMCT replaces that glue
with a governed, self-hostable control tower, priced as the layer it is.

---

## TABLE INDEX (as required)

T1 Capability map (Part 3) · T2 20-competitor comparison (Part 6) · T3 Feature matrix (Part 7) ·
T4 2026 pricing comparison (Part 10) · T5–T11 organization costs 25/50/100/250/500/1,000/5,000
(Part 11) · T12 recommended pricing (Part 14) · T13 SaaS revenue model (Part 18) · T14–T16
12-month scenarios (Part 18) · T17 SaaS vs perpetual (Part 21) · T18 3-year model (Part 24) ·
T19 break-even (Part 23) · T20 enterprise deals (Part 16) · T21 category & tier map (Part 6,
Tier column + layer-test column) · T22 coexistence vs replacement (Parts 8/16 — verdict:
coexistence-first; replacement triggers: multi-entity consolidation, ServiceNow renewal events,
CFO mandate) · T23 differentiation scorecard (Part 8).

## SOURCES (market & pricing claims)

- Atlassian/Jira pricing — atlassian.com (Standard $7.91, Premium $14.54; Enterprise from ~$166k/yr) [V]
- ClickUp — clickup.com/pricing (Unlimited $7, Business $12; AI add-ons $9–28) [V]
- Trello — trello.com (Standard $5, Premium $10, Enterprise $17.50) [V]
- Asana — asana.com (Starter $10.99, Advanced $24.99; Enterprise est. $35–45 [R]) [V/R]
- monday.com — monday.com (Basic $9, Standard $12, Pro $19) [V]
- Smartsheet — smartsheet.com; Tech.co (Pro $9, Business $19) [V]
- Wrike — wrike.com (Team $10, Business $25; Enterprise/Pinnacle custom) [V]
- Teamwork — teamwork.com (Starter $9.50; Pro/Deliver, Grow tiers [R]) [V/R]
- Zoho Projects — zoho.com (Premium $4, Enterprise $9) [V]
- Basecamp — basecamp.com ($15/user or $299/mo flat) [V]
- Notion — notion.com (Plus $10, Business $20 incl. AI) [V]
- Airtable — airtable.com (Team $20, Business $45) [V]
- Microsoft Planner/Project — microsoft.com (P1 $10, P3 $30, P5 $55; Project 2024 perpetual $679.99/$1,129.99) [V]
- Aha! Roadmaps — aha.io; TrustRadius (Premium $59, Enterprise $99, E+ $149) [V]
- Celoxis — celoxis.com; Capterra; Research.com (Cloud ~$22.50; on-prem ~$450/user) [R]
- Planview — planview.com (quote-only); The Digital Project Manager; G2; SoftwareFinder (est. $19–100+/user/mo; AdaptiveWork $60–100) [R]
- ServiceNow SPM — servicenow.com (quote-only); Unthread 4/2026; Desk365; Kanini (est. $70–200+/user/mo; avg contract ~$130k/yr) [R]
- Broadcom Clarity — Broadcom TechDocs (license types; quote-only); RFP.wiki; PPM Express (est. ~$60/user/mo; ~$69k/yr baseline) [R]
- Oracle Primavera — Oracle Global Price List via resellers; ProjectManager.com; PSG; Taradigm (P6 EPPM cloud ~$125–145/user/mo; on-prem ~$2,750/user + $605/yr) [R]
- PPM market size — MarketsandMarkets (PPM Market 2026–2031: $9.79B → $17.75B); The Business Research Company ($6.81B 2026); IDC ($7.46B 2025, +11.5%); Fortune Business Insights; Grand View Research [V-analyst]
- Project performance context — McKinsey–Oxford large-IT-project study (45% over budget); PMI Pulse of the Profession [R, dated studies]

*All PMCT-side figures (capability claims, pricing recommendations, revenue scenarios, benefit
models) are [E] planning assumptions grounded in the shipped v3.1.0 product and documented
throughout. Nothing in this document is a guarantee of revenue, acquisition or market share.*
