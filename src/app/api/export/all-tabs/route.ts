// PM CONTROL TOWER — GET /api/export/all-tabs
// Extracts every tab (module) the caller may view into ONE downloadable PDF report:
// branded cover page, table of contents with page numbers, then one section per tab
// with a paginated, word-wrapped table of its full-fidelity records.
// Permission-filtered per entity (sections the caller cannot view are omitted).

import { NextResponse } from "next/server";
import { withApi, ApiError, writeAudit } from "@/lib/api";
import { hasPermission } from "@/lib/rbac";
import { ENTITIES } from "@/lib/io/entities";
import { buildPdfReport, type PdfSection } from "@/lib/pdf";

export const runtime = "nodejs";

// Tab order mirrors the sidebar navigation groups. Keys must exist in ENTITIES.
const TAB_ORDER: { group: string; key: string }[] = [
  { group: "Portfolio", key: "portfolios" },
  { group: "Portfolio", key: "programs" },
  { group: "Portfolio", key: "projects" },
  { group: "Plan", key: "requirements" },
  { group: "Plan", key: "wbs-nodes" },
  { group: "Plan", key: "tasks" },
  { group: "Plan", key: "milestones" },
  { group: "Plan", key: "baselines" },
  { group: "Execute", key: "resources" },
  { group: "Execute", key: "timesheets" },
  { group: "Execute", key: "timesheet-entries" },
  { group: "Control", key: "budget-lines" },
  { group: "Control", key: "evm-periods" },
  { group: "Control", key: "health-snapshots" },
  { group: "Control", key: "risks" },
  { group: "Control", key: "issues" },
  { group: "Control", key: "assumptions" },
  { group: "Control", key: "changes" },
  { group: "Control", key: "stage-gates" },
  { group: "Control", key: "governance-rules" },
  { group: "Control", key: "alerts" },
  { group: "Administration", key: "users" },
  { group: "Administration", key: "audit-events" },
];

const MAX_ROWS_PER_TAB = 400; // keep the PDF bounded; CSV export stays the full-fidelity path
const MAX_COLS_PER_TAB = 16;  // beyond ~16 columns a landscape page becomes unreadable

export const GET = withApi(async (ctx) => {
  const session = ctx.session;
  if (!session) throw new ApiError(401, "Authentication required");

  const sections: PdfSection[] = [];
  let skipped = 0;
  for (const tab of TAB_ORDER) {
    const def = ENTITIES[tab.key];
    if (!def) continue;
    if (!hasPermission(session, def.viewPermission)) { skipped += 1; continue; }
    try {
      const rows = await def.exportRows({ scopeAll: true });
      const total = rows.length;
      const notes: string[] = [];
      let columns = def.columns;
      if (columns.length > MAX_COLS_PER_TAB) {
        // Prefer dropping the opaque id column first; CSV export carries the full field set.
        columns = def.columns.filter((c) => c.key !== "id").slice(0, MAX_COLS_PER_TAB);
        notes.push(`Showing the first ${MAX_COLS_PER_TAB} of ${def.columns.length} fields — the tab's CSV export includes the full field set.`);
      }
      if (total > MAX_ROWS_PER_TAB) {
        notes.push(`Showing the first ${MAX_ROWS_PER_TAB} of ${total.toLocaleString("en-US")} records — use the tab's CSV export for the full dataset.`);
      }
      sections.push({
        group: tab.group,
        label: def.label,
        columns,
        rows: rows.slice(0, MAX_ROWS_PER_TAB),
        note: notes.join(" ") || undefined,
      });
    } catch {
      sections.push({
        group: tab.group, label: def.label, columns: [], rows: [],
        note: "This tab could not be exported right now — try again or export it individually.",
      });
    }
  }

  if (!sections.length) throw new ApiError(403, "You do not have permission to view any tabs");

  const stamp = new Date();
  const pdf = buildPdfReport({
    title: "All Tabs — Workspace Export",
    subtitle: "Every permitted module in one report: portfolios, planning, delivery, controls and administration data",
    generatedBy: session.name,
    generatedAt: stamp,
    sections,
  });

  void writeAudit({
    userId: session.id, userName: session.name, role: session.roles?.[0] ?? null,
    action: "EXPORT", entityType: "all-tabs", entityId: null, entityName: "All Tabs (PDF)",
    context: `${sections.length} sections, ${sections.reduce((a, s) => a + s.rows.length, 0)} rows${skipped ? `, ${skipped} tabs skipped (permissions)` : ""}`,
    severity: "INFO",
    ipAddress: ctx.ip, userAgent: ctx.req.headers.get("user-agent"),
  });

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="pmct-all-tabs-${stamp.toISOString().slice(0, 10)}.pdf"`,
      "X-Section-Count": String(sections.length),
    },
  });
}, { rateLimit: { limit: 5, windowMs: 60_000 } });
