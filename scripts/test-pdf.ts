// Dev-only: build a sample all-tabs PDF to verify the generator (run: npx tsx scripts/test-pdf.ts)
import { writeFileSync } from "node:fs";
import { buildPdfReport } from "../src/lib/pdf";

const rows = (n: number, mk: (i: number) => Record<string, unknown>) => Array.from({ length: n }, (_, i) => mk(i + 1));

const sections = [
  {
    group: "Portfolio", label: "Portfolios",
    columns: [
      { key: "code", label: "Code" }, { key: "name", label: "Name" },
      { key: "owner", label: "Owner" }, { key: "status", label: "Status" },
      { key: "budget", label: "Budget (USD)" }, { key: "notes", label: "Strategic Notes" },
    ],
    rows: rows(14, (i) => ({
      code: `PF-0${i}`, name: `Digital Transformation Wave ${i}`,
      owner: i % 2 ? "Amira Haddad" : "Vincent Poomari", status: i % 3 ? "Active" : "On Hold",
      budget: 2500000 + i * 175000, notes: "Align with the 2026 enterprise strategy; includes cloud migration, data platform consolidation and customer experience redesign initiatives across all regions.",
    })),
  },
  {
    group: "Plan", label: "Tasks",
    columns: [
      { key: "code", label: "Code" }, { key: "name", label: "Name" }, { key: "status", label: "Status" },
      { key: "assignee", label: "Assignee" }, { key: "progress", label: "Progress" },
      { key: "start", label: "Start" }, { key: "end", label: "End" }, { key: "float", label: "Total Float" },
    ],
    rows: rows(120, (i) => ({
      code: `TSK-${1000 + i}`, name: i % 7 === 0 ? "Very long task name that must wrap across multiple lines inside the table cell to prove wrapping works correctly" : `Design review ${i}`,
      status: i % 4 === 0 ? "In Progress" : i % 4 === 1 ? "Not Started" : i % 4 === 2 ? "Done" : "Blocked",
      assignee: `user${i}@example.com`, progress: `${(i * 7) % 101}%`,
      start: `2026-0${(i % 9) + 1}-15`, end: `2026-1${i % 2}-01`, float: `${i % 12}d`,
    })),
  },
  {
    group: "Control", label: "RAID — Risks",
    columns: [
      { key: "code", label: "Code" }, { key: "title", label: "Title" }, { key: "severity", label: "Severity" },
      { key: "prob", label: "Probability" }, { key: "impact", label: "Impact" }, { key: "owner", label: "Owner" }, { key: "due", label: "Review Date" },
    ],
    rows: rows(60, (i) => ({
      code: `RSK-${i}`, title: `Risk: vendor delivery delay — «résumé» — 100% ✓ ${i}`, severity: i % 3 === 0 ? "High" : "Medium",
      prob: `${20 + (i % 5) * 15}%`, impact: i % 2 ? "Major" : "Moderate", owner: "pmo@example.com", due: "2026-10-01",
    })),
  },
  {
    group: "Control", label: "EVM Periods",
    columns: [], rows: [],
    note: "This tab could not be exported right now — try again or export it individually.",
  },
  {
    group: "Administration", label: "Audit Trail",
    columns: [
      { key: "id", label: "ID" }, { key: "user", label: "User" }, { key: "action", label: "Action" },
      { key: "entity", label: "Entity" }, { key: "when", label: "Timestamp" }, { key: "ip", label: "IP Address" }, { key: "ctx", label: "Context" },
    ],
    rows: rows(700, (i) => ({
      id: `00000000-0000-0000-0000-${String(i).padStart(12, "0")}`, user: "Vincent Poomari",
      action: ["LOGIN", "EXPORT", "UPDATE", "CREATE", "APPROVE"][i % 5], entity: ["projects", "tasks", "risks", "users"][i % 4],
      when: `2026-09-15 0${i % 10}:12:44`, ip: `10.0.${i % 255}.${(i * 7) % 255}`,
      ctx: "Changed field status from Draft to Submitted for governance review",
    })),
    note: "Showing the first 400 of 700 records — use the CSV export on the tab for the full dataset.",
  },
];

const pdf = buildPdfReport({
  title: "All Tabs — Workspace Export",
  subtitle: "Every permitted module in one report: portfolios, planning, delivery, controls and administration data",
  generatedBy: "Vincent Poomari",
  generatedAt: new Date("2026-09-15T10:30:00Z"),
  sections,
});
writeFileSync("sample-all-tabs.pdf", pdf);
console.log("wrote sample-all-tabs.pdf,", pdf.length, "bytes");
