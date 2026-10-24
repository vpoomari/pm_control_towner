"use client";
// PM CONTROL TOWER — Portfolio Prioritization & Budget-Constrained Selection (§21)

import { useState } from "react";
import { toast } from "sonner";
import { api, useApi } from "@/lib/client";
import { money, num } from "@/lib/constants";
import {
  PageHeader, SectionCard, StatCard, LoadingBlock, ErrorBlock, EmptyState, Button, Badge, Input, cn,
} from "@/components/pmct/kit";
import { Label } from "@/components/ui/label";
import { Sparkles, Target } from "lucide-react";

interface Row { project: { id: string; code: string; name: string; ragStatus: string }; score: { weightedScore: number; systemScore: number; classification: string; overridden: boolean; overrideReason: string | null; overrideBy: string | null; scores: Record<string, number>; costEstimate: number; expectedValue: number } | null }
interface Criteria { id: string; name: string; weight: number }
interface Decision { candidate: { id: string; name: string; score: number; cost: number; expectedValue: number }; selected: boolean; reason: string }
interface OptResult { scenarioId: string; selected: Decision[]; excluded: Decision[]; totalCost: number; remainingBudget: number; totalScore: number; totalValue: number }

const CLS_TONE: Record<string, string> = { CRITICAL: "border-red-200 text-red-700 bg-red-50", HIGH: "border-blue-200 text-blue-700 bg-blue-50", MEDIUM: "border-amber-200 text-amber-700 bg-amber-50", LOW: "border-slate-200 text-slate-500 bg-slate-50", DEFER: "border-slate-200 text-slate-400 bg-slate-50" };

export default function PrioritizationView() {
  const data = useApi<{ criteria: Criteria[]; rows: Row[]; unscored: number }>("/api/prioritization");
  const [budget, setBudget] = useState("10000000");
  const [maxProjects, setMaxProjects] = useState("");
  const [opt, setOpt] = useState<OptResult | null>(null);
  const [busy, setBusy] = useState(false);

  const optimize = async () => {
    setBusy(true);
    try {
      const res = await api.post<OptResult>("/api/prioritization", { action: "optimize", budget: Number(budget), maxProjects: maxProjects ? Number(maxProjects) : undefined });
      setOpt(res); toast.success(`Recommended portfolio: ${res.selected.length} projects, avg score ${res.totalScore}`);
      data.refetch();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Optimization failed"); } finally { setBusy(false); }
  };
  const saveScore = async (row: Row) => {
    if (!row.score) return;
    try {
      await api.post("/api/prioritization", { action: "score", projectId: row.project.id, scores: row.score.scores, costEstimate: row.score.costEstimate, expectedValue: row.score.expectedValue });
      toast.success(`${row.project.code} scored`); data.refetch();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Save failed"); }
  };

  if (data.loading && !data.data) return <LoadingBlock label="Loading prioritization model…" />;
  if (data.error && !data.data) return <ErrorBlock message={data.error} onRetry={data.refetch} />;
  const rows = data.data!.rows.filter((r) => r.score);
  const avg = rows.length ? num(rows.reduce((s, r) => s + r.score!.weightedScore, 0) / rows.length, 1) : "0";

  return (
    <div className="space-y-5">
      <PageHeader
        io="portfolios"
        title="Portfolio Prioritization & Selection"
        subtitle="Configurable weighted scoring, transparent ranking, budget-constrained optimization — every decision explained."
        breadcrumb={["Home", "Portfolio", "Prioritization"]}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Scored projects" value={rows.length + "/" + data.data!.rows.length} sub={data.data!.unscored + " awaiting scoring"} />
        <StatCard label="Average priority score" value={avg} sub="weighted, 0–100" />
        <StatCard label="Critical / High" value={rows.filter((r) => ["CRITICAL", "HIGH"].includes(r.score!.classification)).length} tone="good" />
        <StatCard label="Scoring criteria" value={data.data!.criteria.length} sub="weights configurable" />
      </div>

      {/* Criteria weights */}
      <SectionCard title="Scoring model — criterion weights" description="Weighted Score = Σ(criterion score × weight), 0–100 scale. Weights must total 100.">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {data.data!.criteria.map((c) => (
            <div key={c.id} className="rounded-md border border-slate-200 px-2.5 py-2">
              <p className="text-[11px] text-slate-500 leading-tight h-8">{c.name}</p>
              <p className="text-lg font-semibold text-slate-800 tabular-nums">{c.weight}%</p>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Ranking table */}
      <SectionCard title="Priority ranking" description="System-calculated score vs any management override — overrides show who, why and when.">
        {rows.length === 0 ? <EmptyState title="No scored projects yet" description="Score projects via POST /api/prioritization (scoring workshop) to rank them." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-[11px] uppercase text-slate-400 border-b border-slate-200">
                <th className="px-3 py-2">#</th><th className="px-3 py-2">Project</th><th className="px-3 py-2">Score</th>
                <th className="px-3 py-2">Class</th><th className="px-3 py-2">Cost est.</th><th className="px-3 py-2">Expected value</th><th className="px-3 py-2">ROI</th><th className="px-3 py-2">Basis</th>
              </tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.project.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2 text-slate-400 tabular-nums">{i + 1}</td>
                    <td className="px-3 py-2 font-medium text-slate-800">{r.project.code} — {r.project.name}</td>
                    <td className="px-3 py-2 text-lg font-semibold tabular-nums text-slate-800">{r.score!.weightedScore}</td>
                    <td className="px-3 py-2"><span className={cn("px-2 py-0.5 rounded-full border text-xs font-semibold", CLS_TONE[r.score!.classification])}>{r.score!.classification}</span></td>
                    <td className="px-3 py-2 tabular-nums text-slate-600">{money(r.score!.costEstimate)}</td>
                    <td className="px-3 py-2 tabular-nums text-slate-600">{money(r.score!.expectedValue)}</td>
                    <td className="px-3 py-2 tabular-nums text-slate-600">{r.score!.costEstimate > 0 ? num((r.score!.expectedValue / r.score!.costEstimate) * 100, 0) + "%" : "—"}</td>
                    <td className="px-3 py-2 text-xs">
                      {r.score!.overridden
                        ? <span className="text-amber-700">Override by {r.score!.overrideBy}: {r.score!.overrideReason}</span>
                        : <span className="text-slate-400">System calculated</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Optimizer */}
      <SectionCard title="Budget-constrained portfolio optimization" description="Value-dense selection with dependency and regulatory guards — every inclusion and exclusion explained.">
        <div className="flex flex-wrap items-end gap-3 mb-4">
          <div className="space-y-1"><Label className="text-xs">Available budget</Label><Input type="number" className="h-9 w-48" value={budget} onChange={(e) => setBudget(e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs">Max projects (optional)</Label><Input type="number" className="h-9 w-32" value={maxProjects} onChange={(e) => setMaxProjects(e.target.value)} placeholder="no limit" /></div>
          <Button disabled={busy || rows.length === 0} onClick={() => void optimize()}><Sparkles className="h-4 w-4 mr-1.5" />Optimize portfolio</Button>
        </div>
        {opt && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard label="Invested" value={money(opt.totalCost)} />
              <StatCard label="Remaining budget" value={money(opt.remainingBudget)} tone={opt.remainingBudget >= 0 ? "good" : "bad"} />
              <StatCard label="Avg priority score" value={opt.totalScore} tone="good" />
              <StatCard label="Expected value" value={money(opt.totalValue)} />
            </div>
            <div className="grid lg:grid-cols-2 gap-3">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">
                <p className="text-sm font-semibold text-emerald-800 mb-2">Recommended portfolio ({opt.selected.length})</p>
                {opt.selected.map((d) => (
                  <div key={d.candidate.id} className="text-sm border-b border-emerald-100 last:border-0 py-1.5">
                    <p className="font-medium text-slate-800">{d.candidate.name} — score {d.candidate.score}, cost {money(d.candidate.cost)}</p>
                    <p className="text-xs text-slate-500">Why: {d.reason}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3">
                <p className="text-sm font-semibold text-amber-800 mb-2">Not selected — with reasons ({opt.excluded.length})</p>
                {opt.excluded.map((d) => (
                  <div key={d.candidate.id} className="text-sm border-b border-amber-100 last:border-0 py-1.5">
                    <p className="font-medium text-slate-800">{d.candidate.name} — score {d.candidate.score}, cost {money(d.candidate.cost)}</p>
                    <p className="text-xs text-slate-500">Why not: {d.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </SectionCard>

      {/* Priority matrix */}
      {rows.length > 0 && (
        <SectionCard title="Priority matrix — business value vs investment" description="Quick wins (top-left), strategic investments (top-right), evaluate (bottom-left), avoid/defer (bottom-right)">
          {(() => {
            const maxCost = Math.max(...rows.map((r) => r.score!.costEstimate), 1);
            const maxVal = Math.max(...rows.map((r) => r.score!.expectedValue), 1);
            return (
              <div className="relative bg-slate-50 rounded-lg border border-slate-200" style={{ height: 380 }}>
                <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
                  <div className="border-r border-b border-slate-200 p-2"><span className="text-[10px] font-semibold text-emerald-600">QUICK WINS</span></div>
                  <div className="border-b border-slate-200 p-2"><span className="text-[10px] font-semibold text-blue-600">STRATEGIC INVESTMENTS</span></div>
                  <div className="border-r border-slate-200 p-2"><span className="text-[10px] font-semibold text-slate-400">EVALUATE</span></div>
                  <div className="p-2"><span className="text-[10px] font-semibold text-red-500">AVOID / DEFER</span></div>
                </div>
                {rows.map((r) => (
                  <button key={r.project.id} title={`${r.project.code} — score ${r.score!.weightedScore}`}
                    className="absolute -translate-x-1/2 -translate-y-1/2 px-2 py-1 rounded-md bg-blue-600 text-white text-[10px] font-semibold shadow hover:bg-blue-700"
                    style={{
                      left: `calc(${(r.score!.costEstimate / maxCost) * 80 + 10}%)`,
                      top: `calc(${100 - (r.score!.expectedValue / maxVal) * 80 - 10}%)`,
                    }}>
                    {r.project.code}
                  </button>
                ))}
                <span className="absolute bottom-1 right-2 text-[10px] text-slate-400">Investment →</span>
                <span className="absolute top-1 left-2 text-[10px] text-slate-400">↑ Business value</span>
              </div>
            );
          })()}
        </SectionCard>
      )}
    </div>
  );
}
