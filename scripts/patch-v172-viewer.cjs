const fs = require("fs");
let v = fs.readFileSync("src/views/intelligence/reporting.tsx", "utf8");

// 1) state for the on-screen viewer
v = v.replace(
  'const [lastReport, setLastReport] = useState<{ templateName: string; kpis: Record<string, unknown>; narrative: string; rag: string } | null>(null);',
  `const [lastReport, setLastReport] = useState<{ templateName: string; kpis: Record<string, unknown>; narrative: string; rag: string } | null>(null);
  const [viewReport, setViewReport] = useState<{ id: string; templateName: string; period: string; generatedBy: string; createdAt: string; narrative: string | null; data: { kpis: Record<string, unknown> } } | null>(null);
  const openReport = async (id: string) => {
    try { setViewReport(await api.get("/api/reporting/" + id)); } catch (e) { toast.error(e instanceof Error ? e.message : "Open failed"); }
  };`
);

// 2) after generate -> open the report on screen instead of only toast
v = v.replace(
  "      setLastReport(res.report);",
  `      setLastReport(res.report);
      setViewReport({ id: res.report.id ?? "", templateName: res.report.templateName, period: "current month", generatedBy: "", createdAt: new Date().toISOString(), narrative: res.report.narrative, data: { kpis: res.report.kpis } });`
);

// 3) report viewer screen (rendered above other sections whenever viewReport set)
v = v.replace(
  "      {/* LIBRARY */}",
  `      {viewReport && (
        <SectionCard title={\`Report — \${viewReport.templateName}\`} description={\`Period: \${viewReport.period.replace(/_/g, " ").toLowerCase()} · computed from live operational data\`}
          actions={
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => window.open("/api/reporting/" + viewReport.id + "?format=html", "_blank")}>
                <FileBarChart className="h-3.5 w-3.5 mr-1" />Print / Save PDF
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setViewReport(null)}>Close</Button>
            </div>
          }>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-3">
            {Object.entries(viewReport.data.kpis).slice(0, 12).map(([k, val]) => (
              <div key={k} className="rounded-md border border-slate-200 p-2.5">
                <p className="text-[10px] uppercase text-slate-400 truncate">{k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase())}</p>
                <p className="text-sm font-semibold text-slate-800 tabular-nums">{typeof val === "number" ? (val > 1000 ? money(val) : num(val, 2)) : String(val ?? "—")}</p>
              </div>
            ))}
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
            <p className="text-[10px] uppercase text-slate-400 mb-1">Executive commentary — from actual report data</p>
            <p className="text-sm text-slate-700">{viewReport.narrative}</p>
          </div>
        </SectionCard>
      )}

      {/* LIBRARY */}`
);

// 4) History rows: Open + Print buttons
v = v.replace(
  `<div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-slate-800 flex-1">{r.templateName}</p>
                      <Badge variant="outline" className="border-slate-200 text-slate-500">{r.category}</Badge>
                      <span className="text-xs text-slate-400">{r.period.replace(/_/g, " ").toLowerCase()} · {new Date(r.createdAt).toLocaleString()} · by {r.generatedBy}</span>
                    </div>`,
  `<div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-slate-800 flex-1">{r.templateName}</p>
                      <Badge variant="outline" className="border-slate-200 text-slate-500">{r.category}</Badge>
                      <span className="text-xs text-slate-400">{r.period.replace(/_/g, " ").toLowerCase()} · {new Date(r.createdAt).toLocaleString()} · by {r.generatedBy}</span>
                      <Button size="sm" variant="outline" onClick={() => void openReport(r.id)}>Open</Button>
                      <Button size="sm" variant="ghost" onClick={() => window.open("/api/reporting/" + r.id + "?format=html", "_blank")}>Print / PDF</Button>
                    </div>`
);

fs.writeFileSync("src/views/intelligence/reporting.tsx", v);
console.log("viewer wired:", v.includes("viewReport"), "| open in history:", v.includes("openReport(r.id)"));
