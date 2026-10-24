# 04 — Architecture

## 1. Stack

| Layer | Technology |
|---|---|
| UI | Next.js 16 App Router (single visible route `/`), React 19, Tailwind CSS 4, shadcn/ui (52 components), dnd-kit (Kanban drag & drop), Recharts, Lucide, react-markdown (docs) |
| App logic | TypeScript 5, hash-based SPA router (`src/lib/router.ts`), TanStack-style `useApi` client hooks (`src/lib/client.ts`) |
| API | 167 Next.js route files under `src/app/api/**` |
| Data | Prisma ORM + SQLite (115 models, single file) |
| Realtime | Socket.IO 4 gateway (independent mini service) + event publisher |
| Security | JWT (jose, HS256, 12 h) + bcryptjs + RBAC permission catalog (43 permissions / 8 roles) |
| Runtime | Node.js ≥ 20.9 standalone server **or** Bun ≥ 1.2 |

## 2. Process topology (production)

```
                       ┌──────────────────────────────┐
 Browser ── HTTPS ──▶  │  reverse proxy (nginx/Caddy) │
                       └──────┬───────────────┬───────┘
                              │ /             │ /socket.io/
                              ▼               ▼
                    ┌───────────────┐   ┌──────────────────┐
                    │ app           │   │ realtime gateway │
                    │ Next standalone│  │ Socket.IO :3003  │
                    │ :3000         │   │ JWT-verified     │
                    └───────┬───────┘   └────────▲─────────┘
                            │ Prisma             │ POST /emit (shared secret)
                            ▼                    │
                       ┌─────────────┐           │
                       │ SQLite file │◀──────────┘ (app publishes events)
                       └─────────────┘
```

- The SPA loads once; all navigation is hash-based (`#/…`) — no server round-trips
  for view changes.
- API routes enforce authentication → RBAC → rate limiting → validation → audit
  (see `src/lib/api.ts` wrapper) before touching data.
- Business writes publish realtime events (`src/lib/realtime.ts` → gateway
  `/emit`, fire-and-forget); subscribed clients refetch. If the gateway is down,
  the data layer remains authoritative and each session still refreshes locally —
  realtime is an enhancement, never a dependency of correctness.

## 3. Computation engines (`src/lib/engines/`)

| Engine | Responsibility |
|---|---|
| `cpm.ts` | Critical Path Method: forward/backward pass over tasks + dependencies → ES/EF/LS/LF, total/free float, critical flags, project finish |
| `rollup.ts` | Rescheduling roll-ups: task/WBS/dependency changes → project dates, progress, budget actualization |
| `evm.ts` | Earned Value: PV/EV/AC → CPI, SPI, EAC, ETC, VAC, TCPI; period snapshots |
| `health.ts` | Project health model: composite score + RAG from schedule/cost/RAID/milestone signals; snapshot history |
| `governance.ts` | Threshold rules evaluation → alerts + inbox items + health recalculation |
| `timesheet.ts` | Weekly timesheet lifecycle: submit → approve/reject → lock, actuals cascade to tasks/projects/resources |
| `automations.ts` | Trigger/condition/action rules with execution journal |
| `leadership.ts` | Executive aggregation bundle: control tower KPIs (RAG + GREY honesty), exception-first feed, traceable insights, nothing-missed validation (16 checks), what-changed deltas, 30/60/90 outlook, 17 sub-reports, Leadership Pack versioning, schedule runs |

These engines are the reason the platform's numbers always agree: EVM, health,
governance and the Leadership Control Tower all read the same persisted results
computed from the same source rows.

### v3.0 module architecture (Command Center)

The v3.0 clusters (agile, omni views, commercial, field ops, strategy/knowledge,
proofing) are **lenses over the existing `Task`/`Project`/`Deliverable` core** —
no module owns a private copy of work:

- Kanban, Calendar and the Gantt all render the same `Task` rows; a status change
  from any view is immediately visible from the others (API is authoritative,
  realtime events accelerate refresh).
- A Kanban move is `PATCH /api/agile` → task status/progress → sprint points
  recomputed → CPM/EVM roll-ups see it on next read.
- Invoices/RFIs/punch items hang off `Project` (and optionally `Task`);
  proof rounds hang off `Deliverable`; feedback links to `RoadmapItem` and
  optionally `Project`.
- New realtime events: `agile:changed`, `field:changed` (typed members of the
  `RealtimeEvent` union in `src/lib/realtime.ts`).

Full module-to-data mapping and the scale-out path: `docs/COMMAND-CENTER-PRD.md` § 2.

## 4. Data model conventions

- 115 Prisma models grouped: identity/RBAC, portfolio hierarchy, planning, execution,
  control (financial/EVM/health/RAID/change/gates/governance), delivery
  (deliverables/quality/collaboration), engagement (notifications/inbox/planner),
  automation, templates, integration hub, AI gateway, audit, leadership reporting,
  **command center (agile/commercial/field/strategy/knowledge/proofing, v3.0)**.
- SQLite profile: enums modeled as `String` constants (`src/lib/constants.ts`);
  complex structures serialized to `String` JSON columns. The schema stays portable
  to PostgreSQL (see Deployment Guide § 8).
- Identifiers: Prisma `cuid()` internal ids + **human business codes** everywhere
  users work (`PRJ-ERP-001`, `RSK-…`, `DEC-101`); imports/exports upsert by business
  code.

## 5. Security architecture

1. **Authentication** — email + bcrypt password → JWT (issuer `pm-control-tower`,
   12 h expiry) delivered as `pmct_token` cookie + JSON body; socket handshake
   presents the same JWT.
2. **Authorization** — permission codes (`project.manage`, `financial.view`, …)
   checked per route in the API wrapper; `PMO_ADMIN` carries the `*` grant;
   `isSuperAdmin` bypass exists for break-glass.
3. **Rate limiting** — per-IP/user sliding window in the API wrapper.
4. **Validation** — payload validation before any write; human-readable error
   envelopes (`{success:false, error}`).
5. **Audit** — `AuditEvent` rows for every mutation, import/export and login,
   with before/after JSON and actor context.
6. **Secrets** — only via environment (`JWT_SECRET`, `REALTIME_SECRET*`); no
   secrets in code or client bundles.

## 6. Repository layout

```
src/
├── app/                    Next.js App Router
│   ├── page.tsx            the single visible page (SPA shell)
│   └── api/**              167 route files (incl. v3.0: agile, clients, invoices,
│   │                       expenses, rfis, daily-logs, punch-list, feedback,
│   │                       roadmap, docs, message-boards, proofing)
├── components/
│   ├── pmct/               platform chrome: shell (sidebar/topbar), kit (PageHeader,
│   │                       tables, KPI cards), io-buttons (Import/Export), realtime
│   └── ui/                 shadcn/ui primitives
├── views/                  70+ view modules mapped by src/views/registry.tsx
│   ├── portfolio/ plan/ execute/ control/   business modules
│   ├── clients/ field/ strategy/ knowledge/ delivery/   v3.0 modules
│   ├── intelligence/       reports, leadership (4 sections), analytics, assistant
│   ├── connect/ admin/     hub + administration
│   └── project/            13-tab project workspace
├── lib/
│   ├── engines/            the 8 computation engines
│   ├── io/                 CSV engine + import/export entity definitions (22)
│   ├── rbac.ts auth.ts api.ts audit.ts realtime.ts router.ts client.ts
│   └── constants.ts        shared enums/helpers
prisma/schema.prisma        115 models
mini-services/realtime      Socket.IO gateway (independent bun project)
scripts/                    seeds + CLIs (see Admin Guide § 7)
deploy/                     entrypoint, proxies, PM2, ops scripts, TLS
```

## 7. Build & output

`npm run build` → `next build` with `output: "standalone"` (self-contained server in
`.next/standalone/server.js`, static assets copied in) → run with `node` (or `bun`).
`outputFileTracingRoot` is pinned to the project so the standalone output is stable
regardless of where the package is unpacked.
