"use client";
// PM CONTROL TOWER — Investment & Business Case (v1.7.0)
// Create financial business cases; compute ROI/NPV/IRR/Payback; scenario + sensitivity analysis; workflow.

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { api, useApi } from "@/lib/client";
import { money, num } from "@/lib/constants";
import {
  PageHeader, SectionCard, StatCard, StatusChip, LoadingBlock, ErrorBlock, EmptyState, Button, Badge, Input, cn,
} from "@/components/pmct/kit";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, Plus, TrendingUp } from "lucide-react";

interface Row { id: string; name: string; sponsor: string; status: string; recommendation: string; roiPct: number | null; npv: number | null; irr: number | null; paybackYears: number | null; totalInvestment: number; totalBenefits: number }
interface ListData { cases: Row[]; portfolio: { invested: number; benefits: number; roiPct: number; count: number } }
interface Metrics { years: { year: number; capex: number; opex: number; benefits: number; net: number; cumulative: number }[]; totalCapex: number; totalOpex: number; totalBenefits: number; totalInvestment: number; netBenefit: number; roiPct: number; npv: number | null; irr: number | null; paybackYears: number | null; discountedPaybackYears: number | null; hurdleRatePct: number; npvVerdict: string; irrVerdict: string; recommendation: string }
interface Scen { name: string; metrics: Metrics }
interface Sens { changePct: number; npv: number }

const REC_TONE: Record<string, string> = { STRONG_INVEST: "border-emerald-200 text-emerald-700 bg-emerald-50", INVEST: "border-emerald-200 text-emerald-700 bg-emerald-50", REVIEW: "border-amber-200 text-amber-700 bg-amber-50", CONDITIONAL: "border-orange-200 text-orange-700 bg-orange-50", DO_NOT_INVEST: "border-red-200 text-red-700 bg-red-50" };
const WF = ["DRAFT", "SUBMITTED", "PMO_REVIEW", "FINANCE_REVIEW", "CFO_REVIEW", "APPROVED", "FUNDED"];

export default function InvestmentView() {
  const list = useApi<ListData>("/api/investment");
  const [tab, setTab] = useState<"portfolio" | "new">("portfolio");
  const [detailId, setDetailId] = useState<string | null>(null);
  const detail = useApi<{ businessCase: { id: string; name: string; status: string; recommendation: string }; metrics: Metrics; scenarios: Scen[]; sensitivity: Sens[] }>(detailId ? `/api/investment?id=${detailId}` : null);

  const [form, setForm] = useState({ name: "", sponsor: "", currency: "USD", years: "5", discount: "8", hurdle: "12", capexAmount: "", opexAnnual: "", opexYears: "3", benefitAnnual: "", benefitGrowth: "20", benefitConfidence: "90" });
  const [saving, setSaving] = useState(false);

  const createCase = async () => {
    if (!form.name.trim() || !form.sponsor.trim()) { toast.error("Name and sponsor are required"); return; }
    const capex = form.capexAmount ? [{ category: "INITIAL", amount: Number(form.capexAmount), year: 0 }] : [];
    const opex = form.opexAnnual ? [{ category: "OPEX", annualAmount: Number(form.opexAnnual), startYear: 1, endYear: Number(form.opexYears), escalationPct: 0 }] : [];
    const benefits = form.benefitAnnual ? [{ name: form.name + " benefits", annualValue: Number(form.benefitAnnual), startYear: 1, growthPct: Number(form.benefitGrowth), confidencePct: Number(form.benefitConfidence) }] : [];
    if (!capex.length && !benefits.length) { toast.error("Enter at least an investment or a benefit"); return; }
    setSaving(true);
    try {
      const res = await api.post<{ id: string; metrics: Metrics }>("/api/investment", { name: form.name.trim(), sponsor: form.sponsor.trim(), currency: form.currency, analysisYears: Number(form.years), discountRatePct: Number(form.discount), hurdleRatePct: Number(form.hurdle), capex, opex, benefits });
      toast.success(`Business case saved — ROI ${res.metrics.roiPct}%, NPV ${money(res.metrics.npv ?? 0)}`);
      setDetailId(res.id); setTab("portfolio"); list.refetch();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Save failed"); } finally { setSaving(false); }
  };
  const decide = async (status: string) => {
    if (!detailId) return;
    try { await api.patch("/api/investment", { id: detailId, status }); toast.success("Decision recorded: " + status); detail.refetch(); list.refetch(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Decision failed"); }
  };

  const portfolio = list.data?.portfolio;

  return (
    <div className="space-y-5">
      <PageHeader
        io="financials"
        title="Investment & Business Case"
        subtitle="Evaluate financial viability — ROI, NPV, IRR, payback, CAPEX/OPEX, cash flow, scenarios and sensitivity — computed by the finance engine."
        breadcrumb={["Home", "Finance", "Investment & Business Case"]}
        actions={
          <Button size="sm" onClick={() => setTab(tab === "new" ? "portfolio" : "new")}>
            <Plus className="h-4 w-4 mr-1.5" />{tab === "new" ? "Back to portfolio" : "New business case"}
          </Button>
        }
      />

      {tab === "portfolio" && (
        !list.data ? <LoadingBlock label="Loading business cases…" /> : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard label="Business cases" value={portfolio?.count ?? 0} />
              <StatCard label="Total investment" value={money(portfolio?.invested ?? 0)} />
              <StatCard label="Total benefits" value={money(portfolio?.benefits ?? 0)} tone="good" />
              <StatCard label="Portfolio ROI" value={(portfolio?.roiPct ?? 0) + "%"} tone={(portfolio?.roiPct ?? 0) >= 25 ? "good" : "warn"} />
            </div>

            {detailId && detail.data ? (
              <SectionCard title={`Financial analysis — ${detail.data.businessCase.name}`} description={`recommendation: ${detail.data.businessCase.recommendation}`}
                actions={
                  <div className="flex flex-wrap gap-1.5">
                    {["SUBMITTED", "PMO_REVIEW", "FINANCE_REVIEW", "CFO_REVIEW", "APPROVED", "FUNDED"].map((s) => (
                      <Button key={s} variant="outline" size="sm" className="text-[11px]" onClick={() => void decide(s)}>{s.replace("_", " ")}</Button>
                    ))}
                  </div>
                }>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                  <StatCard label="Investment" value={money(detail.data.metrics.totalInvestment)} sub={`CAPEX ${money(detail.data.metrics.totalCapex)} · OPEX ${money(detail.data.metrics.totalOpex)}`} />
                  <StatCard label="Total benefits" value={money(detail.data.metrics.totalBenefits)} tone="good" />
                  <StatCard label="Net benefit" value={money(detail.data.metrics.netBenefit)} />
                  <StatCard label="ROI" value={detail.data.metrics.roiPct + "%"} tone={detail.data.metrics.roiPct >= 25 ? "good" : "warn"} />
                  <StatCard label="NPV" value={money(detail.data.metrics.npv ?? 0)} tone={(detail.data.metrics.npv ?? 0) > 0 ? "good" : "bad"} sub={detail.data.metrics.npvVerdict} />
                  <StatCard label="IRR" value={detail.data.metrics.irr == null ? "—" : detail.data.metrics.irr + "%"} tone={detail.data.metrics.irr != null && detail.data.metrics.irr > detail.data.metrics.hurdleRatePct ? "good" : "warn"} sub={detail.data.metrics.irrVerdict} />
                  <StatCard label="Payback" value={detail.data.metrics.paybackYears == null ? "beyond horizon" : detail.data.metrics.paybackYears + " yrs"} sub="simple" />
                  <StatCard label="Discounted payback" value={detail.data.metrics.discountedPaybackYears == null ? "beyond horizon" : detail.data.metrics.discountedPaybackYears + " yrs"} />
                </div>
                <div className="overflow-x-auto mb-4">
                  <table className="w-full text-sm">
                    <thead><tr className="text-left text-[11px] uppercase text-slate-400 border-b border-slate-200">
                      <th className="px-3 py-2">Year</th><th className="px-3 py-2">CAPEX</th><th className="px-3 py-2">OPEX</th><th className="px-3 py-2">Benefits</th><th className="px-3 py-2">Net cash flow</th><th className="px-3 py-2">Cumulative</th>
                    </tr></thead>
                    <tbody>
                      {detail.data.metrics.years.map((y) => (
                        <tr key={y.year} className="border-b border-slate-100">
                          <td className="px-3 py-2 text-slate-600">{y.year === 0 ? "Year 0" : "Year " + y.year}</td>
                          <td className="px-3 py-2 tabular-nums text-slate-600">{money(y.capex)}</td>
                          <td className="px-3 py-2 tabular-nums text-slate-600">{money(y.opex)}</td>
                          <td className="px-3 py-2 tabular-nums text-emerald-700">{money(y.benefits)}</td>
                          <td className={cn("px-3 py-2 tabular-nums font-medium", y.net >= 0 ? "text-emerald-700" : "text-red-600")}>{y.net >= 0 ? "+" : ""}{money(y.net)}</td>
                          <td className="px-3 py-2 tabular-nums text-slate-600">{y.cumulative >= 0 ? "+" : ""}{money(y.cumulative)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="grid lg:grid-cols-2 gap-3">
                  <div className="rounded-lg border border-slate-200 p-3">
                    <p className="text-sm font-semibold text-slate-700 mb-2">Scenario analysis</p>
                    <table className="w-full text-xs">
                      <thead><tr className="text-slate-400"><th className="text-left py-1">Scenario</th><th className="text-right">ROI</th><th className="text-right">NPV</th><th className="text-right">Payback</th></tr></thead>
                      <tbody>
                        {detail.data.scenarios.map((s) => (
                          <tr key={s.name} className="border-t border-slate-100">
                            <td className="py-1 font-medium text-slate-700">{s.name}</td>
                            <td className="py-1 text-right tabular-nums">{s.metrics.roiPct}%</td>
                            <td className="py-1 text-right tabular-nums">{money(s.metrics.npv ?? 0)}</td>
                            <td className="py-1 text-right tabular-nums">{s.metrics.paybackYears == null ? "—" : s.metrics.paybackYears + "y"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-3">
                    <p className="text-sm font-semibold text-slate-700 mb-2">NPV sensitivity — benefits ±30%</p>
                    {detail.data.sensitivity.map((s) => (
                      <div key={s.changePct} className="flex items-center gap-2 text-xs py-0.5">
                        <span className="w-12 text-slate-500 tabular-nums">{s.changePct > 0 ? "+" : ""}{s.changePct}%</span>
                        <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div className={cn("h-full rounded-full", s.npv >= 0 ? "bg-emerald-500" : "bg-red-500")} style={{ width: Math.min(100, Math.abs(s.npv) / 50) + "%" }} />
                        </div>
                        <span className={cn("tabular-nums w-28 text-right", s.npv >= 0 ? "text-emerald-700" : "text-red-600")}>{money(s.npv)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </SectionCard>
            ) : null}

            <SectionCard title="Business cases" description="Financial recommendations are decision-support indicators — leadership retains final approval authority.">
              {list.data.cases.length === 0 ? <EmptyState title="No business cases yet" description="Create one with New business case." /> : (
                <div className="space-y-1.5">
                  {list.data.cases.map((c) => (
                    <button key={c.id} onClick={() => setDetailId(c.id)} className="w-full text-left rounded-md border border-slate-200 px-3 py-2 hover:border-blue-300">
                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        <span className="font-medium text-slate-800 flex-1 truncate">{c.name}</span>
                        <span className="tabular-nums text-slate-600">ROI {c.roiPct ?? "—"}%</span>
                        <span className="tabular-nums text-slate-600">NPV {money(c.npv ?? 0)}</span>
                        <span className="tabular-nums text-slate-500">IRR {c.irr == null ? "—" : c.irr + "%"}</span>
                        <Badge variant="outline" className={cn(REC_TONE[c.recommendation])}>{c.recommendation.replace(/_/g, " ")}</Badge>
                        <StatusChip status={c.status} />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>
        )
      )}

      {tab === "new" && (
        <SectionCard title="New business case" description="Enter the investment profile — the finance engine computes ROI, NPV, IRR, payback, scenarios and sensitivity.">
          <div className="grid sm:grid-cols-2 gap-3 mb-4">
            <div className="space-y-1"><Label>Business case name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="ERP Modernization Program" /></div>
            <div className="space-y-1"><Label>Sponsor *</Label><Input value={form.sponsor} onChange={(e) => setForm({ ...form, sponsor: e.target.value })} placeholder="CFO Office" /></div>
            <div className="space-y-1"><Label>Currency</Label>
              <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}><SelectTrigger className="bg-white"><SelectValue /></SelectTrigger><SelectContent>{["USD", "EUR", "AED", "INR"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-1"><Label>Analysis period (years)</Label><Input type="number" min={1} max={15} value={form.years} onChange={(e) => setForm({ ...form, years: e.target.value })} /></div>
            <div className="space-y-1"><Label>Discount rate %</Label><Input type="number" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} /></div>
            <div className="space-y-1"><Label>Hurdle rate %</Label><Input type="number" value={form.hurdle} onChange={(e) => setForm({ ...form, hurdle: e.target.value })} /></div>
          </div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Investment & returns</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
            <div className="space-y-1"><Label>Initial CAPEX</Label><Input type="number" value={form.capexAmount} onChange={(e) => setForm({ ...form, capexAmount: e.target.value })} placeholder="Year 0" /></div>
            <div className="space-y-1"><Label>Annual OPEX</Label><Input type="number" value={form.opexAnnual} onChange={(e) => setForm({ ...form, opexAnnual: e.target.value })} /></div>
            <div className="space-y-1"><Label>OPEX until year</Label><Input type="number" value={form.opexYears} onChange={(e) => setForm({ ...form, opexYears: e.target.value })} /></div>
            <div className="space-y-1"><Label>Annual benefit</Label><Input type="number" value={form.benefitAnnual} onChange={(e) => setForm({ ...form, benefitAnnual: e.target.value })} /></div>
            <div className="space-y-1"><Label>Benefit growth %/yr</Label><Input type="number" value={form.benefitGrowth} onChange={(e) => setForm({ ...form, benefitGrowth: e.target.value })} /></div>
          </div>
          <Button disabled={saving} onClick={() => void createCase()}><Calculator className="h-4 w-4 mr-1.5" />{saving ? "Computing…" : "Create & compute"}</Button>
        </SectionCard>
      )}
    </div>
  );
}
