"use client";
// PM CONTROL TOWER — Project Controls tab: S-Curve (progress/cost/EV) + forecast completion.
// Data from /api/projects/[id]/controls; honest "insufficient data" and calculated-forecast labels.

import { useState } from "react";
import { useApi } from "@/lib/client";
import { money, num } from "@/lib/constants";
import { SectionCard, StatCard, LoadingBlock, ErrorBlock, EmptyState, Button, cn } from "@/components/pmct/kit";
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip as RTooltip, CartesianGrid, ResponsiveContainer, Legend } from "recharts";
import { Link2 } from "lucide-react";

interface ControlsData {
  series: { week: number; label: string; plannedCost: number; actualCost: number; plannedPct: number; actualPct: number; ev: number }[];
  insufficient: boolean;
  evm: { bac: number; pv: number; ev: number; ac: number; cpi: number; spi: number; eac: number; etc: number; vac: number; tcpi: number };
  forecast: { completion: string | null; expectedDelayDays: number | null; basis: string };
  project: { code: string; name: string; start: string; end: string; budget: number };
}

type CurveMode = "progress" | "cost" | "ev";

export default function ControlsTab({ projectId }: { projectId: string }) {
  const data = useApi<ControlsData>(`/api/projects/${projectId}/controls`);
  const [mode, setMode] = useState<CurveMode>("cost");

  if (data.loading && !data.data) return <LoadingBlock label="Computing project controls…" />;
  if (data.error) return <ErrorBlock message={data.error} onRetry={data.refetch} />;
  const d = data.data!;
  if (d.insufficient) return <EmptyState title="Insufficient data for project controls" description="Add tasks with planned hours to the schedule — the S-curve and forecasts compute from the plan." />;

  const e = d.evm;
  const m = mode === "progress"
    ? { a: "plannedPct", b: "actualPct", la: "Planned %", lb: "Actual %", unit: "%" }
    : mode === "cost"
      ? { a: "plannedCost", b: "actualCost", la: "Planned cost (cum)", lb: "Actual cost (cum)", unit: "$" }
      : { a: "plannedCost", b: "ev", la: "Planned value (PV)", lb: "Earned value (EV)", unit: "$" };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="CPI" value={num(e.cpi, 2)} tone={e.cpi >= 1 ? "good" : e.cpi >= 0.9 ? "warn" : "bad"} sub="EV ÷ AC" />
        <StatCard label="SPI" value={num(e.spi, 2)} tone={e.spi >= 1 ? "good" : e.spi >= 0.9 ? "warn" : "bad"} sub="EV ÷ PV" />
        <StatCard label="EAC / VAC" value={money(e.eac)} tone={e.vac >= 0 ? "good" : "bad"} sub={"VAC " + money(e.vac)} />
        <StatCard label="TCPI" value={num(e.tcpi, 2)} sub="efficiency needed to finish on budget" />
      </div>

      <SectionCard
        title="S-Curve — planned vs actual vs earned"
        description="Cumulative curves from the schedule and approved timesheets. Headline CPI/SPI come from the EVM engine."
        actions={
          <div className="flex items-center gap-1.5">
            {(["cost", "progress", "ev"] as const).map((mo) => (
              <Button key={mo} size="sm" variant={mode === mo ? "default" : "outline"} className="text-xs h-7"
                onClick={() => setMode(mo)}>
                {mo === "cost" ? "Cost" : mo === "progress" ? "Progress" : "Earned Value"}
              </Button>
            ))}
            <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => window.location.hash = "#/schedule"}>
              <Link2 className="h-3.5 w-3.5" />Gantt
            </Button>
          </div>
        }>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={d.series} margin={{ top: 6, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" tickFormatter={(v: number) => (m.unit === "$" ? (v >= 1000 ? (v / 1000) + "k" : String(v)) : v + "%")} />
              <RTooltip formatter={(val: number | string, n: string) => [m.unit === "$" ? money(Number(val)) : num(Number(val), 1) + "%", n]} labelFormatter={(l) => "Week of " + l} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey={m.a as string} name={m.la} stroke="#1d4ed8" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey={m.b as string} name={m.lb} stroke="#0e9f6e" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="grid sm:grid-cols-2 gap-3 mt-3">
          <div className="rounded-lg border border-slate-200 p-3 text-sm">
            <p className="font-semibold text-slate-700 mb-1">Planned vs actual progress</p>
            <p className="text-slate-600">
              Latest planned <b>{d.series.length ? d.series[d.series.length - 1].plannedPct : 0}%</b> vs actual{" "}
              <b>{d.series.length ? d.series[d.series.length - 1].actualPct : 0}%</b>
              <span className="text-slate-400"> (earned-value progress via approved timesheets)</span>
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 p-3 text-sm">
            <p className="font-semibold text-slate-700 mb-1">Interpretation</p>
            <p className="text-slate-600">
              {e.cpi < 1 && e.spi < 1
                ? "Spending more than the value of work completed AND progressing slower than planned."
                : e.cpi < 1 ? "Cost efficiency below plan — spending more than the value earned."
                : e.spi < 1 ? "Schedule efficiency below plan — progressing slower than planned."
                : "Cost and schedule efficiency at or above plan."}
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Forecast completion" description="Calculated forecast — clearly not a guarantee">
        {d.forecast.completion ? (
          <div className="grid sm:grid-cols-3 gap-3">
            <StatCard label="Planned completion" value={d.project.end.slice(0, 10)} />
            <StatCard label="Forecast completion" value={d.forecast.completion} tone={(d.forecast.expectedDelayDays ?? 0) > 7 ? "bad" : (d.forecast.expectedDelayDays ?? 0) > 0 ? "warn" : "good"} />
            <StatCard label="Expected delay" value={(d.forecast.expectedDelayDays ?? 0) >= 0 ? "+" : "" + (d.forecast.expectedDelayDays ?? 0) + " days"} tone={(d.forecast.expectedDelayDays ?? 0) > 7 ? "bad" : (d.forecast.expectedDelayDays ?? 0) > 0 ? "warn" : "good"} />
            <p className="col-span-full text-xs text-slate-400">{d.forecast.basis}</p>
          </div>
        ) : (
          <EmptyState title="Forecast completion unavailable" description="A forecast needs a project end date, a status date and SPI > 0 — the tower refuses to guess." />
        )}
      </SectionCard>
    </div>
  );
}
