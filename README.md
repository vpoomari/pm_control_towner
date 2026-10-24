# PM CONTROL TOWER

**Enterprise Project, Program & Portfolio Management Platform — "The Command Center"**

Portfolio → Program → Project → WBS → Tasks → Schedule → EVM → Governance → **Leadership Reporting**
＋ Agile Delivery · Clients & Billing · Field Operations · Product Strategy · Docs & Knowledge · Proofing

PM CONTROL TOWER is a complete, self-hosted PPM platform built for enterprise PMOs and executive
leadership. Its defining capability: **leadership never needs to ask a project manager for status** —
the system continuously aggregates live operational data into decision-ready views, exception-first
feeds, traceable insights and one-click executive reporting packs.

Since v3.0 ("Command Center expansion") the same Project/Task core also powers agile sprints,
Kanban/Calendar/Workload views, product feedback & roadmap, a docs-first knowledge workspace,
client invoicing, construction field operations, and deliverable proofing — one platform, one truth,
no duplicated data (see `docs/COMMAND-CENTER-PRD.md`).

---

## Capability map

| Domain | Capabilities |
|---|---|
| **Portfolio** | Portfolios, programs, projects (owners, sponsors, phases, methodologies, RAG health, budgets), weighted prioritization optimizer with executive scenarios |
| **Plan** | Requirements, WBS tree, tasks (unlimited nesting), dependencies, **CPM schedule engine** (ES/EF/LS/LF, float, critical path), milestones, versioned baselines |
| **Agile** *(v3.0)* | Sprints (goals, windows, committed points), epics, story points, backlog grooming, drag-and-drop sprint board |
| **Boards** *(v3.0)* | Kanban (status lanes, drag & drop, cross-project), delivery Calendar (tasks + meetings), resource Workload heatmap |
| **Execute** | Resource register & capacity, assignments, weekly timesheets (submit → approve → lock cascade), work inbox, focus planner |
| **Control** | Budget lines & financials, **EVM engine** (CPI/SPI/EAC/ETC/VAC/TCPI + history), health engine with snapshots, RAID, change requests, stage gates, **governance rules engine** (auto alerts → inbox → health recalc) |
| **Field Ops** *(v3.0)* | RFIs with aging + cost/schedule impact, daily construction logs, punch list with verification chain, BIM model viewer embed |
| **Commercial** *(v3.0)* | Client register, invoices with line items (milestone/task-linked, tax + totals server-computed), expenses with approval workflow |
| **Strategy & Knowledge** *(v3.0)* | Feedback portal with feature voting + triage, quarter roadmap linked to demand, Docs workspace (spaces, markdown, search), Message Boards (announcements, standups, Q&A) |
| **Proofing** *(v3.0)* | Versioned proof rounds per deliverable, threaded annotations (page/timecode locators), approve / changes-requested workflow |
| **Intelligence** | **Executive Control Tower** (RAG + GREY honesty, exception-first feed, traceable insights, 30/60/90 outlook), **Leadership Pack** (one-click, versioned, comparable), 17 sub-reports, executive status reports, What-Changed, report schedules, analytics, AI assistant |
| **Connect** | Integration hub, webhook subscriptions with delivery log, automation rules, AI connector gateway |
| **Integrity** | Data freshness engine (honest staleness), evidence bundles (SHA-256 tamper-evident chains), seeded Monte Carlo P80 forecasting, say/do calibration, scenario sandbox (branch & merge), AI-drafted steering packs (human-gated), benefits realization |
| **Investment** | Business cases with cash-flow model, ROI/NPV/IRR/payback, best/base/worst scenarios, NPV sensitivity, governance workflow (SUBMITTED -> CFO -> APPROVED/FUNDED) |
| **Controls** | Per-project S-Curve (cost/progress/EV), planned-vs-actual, forecast completion (SPI-extrapolated, labeled) |
| **Admin Control Center** | Metadata-driven configuration: entity/field definitions, custom field types (14 base types), naming conventions, terminology dictionary, feature flags, org settings — server-side enforced |
| **Admin** | Users, roles (8 system roles / 43 permissions), PMO template library, full audit trail |
| **Data exchange** | CSV/JSON export for 22 entities; governed CSV import (dry-run validation) for 13 master-data entities |

**Footprint**: 115 data models · 167 API route files · 15 computation engines · 70+ view modules ·
52 UI components · Socket.IO realtime gateway.

---

## Quick start

### Option A — Docker Compose (recommended)

```bash
# 1. Unpack and enter
unzip pm-control-tower-1.0.0-deployable.zip && cd pm-control-tower

# 2. Configure secrets
cp .env.example .env
#   → set JWT_SECRET and REALTIME_SECRET (openssl rand -hex 32)

# 3. Build & start (app + realtime gateway + persistent DB volume)
docker compose up -d --build

# 4. Open http://<host>:3000 and log in with the reference dataset
#    (see docs/08-REFERENCE-DATA-GUIDE.md)
```

The first boot automatically creates the schema and loads the reference enterprise
dataset (empty-database detection). Data persists in the `pmct-db` volume.

### Option B — Bare metal (Linux, Node 20+)

```bash
./deploy/setup.sh              # deps → .env (generated secrets) → DB → seed → build
npm run start                  # terminal 1: app on 127.0.0.1:3000
npm run realtime:node          # terminal 2: realtime gateway on 127.0.0.1:3003
# front with deploy/nginx.conf (TLS via certbot) — or run under PM2:
pm2 start deploy/ecosystem.config.js
```

> ⚠️ **First-login checklist**: change all demo passwords (Admin → Users), keep `JWT_SECRET`
> private, enable TLS, and schedule `deploy/backup.sh`. See `docs/10-SECURITY-GUIDE.md`.

### v3.0 data & RBAC sync (existing installs)

```bash
npx prisma db push             # additive schema change (16 new models, no data loss)
npm run sync:rbac              # upsert 43 permissions × 8 role templates into a live DB
npm run seed:command-center    # optional: demo data for the new modules (idempotent)
```

---

## What's in this package

```
pm-control-tower/
├── src/                    Application source (app, views, components, engines, libs)
├── prisma/schema.prisma    Data model (82 models, SQLite)
├── scripts/                Seeds (reference + command-center datasets), CLIs (RBAC sync, password reset, …)
├── mini-services/realtime  Socket.IO gateway (independent bun project)
├── deploy/                 Entrypoint, nginx/Caddy configs, PM2, setup/backup/restore scripts, TLS
├── docs/                   Complete documentation suite (14 guides — see index below)
├── Dockerfile              Multi-stage production image
├── docker-compose.yml      Two-service deployment + optional TLS edge
├── package.json            Scripts + pinned dependencies
├── package-lock.json       npm install / npm ci (Node 20+)
├── bun.lock                Bun 1.2+ installs
├── .env.example            Environment template with explanations
├── LICENSE · CHANGELOG.md · VERSION
```

### Dependencies

Two lockfiles ship with the package so dependencies are exactly reproducible:

- **npm / Node 20+**: `npm ci` (uses `package-lock.json`)
- **Bun 1.2+**: `bun install --frozen-lockfile` (uses `bun.lock`)
- **Docker**: dependencies are installed inside the image build — nothing else needed.

For **air-gapped** environments, a companion archive
`pm-control-tower-1.0.0-dependencies-linux-x64.zip` (pre-built `node_modules`)
may be provided — unpack it in the project root instead of running an install.

---

## Documentation index

| Doc | Contents |
|---|---|
| `docs/01-DEPLOYMENT-GUIDE.md` | Docker / bare-metal / Bun / cloud deployments, env vars, TLS, upgrades |
| `docs/02-ADMIN-GUIDE.md` | Users & roles, import/export, templates, governance, integrations, audit |
| `docs/03-USER-GUIDE.md` | Module-by-module usage incl. Executive Control Tower, Leadership Pack & the v3.0 Command Center modules |
| `docs/04-ARCHITECTURE.md` | Stack, engines, realtime, security layers, repo layout |
| `docs/05-API-REFERENCE.md` | API routes grouped by domain (incl. v3.0 agile/clients/field/feedback/docs/boards/proofing) |
| `docs/06-DATA-MODEL.md` | Data models grouped by domain (incl. v3.0 Sprint/Epic/Client/Invoice/Rfi/… ) |
| `docs/07-RBAC-MATRIX.md` | Roles × permissions matrix (43 permissions) |
| `docs/08-REFERENCE-DATA-GUIDE.md` | The seeded top-organization dataset, logins, customization |
| `docs/09-OPERATIONS-RUNBOOK.md` | Backups, monitoring, upgrades, incident playbooks |
| `docs/10-SECURITY-GUIDE.md` | Authentication, authorization, hardening checklist |
| `docs/11-INTEGRITY-AND-TRUST.md` | Freshness, evidence bundles, Monte Carlo, calibration, scenarios |
| `docs/12-MASTER-PLATFORM-AUDIT.md` | Master coverage map: modules, engines, routes, models |
| `docs/13-MASTER-PROMPT-V2-MARKET-LEADER.md` | Product vision & market positioning |
| `docs/COMMAND-CENTER-PRD.md` | **v3.0 PRD**: system architecture, modular PRD, ERD, UI/UX, 40-app coverage matrix |
| `docs/TEST-PLAN.md` | Test plan & executed verification rounds |

---

## Tech stack

Next.js 16 (App Router, standalone output) · TypeScript 5 · Tailwind CSS 4 + shadcn/ui ·
Prisma ORM + SQLite (single-file, zero-admin database) · Socket.IO 4 · JWT (jose) + bcrypt ·
dnd-kit (drag & drop) · Recharts · Bun or Node 20+ runtime.

SQLite keeps the platform **self-contained and operations-light** (one file to back up);
the Prisma schema uses portable types so a PostgreSQL migration is a `provider` change
plus schema push (see `docs/01-DEPLOYMENT-GUIDE.md` § 7).
