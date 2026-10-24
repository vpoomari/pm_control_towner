"use client";
// PM CONTROL TOWER — Agile Delivery (Command Center v3.0 — Jira/Linear analog)
// Sprints with goals, drag-and-drop sprint board, backlog grooming, story points, epics.

import { useMemo, useState } from "react";
import { useApi, useRealtimeRefetch, api } from "@/lib/client";
import { PageHeader, StatCard, SectionCard, LoadingBlock, ErrorBlock, EmptyState, StatusChip, SearchInput, ProgressBar, ConfirmButton, DataTable } from "@/components/pmct/kit";
import { ProjectPicker, useStoredProjectId } from "@/views/plan/shared/ProjectPicker";
import { KanbanBoard, type KanbanTask } from "@/views/execute/shared/KanbanBoard";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { fmtDate } from "@/lib/constants";
import { Timer, Target, Layers3, Plus, Rocket, Trash2 } from "lucide-react";

interface Sprint { id: string; projectId: string; name: string; goal: string | null; status: string; startDate: string | null; endDate: string | null; committedPoints: number }
interface Epic { id: string; projectId: string; code: string; name: string; colorHex: string; status: string; businessValue: string | null }
interface AgileBoard {
  projects: { id: string; code: string; name: string }[];
  sprints: Sprint[];
  epics: Epic[];
  tasks: KanbanTask[];
  summary: { sprintCount: number; activeSprint: Sprint | null; backlogCards: number; totalPoints: number };
}

function CreateSprintDialog({ projectId, onCreated }: { projectId: string; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name.trim()) { toast.error("Sprint name is required"); return; }
    setBusy(true);
    try {
      await api.post("/api/agile", {
        type: "SPRINT", projectId, name: name.trim(), goal: goal.trim() || null,
        status: "PLANNED", startDate: startDate || null, endDate: endDate || null,
      });
      toast.success("Sprint created");
      setOpen(false); setName(""); setGoal(""); setStartDate(""); setEndDate("");
      onCreated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create sprint");
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" className="h-8 gap-1.5" onClick={() => setOpen(true)}><Plus className="h-3.5 w-3.5" />New sprint</Button>
      <DialogContent>
        <DialogHeader><DialogTitle>Create sprint</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-600">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Sprint 14 — Payments hardening" className="mt-1" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Sprint goal</label>
            <Textarea value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Outcome this sprint commits to…" className="mt-1 min-h-16" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600">Start</label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">End</label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>{busy ? "Creating…" : "Create sprint"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateEpicDialog({ projectId, onCreated }: { projectId: string; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [color, setColor] = useState("#2563eb");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name.trim() || !code.trim()) { toast.error("Epic name and code are required"); return; }
    setBusy(true);
    try {
      await api.post("/api/agile", { type: "EPIC", projectId, name: name.trim(), code: code.trim().toUpperCase(), colorHex: color });
      toast.success("Epic created");
      setOpen(false); setName(""); setCode("");
      onCreated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create epic");
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => setOpen(true)}><Target className="h-3.5 w-3.5" />New epic</Button>
      <DialogContent>
        <DialogHeader><DialogTitle>Create epic</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-600">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Onboarding redesign" className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600">Code</label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="ONB" className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Color</label>
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="mt-1 h-9 w-full rounded border border-slate-200 bg-white" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>{busy ? "Creating…" : "Create epic"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AgileView() {
  const [projectId, setProjectId] = useStoredProjectId();
  const [sprintTab, setSprintTab] = useState("board");
  const [sprintFilter, setSprintFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [moving, setMoving] = useState<string | null>(null);

  const board = useApi<AgileBoard>(projectId ? `/api/agile?projectId=${projectId}` : "/api/agile");
  useRealtimeRefetch(board.refetch, ["agile:changed"]);

  const sprints = board.data?.sprints || [];
  const epics = board.data?.epics || [];
  const activeSprint = board.data?.summary.activeSprint || null;

  const sprintTasks = useMemo(() => {
    const list = board.data?.tasks || [];
    const inScope = sprintFilter === "ALL" ? list : list.filter((t) => sprintFilter === "BACKLOG" ? !t.sprintId : t.sprintId === sprintFilter);
    if (!search.trim()) return inScope;
    const q = search.toLowerCase();
    return inScope.filter((t) => t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q));
  }, [board.data, sprintFilter, search]);

  const backlog = useMemo(() => (board.data?.tasks || []).filter((t) => !t.sprintId), [board.data]);

  const deleteSprint = async (sprint: Sprint) => {
    try {
      await api.del(`/api/agile?type=SPRINT&id=${sprint.id}`);
      toast.success("Sprint deleted — its tasks returned to the backlog");
      board.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const addToSprint = async (task: KanbanTask, sprintId: string | null) => {
    setMoving(task.id);
    try {
      await api.patch("/api/agile", { taskId: task.id, sprintId });
      toast.success(sprintId ? "Task added to sprint" : "Task returned to backlog");
      board.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update task");
    } finally { setMoving(null); }
  };

  const setPoints = async (task: KanbanTask, points: number) => {
    try {
      await api.patch("/api/agile", { taskId: task.id, storyPoints: points });
      board.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to set story points");
    }
  };

  if (board.error) return <ErrorBlock message={board.error} onRetry={board.refetch} />;

  const sprintOptions = [{ id: "ALL", name: "All cards" }, { id: "BACKLOG", name: "Backlog (no sprint)" }, ...sprints];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Agile Delivery"
        subtitle="Sprints, epics, story points and backlog grooming for software and hybrid delivery — the same tasks the Gantt and EVM modules govern."
        breadcrumb={["Home", "Plan", "Agile"]}
        actions={
          <div className="flex items-center gap-2">
            <ProjectPicker value={projectId} onChange={setProjectId} className="w-full sm:w-auto" />
            {projectId && <CreateEpicDialog projectId={projectId} onCreated={board.refetch} />}
            {projectId && <CreateSprintDialog projectId={projectId} onCreated={board.refetch} />}
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Active sprint" value={activeSprint ? activeSprint.name : "—"} sub={activeSprint?.goal || "No active sprint"} icon={<Rocket className="h-4 w-4" />} />
        <StatCard label="Sprints" value={sprints.length} icon={<Timer className="h-4 w-4" />} />
        <StatCard label="Backlog cards" value={board.data?.summary.backlogCards ?? "—"} icon={<Layers3 className="h-4 w-4" />} />
        <StatCard label="Epics" value={epics.length} icon={<Target className="h-4 w-4" />} />
      </div>

      {/* Sprint strip */}
      <SectionCard title="Sprints" description="Committed points update automatically as cards move. Deleting a sprint returns its cards to the backlog." bodyClass="p-3">
        {board.loading ? <LoadingBlock label="Loading sprints…" /> : sprints.length === 0 ? (
          <EmptyState title="No sprints yet" description="Create the first sprint to start planning iterations." />
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {sprints.map((s) => {
              const tasksIn = (board.data?.tasks || []).filter((t) => t.sprintId === s.id);
              const done = tasksIn.filter((t) => t.status === "COMPLETED");
              const donePts = done.reduce((a, t) => a + (t.storyPoints || 0), 0);
              const totalPts = tasksIn.reduce((a, t) => a + (t.storyPoints || 0), 0);
              return (
                <div key={s.id} className={cn("rounded-lg border p-3 min-w-[220px] bg-white", s.status === "ACTIVE" ? "border-blue-400 ring-1 ring-blue-200" : "border-slate-200")}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{s.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{s.startDate ? fmtDate(s.startDate) : "—"} → {s.endDate ? fmtDate(s.endDate) : "—"}</p>
                    </div>
                    <StatusChip status={s.status} />
                  </div>
                  {s.goal && <p className="text-[10px] text-slate-500 mt-1.5 line-clamp-2">{s.goal}</p>}
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                      <span>{done.length}/{tasksIn.length} tasks</span>
                      <span className="tabular-nums">{donePts}/{totalPts} pts</span>
                    </div>
                    <ProgressBar value={totalPts ? (donePts / totalPts) * 100 : 0} />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <button
                      className="text-[10px] font-medium text-blue-600 hover:underline"
                      onClick={() => { setSprintFilter(s.id); setSprintTab("board"); }}
                    >Open board</button>
                    <ConfirmButton onConfirm={() => deleteSprint(s)} title={`Delete ${s.name}?`} description="Tasks in this sprint will return to the backlog." confirmLabel="Delete sprint">
                      <button className="text-[10px] text-slate-400 hover:text-red-600" aria-label="Delete sprint"><Trash2 className="h-3.5 w-3.5" /></button>
                    </ConfirmButton>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* Epics */}
      {epics.length > 0 && (
        <SectionCard title="Epics" description="Business-level themes grouping sprint work." bodyClass="p-3">
          <div className="flex flex-wrap gap-2">
            {epics.map((e) => {
              const tasksIn = (board.data?.tasks || []).filter((t) => t.epicId === e.id);
              const done = tasksIn.filter((t) => t.status === "COMPLETED").length;
              return (
                <div key={e.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2 flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: e.colorHex }} />
                  <div>
                    <p className="text-xs font-medium text-slate-800"><span className="font-mono text-[10px] text-slate-400 mr-1">{e.code}</span>{e.name}</p>
                    <p className="text-[10px] text-slate-400">{done}/{tasksIn.length} done</p>
                  </div>
                  <StatusChip status={e.status} className="ml-1" />
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}

      <Tabs value={sprintTab} onValueChange={setSprintTab}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <TabsList className="h-9">
            <TabsTrigger value="board" className="text-xs">Sprint board</TabsTrigger>
            <TabsTrigger value="backlog" className="text-xs">Backlog</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            {sprintTab === "board" && (
              <Select value={sprintFilter} onValueChange={setSprintFilter}>
                <SelectTrigger className="w-52 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {sprintOptions.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <SearchInput value={search} onChange={setSearch} placeholder="Search cards…" className="w-52" />
          </div>
        </div>

        <TabsContent value="board" className="mt-4">
          {board.loading ? <LoadingBlock label="Loading sprint board…" />
            : sprintTasks.length === 0 ? <EmptyState title="No cards in this selection" description="Pick another sprint, or pull backlog items into a sprint from the Backlog tab." />
              : <KanbanBoard tasks={sprintTasks} onMoved={board.refetch} showProject={!projectId} />}
        </TabsContent>

        <TabsContent value="backlog" className="mt-4">
          <SectionCard title="Backlog grooming" description="Assign story points and pull items into sprints." bodyClass="p-0">
            {board.loading ? <LoadingBlock /> : backlog.length === 0 ? (
              <EmptyState title="Backlog is empty" description="Cards without a sprint land here. Create tasks in Plan → Tasks." />
            ) : (
              <DataTable
                keyField="id"
                rows={backlog as unknown as Record<string, unknown>[]}
                columns={[
                  { key: "code", header: "Code", render: (r) => <span className="font-mono text-[11px] text-blue-700">{String(r.code)}</span> },
                  { key: "name", header: "Task", render: (r) => <span className="font-medium text-slate-700">{String(r.name)}</span> },
                  { key: "priority", header: "Priority", render: (r) => <StatusChip status={String(r.priority)} /> },
                  {
                    key: "storyPoints", header: "Points", render: (r) => (
                      <Select value={String((r as unknown as KanbanTask).storyPoints ?? 0)} onValueChange={(v) => setPoints(r as unknown as KanbanTask, Number(v))}>
                        <SelectTrigger className="w-16 h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{[0, 1, 2, 3, 5, 8, 13, 21].map((p) => <SelectItem key={p} value={String(p)}>{p === 0 ? "—" : p}</SelectItem>)}</SelectContent>
                      </Select>
                    )
                  },
                  {
                    key: "sprint", header: "Add to sprint", render: (r) => (
                      <Select value="" onValueChange={(v) => addToSprint(r as unknown as KanbanTask, v)}>
                        <SelectTrigger className="w-44 h-7 text-xs"><SelectValue placeholder={moving === String(r.id) ? "Moving…" : "Choose sprint…"} /></SelectTrigger>
                        <SelectContent>{sprints.filter((s) => s.status !== "COMPLETED").map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                      </Select>
                    )
                  },
                  { key: "assignee", header: "Assignee", render: (r) => <span className="text-xs text-slate-500">{(r as unknown as KanbanTask).assignee?.name || "—"}</span> },
                ]}
              />
            )}
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
