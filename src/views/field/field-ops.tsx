"use client";
// PM CONTROL TOWER — Field Operations (Command Center v3.0 — Procore/ACC analog)
// RFIs, daily construction logs, punch list, and BIM model viewer link-out.

import { useEffect, useMemo, useState } from "react";
import { useApi, api } from "@/lib/client";
import { PageHeader, StatCard, SectionCard, LoadingBlock, ErrorBlock, EmptyState, StatusChip, SearchInput, DataTable, ConfirmButton } from "@/components/pmct/kit";
import { ProjectPicker, useStoredProjectId } from "@/views/plan/shared/ProjectPicker";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { fmtDate, fmtDateTime, money } from "@/lib/constants";
import { HardHat, MessageSquareWarning, NotebookPen, ListChecks, Box, Plus, Hammer } from "lucide-react";

interface RfiRow {
  id: string; rfiCode: string; subject: string; discipline: string; status: string; priority: string;
  askedByName: string | null; assignedToName: string | null; dateOpened: string; dateAnswered: string | null;
  answer: string | null; costImpact: number; scheduleImpactDays: number; ageDays: number;
  project: { id: string; code: string; name: string } | null;
}
interface DailyLogRow {
  id: string; logDate: string; weather: string | null; crewCount: number; workPerformed: string | null;
  delays: string | null; safetyIncidents: number; createdByName: string | null;
  project: { id: string; code: string; name: string } | null;
}
interface PunchRow {
  id: string; code: string; title: string; location: string | null; severity: string; status: string;
  assigneeName: string | null; dueDate: string | null;
  project: { id: string; code: string; name: string } | null;
}

function NewRfiDialog({ projectId, onCreated }: { projectId: string; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [discipline, setDiscipline] = useState("GENERAL");
  const [priority, setPriority] = useState("MEDIUM");
  const [assignedTo, setAssignedTo] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!subject.trim()) { toast.error("Subject is required"); return; }
    setBusy(true);
    try {
      await api.post("/api/rfis", {
        projectId, subject: subject.trim(), body: body.trim() || null,
        discipline, priority, assignedToName: assignedTo.trim() || null,
      });
      toast.success("RFI raised");
      setOpen(false); setSubject(""); setBody(""); setAssignedTo("");
      onCreated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to raise RFI");
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" className="h-8 gap-1.5" onClick={() => setOpen(true)}><Plus className="h-3.5 w-3.5" />Raise RFI</Button>
      <DialogContent>
        <DialogHeader><DialogTitle>Raise RFI</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-600">Subject</label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Rebar spacing ambiguity at gridline C-4" className="mt-1" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Detail</label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Describe the clarification needed, reference drawings…" className="mt-1 min-h-20" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600">Discipline</label>
              <Select value={discipline} onValueChange={setDiscipline}>
                <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{["GENERAL", "STRUCTURAL", "MEP", "ARCHITECTURAL", "CIVIL", "ELECTRICAL", "SOFTWARE"].map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Priority</label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Assign to</label>
              <Input value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} placeholder="Designer name" className="mt-1 h-9" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>{busy ? "Submitting…" : "Raise RFI"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewDailyLogDialog({ projectId, onCreated }: { projectId: string; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [weather, setWeather] = useState("");
  const [crewCount, setCrewCount] = useState("0");
  const [workPerformed, setWorkPerformed] = useState("");
  const [delays, setDelays] = useState("");
  const [safety, setSafety] = useState("0");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await api.post("/api/daily-logs", {
        projectId, logDate: new Date().toISOString().slice(0, 10),
        weather: weather.trim() || null, crewCount: Number(crewCount) || 0,
        workPerformed: workPerformed.trim() || null, delays: delays.trim() || null,
        safetyIncidents: Number(safety) || 0,
      });
      toast.success("Daily log recorded");
      setOpen(false); setWorkPerformed(""); setDelays("");
      onCreated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to record log");
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => setOpen(true)}><NotebookPen className="h-3.5 w-3.5" />Daily log</Button>
      <DialogContent>
        <DialogHeader><DialogTitle>Daily construction log — {new Date().toISOString().slice(0, 10)}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600">Weather</label>
              <Input value={weather} onChange={(e) => setWeather(e.target.value)} placeholder="Clear, 32°C" className="mt-1 h-9" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Crew on site</label>
              <Input type="number" min="0" value={crewCount} onChange={(e) => setCrewCount(e.target.value)} className="mt-1 h-9" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Safety incidents</label>
              <Input type="number" min="0" value={safety} onChange={(e) => setSafety(e.target.value)} className="mt-1 h-9" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Work performed</label>
            <Textarea value={workPerformed} onChange={(e) => setWorkPerformed(e.target.value)} placeholder="Scope executed today, areas, crews…" className="mt-1 min-h-20" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Delays / disruptions</label>
            <Textarea value={delays} onChange={(e) => setDelays(e.target.value)} placeholder="Weather stand-down, equipment breakdown…" className="mt-1 min-h-12" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>{busy ? "Saving…" : "Save log"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewPunchDialog({ projectId, onCreated }: { projectId: string; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [severity, setSeverity] = useState("MEDIUM");
  const [assignee, setAssignee] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!title.trim()) { toast.error("Title is required"); return; }
    setBusy(true);
    try {
      await api.post("/api/punch-list", {
        projectId, title: title.trim(), location: location.trim() || null,
        severity, assigneeName: assignee.trim() || null,
      });
      toast.success("Punch item added");
      setOpen(false); setTitle(""); setLocation("");
      onCreated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add punch item");
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => setOpen(true)}><ListChecks className="h-3.5 w-3.5" />Punch item</Button>
      <DialogContent>
        <DialogHeader><DialogTitle>Add punch list item</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-600">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Cracked tile — lobby column 2" className="mt-1" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600">Location</label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Level 3, East" className="mt-1 h-9" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Severity</label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{["LOW", "MEDIUM", "HIGH"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Assignee</label>
              <Input value={assignee} onChange={(e) => setAssignee(e.target.value)} placeholder="Subcontractor" className="mt-1 h-9" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>{busy ? "Adding…" : "Add item"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function FieldOpsView() {
  const [tab, setTab] = useState("rfis");
  const [projectId, setProjectId] = useStoredProjectId();
  const [search, setSearch] = useState("");
  const [bimUrl, setBimUrl] = useState("");
  const [bimDraft, setBimDraft] = useState("");

  const rfis = useApi<{ rfis: RfiRow[]; summary: { total: number; open: number; unansweredOver7d: number; costImpact: number; scheduleImpactDays: number } }>(
    projectId ? `/api/rfis?projectId=${projectId}` : "/api/rfis"
  );
  const logs = useApi<{ logs: DailyLogRow[]; summary: { total: number; crewPeak: number; safetyIncidents: number } }>(
    projectId ? `/api/daily-logs?projectId=${projectId}` : "/api/daily-logs"
  );
  const punch = useApi<{ items: PunchRow[]; summary: { total: number; open: number; overdue: number; verified: number } }>(
    projectId ? `/api/punch-list?projectId=${projectId}` : "/api/punch-list"
  );

  // BIM viewer URL persisted locally (sandbox profile); production maps to a model service.
  useEffect(() => {
    setBimUrl(localStorage.getItem("pmct.bimUrl") || "");
  }, []);
  const saveBim = () => {
    localStorage.setItem("pmct.bimUrl", bimDraft.trim());
    setBimUrl(bimDraft.trim());
    toast.success("BIM viewer URL saved");
  };

  const [rfiRows, logRows, punchRows] = [rfis.data?.rfis || [], logs.data?.logs || [], punch.data?.items || []];
  const q = search.toLowerCase();
  const filteredRfis = useMemo(() => rfiRows.filter((r) => !q || r.subject.toLowerCase().includes(q) || r.rfiCode.toLowerCase().includes(q)), [rfiRows, q]);
  const filteredPunch = useMemo(() => punchRows.filter((p) => !q || p.title.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)), [punchRows, q]);

  const answerRfi = async (rfi: RfiRow) => {
    const answer = window.prompt(`Answer for ${rfi.rfiCode} — ${rfi.subject}:`);
    if (!answer || !answer.trim()) return;
    try {
      await api.patch(`/api/rfis/${rfi.id}`, { answer: answer.trim(), status: "ANSWERED" });
      toast.success(`${rfi.rfiCode} answered`);
      rfis.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to answer RFI");
    }
  };

  const advancePunch = async (item: PunchRow, status: string) => {
    try {
      await api.patch(`/api/punch-list/${item.id}`, { status });
      toast.success(`${item.code} → ${status.replace("_", " ").toLowerCase()}`);
      punch.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  };

  const anyLoading = rfis.loading || logs.loading || punch.loading;
  if (rfis.error) return <ErrorBlock message={rfis.error} onRetry={rfis.refetch} />;
  if (punch.error) return <ErrorBlock message={punch.error} onRetry={punch.refetch} />;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Field Operations"
        subtitle="Construction field-to-office: RFIs with aging and impact, daily site logs, punch list closeout, and BIM model access."
        breadcrumb={["Home", "Control", "Field Operations"]}
        actions={
          <div className="flex items-center gap-2">
            <ProjectPicker value={projectId} onChange={setProjectId} className="w-full sm:w-auto" />
            <SearchInput value={search} onChange={setSearch} placeholder="Search…" className="w-44" />
            {projectId && <NewPunchDialog projectId={projectId} onCreated={punch.refetch} />}
            {projectId && <NewDailyLogDialog projectId={projectId} onCreated={logs.refetch} />}
            {projectId && <NewRfiDialog projectId={projectId} onCreated={rfis.refetch} />}
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard label="Open RFIs" value={rfis.data?.summary.open ?? "—"} sub={`${rfis.data?.summary.unansweredOver7d ?? 0} unanswered > 7d`} tone={(rfis.data?.summary.unansweredOver7d || 0) > 0 ? "warn" : "default"} icon={<MessageSquareWarning className="h-4 w-4" />} />
        <StatCard label="RFI cost impact" value={money(rfis.data?.summary.costImpact || 0)} sub={`${rfis.data?.summary.scheduleImpactDays ?? 0} days schedule impact`} icon={<HardHat className="h-4 w-4" />} />
        <StatCard label="Daily logs" value={logs.data?.summary.total ?? "—"} sub={`peak crew ${logs.data?.summary.crewPeak ?? 0}`} icon={<NotebookPen className="h-4 w-4" />} />
        <StatCard label="Punch open" value={punch.data?.summary.open ?? "—"} sub={`${punch.data?.summary.overdue ?? 0} overdue`} tone={(punch.data?.summary.overdue || 0) > 0 ? "warn" : "default"} icon={<ListChecks className="h-4 w-4" />} />
        <StatCard label="Safety incidents" value={logs.data?.summary.safetyIncidents ?? 0} tone={(logs.data?.summary.safetyIncidents || 0) > 0 ? "bad" : "good"} icon={<Hammer className="h-4 w-4" />} />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-9">
          <TabsTrigger value="rfis" className="text-xs">RFIs</TabsTrigger>
          <TabsTrigger value="logs" className="text-xs">Daily logs</TabsTrigger>
          <TabsTrigger value="punch" className="text-xs">Punch list</TabsTrigger>
          <TabsTrigger value="bim" className="text-xs gap-1.5"><Box className="h-3.5 w-3.5" />BIM viewer</TabsTrigger>
        </TabsList>

        <TabsContent value="rfis" className="mt-4">
          <SectionCard title="Request for Information register" description="Aging, discipline routing, and cost/schedule impact per RFI." bodyClass="p-0">
            {anyLoading ? <LoadingBlock /> : filteredRfis.length === 0 ? (
              <EmptyState title="No RFIs" description="Raise the first RFI to start the field-to-office loop." />
            ) : (
              <DataTable
                keyField="id"
                rows={filteredRfis as unknown as Record<string, unknown>[]}
                columns={[
                  { key: "rfiCode", header: "RFI", render: (r) => <span className="font-mono text-[11px] font-semibold text-blue-700">{String(r.rfiCode)}</span> },
                  { key: "subject", header: "Subject", render: (r) => (
                    <div className="max-w-72"><p className="text-xs font-medium text-slate-800 truncate">{String(r.subject)}</p><p className="text-[10px] text-slate-400">{String(r.discipline)} · asked by {String(r.askedByName || "—")}</p></div>
                  ) },
                  { key: "priority", header: "Priority", render: (r) => <StatusChip status={String(r.priority)} /> },
                  { key: "status", header: "Status", render: (r) => <StatusChip status={String(r.status)} /> },
                  { key: "ageDays", header: "Age", render: (r) => (
                    <span className={`text-xs tabular-nums ${r.status === "OPEN" && Number(r.ageDays) > 7 ? "text-red-600 font-semibold" : "text-slate-500"}`}>{Number(r.ageDays)}d</span>
                  ) },
                  { key: "costImpact", header: "Impact", render: (r) => (
                    <span className="text-xs tabular-nums">{Number(r.costImpact) ? money(Number(r.costImpact)) : "—"}{Number(r.scheduleImpactDays) ? ` · ${r.scheduleImpactDays}d` : ""}</span>
                  ) },
                  { key: "actions", header: "", render: (r) => {
                    const rfi = r as unknown as RfiRow;
                    if (rfi.status === "OPEN") return <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => answerRfi(rfi)}>Answer</Button>;
                    return <span className="text-[11px] text-slate-400">—</span>;
                  } },
                ]}
              />
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <SectionCard title="Daily site logs" description="Field diary: crew counts, weather, work performed, delays, safety." bodyClass="p-0">
            {anyLoading ? <LoadingBlock /> : logRows.length === 0 ? (
              <EmptyState title="No daily logs" description="Record the first site diary entry with the Daily log button." />
            ) : (
              <DataTable
                keyField="id"
                rows={logRows as unknown as Record<string, unknown>[]}
                columns={[
                  { key: "logDate", header: "Date", render: (r) => <span className="text-xs font-medium">{fmtDate(r.logDate as string)}</span> },
                  { key: "project", header: "Project", render: (r) => <span className="text-xs text-slate-500">{String((r.project as DailyLogRow["project"])?.code || "—")}</span> },
                  { key: "weather", header: "Weather", render: (r) => <span className="text-xs">{String(r.weather || "—")}</span> },
                  { key: "crewCount", header: "Crew", className: "text-center" },
                  { key: "workPerformed", header: "Work performed", render: (r) => <span className="text-xs text-slate-600 line-clamp-2 max-w-96">{String(r.workPerformed || "—")}</span> },
                  { key: "delays", header: "Delays", render: (r) => r.delays ? <span className="text-xs text-amber-700">{String(r.delays)}</span> : <span className="text-[11px] text-slate-300">—</span> },
                  { key: "safetyIncidents", header: "Safety", render: (r) => Number(r.safetyIncidents) > 0 ? <span className="text-xs font-semibold text-red-600">{String(r.safetyIncidents)}</span> : <span className="text-xs text-slate-400">0</span> },
                  { key: "createdByName", header: "Logged by", render: (r) => <span className="text-xs text-slate-500">{String(r.createdByName || "—")}</span> },
                ]}
              />
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="punch" className="mt-4">
          <SectionCard title="Punch list" description="Closeout quality items with verification workflow." bodyClass="p-0">
            {anyLoading ? <LoadingBlock /> : filteredPunch.length === 0 ? (
              <EmptyState title="Punch list is clear" description="Add items during inspections with the Punch item button." />
            ) : (
              <DataTable
                keyField="id"
                rows={filteredPunch as unknown as Record<string, unknown>[]}
                columns={[
                  { key: "code", header: "Item", render: (r) => <span className="font-mono text-[11px] text-blue-700">{String(r.code)}</span> },
                  { key: "title", header: "Title", render: (r) => (
                    <div className="max-w-72"><p className="text-xs font-medium text-slate-800 truncate">{String(r.title)}</p><p className="text-[10px] text-slate-400">{String(r.location || "")}</p></div>
                  ) },
                  { key: "severity", header: "Severity", render: (r) => <StatusChip status={String(r.severity)} /> },
                  { key: "status", header: "Status", render: (r) => <StatusChip status={String(r.status)} /> },
                  { key: "assigneeName", header: "Assignee", render: (r) => <span className="text-xs text-slate-500">{String(r.assigneeName || "—")}</span> },
                  { key: "dueDate", header: "Due", render: (r) => <span className="text-xs">{fmtDate(r.dueDate as string | null)}</span> },
                  { key: "actions", header: "", render: (r) => {
                    const item = r as unknown as PunchRow;
                    return (
                      <div className="flex gap-1">
                        {item.status === "OPEN" && <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => advancePunch(item, "IN_PROGRESS")}>Start</Button>}
                        {(item.status === "OPEN" || item.status === "IN_PROGRESS") && <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => advancePunch(item, "CLOSED")}>Close</Button>}
                        {item.status === "CLOSED" && <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => advancePunch(item, "VERIFIED")}>Verify</Button>}
                      </div>
                    );
                  } },
                ]}
              />
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="bim" className="mt-4">
          <SectionCard
            title="BIM model viewer"
            description="Point the viewer at your model service (Autodesk Construction Cloud / Model Coordination embed URL). The URL is stored per workstation in this sandbox profile."
            actions={
              <div className="flex items-center gap-2">
                <Input value={bimDraft} onChange={(e) => setBimDraft(e.target.value)} placeholder="https://acc.autodesk.com/…embed…" className="h-8 w-96 text-xs" />
                <Button size="sm" className="h-8" onClick={saveBim}>Save</Button>
              </div>
            }
          >
            {bimUrl ? (
              <iframe src={bimUrl} title="BIM model viewer" className="w-full h-[560px] rounded-lg border border-slate-200" allow="autoplay; fullscreen; xr-spatial-tracking" />
            ) : (
              <EmptyState
                title="No BIM model configured"
                description="Paste an embeddable BIM viewer URL above and save. The model opens inline for field-to-office coordination."
                action={<Box className="h-6 w-6 text-slate-300" />}
              />
            )}
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
