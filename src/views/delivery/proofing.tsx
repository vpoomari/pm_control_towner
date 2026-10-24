"use client";
// PM CONTROL TOWER — Proofing & Approvals (Command Center v3.0 — Filestage/ProofHub analog)
// Versioned proof rounds on deliverables with annotation threads and approve / changes workflow.

import { useMemo, useState } from "react";
import { useApi, api } from "@/lib/client";
import { PageHeader, StatCard, SectionCard, LoadingBlock, ErrorBlock, EmptyState, StatusChip, SearchInput } from "@/components/pmct/kit";
import { ProjectPicker, useStoredProjectId } from "@/views/plan/shared/ProjectPicker";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { fmtDate } from "@/lib/constants";
import { FileCheck2, Plus, CheckCircle2, RotateCcw, MessageSquare, GitBranch } from "lucide-react";

interface ProofRoundRow {
  id: string; roundNumber: number; versionLabel: string; fileUrl: string | null; status: string;
  dueDate: string | null; reviewerName: string | null; decisionAt: string | null; notes: string | null;
  openAnnotations: number;
  deliverable: { id: string; code: string; name: string; deliverableType: string; project: { id: string; code: string; name: string } | null };
  annotations?: { id: string; locator: string; comment: string; authorName: string | null; resolved: boolean; createdAt: string; xPct: number | null; yPct: number | null }[];
}
interface DeliverableRow { id: string; code: string; name: string; deliverableType: string; status: string; dueDate: string | null; project: { id: string; code: string } | null }

function NewRoundDialog({ projectId, onCreated }: { projectId: string | null; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [deliverableId, setDeliverableId] = useState("");
  const [versionLabel, setVersionLabel] = useState("v1");
  const [reviewer, setReviewer] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const deliverables = useApi<{ deliverables: DeliverableRow[] }>(open && projectId ? `/api/deliverables?projectId=${projectId}` : null);

  const submit = async () => {
    if (!deliverableId) { toast.error("Select a deliverable"); return; }
    setBusy(true);
    try {
      await api.post("/api/proofing", {
        deliverableId, versionLabel: versionLabel.trim() || "v1",
        reviewerName: reviewer.trim() || null, notes: notes.trim() || null,
      });
      toast.success("Proof round opened");
      setOpen(false); setNotes("");
      onCreated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to open round");
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" className="h-8 gap-1.5" onClick={() => setOpen(true)}><Plus className="h-3.5 w-3.5" />New proof round</Button>
      <DialogContent>
        <DialogHeader><DialogTitle>Open a proof round</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-600">Deliverable</label>
            {deliverables.loading ? <p className="text-xs text-slate-400 mt-1">Loading deliverables…</p> : (deliverables.data?.deliverables || []).length === 0 ? (
              <p className="text-xs text-amber-600 mt-1">No deliverables found — create one in the delivery module first.</p>
            ) : (
              <div className="grid gap-1 mt-1 max-h-44 overflow-y-auto">
                {(deliverables.data?.deliverables || []).map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setDeliverableId(d.id)}
                    className={cn("text-left rounded-lg border px-3 py-2 transition-colors",
                      deliverableId === d.id ? "border-blue-400 bg-blue-50" : "border-slate-200 hover:border-blue-200")}
                  >
                    <p className="text-xs font-medium text-slate-800"><span className="font-mono text-[10px] text-blue-700 mr-1">{d.code}</span>{d.name}</p>
                    <p className="text-[10px] text-slate-400">{d.deliverableType} · {d.project?.code || "—"}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600">Version label</label>
              <input className="mt-1 flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm" value={versionLabel} onChange={(e) => setVersionLabel(e.target.value)} aria-label="Version label" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Reviewer</label>
              <input className="mt-1 flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm" value={reviewer} onChange={(e) => setReviewer(e.target.value)} placeholder="Creative director" aria-label="Reviewer" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Brief / notes</label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What the reviewer should check…" className="mt-1 min-h-16" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>{busy ? "Opening…" : "Open round"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ProofingView() {
  const [projectId, setProjectId] = useStoredProjectId();
  const [search, setSearch] = useState("");
  const [openRoundId, setOpenRoundId] = useState<string | null>(null);
  const [annotation, setAnnotation] = useState("");

  const rounds = useApi<{ rounds: ProofRoundRow[]; summary: { total: number; inReview: number; approved: number; changesRequested: number; openAnnotations: number } }>(
    projectId ? `/api/proofing?projectId=${projectId}` : "/api/proofing"
  );
  const detail = useApi<{ round: ProofRoundRow }>(openRoundId ? `/api/proofing/${openRoundId}` : null);

  const q = search.toLowerCase();
  const list = useMemo(
    () => (rounds.data?.rounds || []).filter((r) => !q || r.deliverable.name.toLowerCase().includes(q) || r.deliverable.code.toLowerCase().includes(q)),
    [rounds.data, q]
  );

  const decide = async (round: ProofRoundRow, status: string) => {
    try {
      await api.patch(`/api/proofing/${round.id}`, { status });
      toast.success(`Round ${round.roundNumber} → ${status.replace(/_/g, " ").toLowerCase()}`);
      rounds.refetch();
      if (openRoundId === round.id) detail.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Decision failed");
    }
  };

  const addAnnotation = async () => {
    if (!openRoundId || !annotation.trim()) return;
    try {
      await api.post(`/api/proofing/${openRoundId}`, { comment: annotation.trim(), locator: "" });
      setAnnotation("");
      detail.refetch();
      rounds.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Comment failed");
    }
  };

  const toggleResolve = async (roundId: string, annId: string, resolved: boolean) => {
    try {
      await api.patch(`/api/proofing/${roundId}`, { annotationId: annId, annotationResolved: resolved });
      detail.refetch();
      rounds.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  };

  if (rounds.error) return <ErrorBlock message={rounds.error} onRetry={rounds.refetch} />;

  const openRound = detail.data?.round || null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Proofing & Approvals"
        subtitle="Versioned review rounds on deliverables — video, PDF, design — with threaded markup comments and approve / changes-requested decisions."
        breadcrumb={["Home", "Delivery", "Proofing"]}
        actions={
          <div className="flex items-center gap-2">
            <ProjectPicker value={projectId} onChange={setProjectId} className="w-full sm:w-auto" />
            <SearchInput value={search} onChange={setSearch} placeholder="Search…" className="w-44" />
            <NewRoundDialog projectId={projectId} onCreated={rounds.refetch} />
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard label="Proof rounds" value={rounds.data?.summary.total ?? "—"} icon={<GitBranch className="h-4 w-4" />} />
        <StatCard label="In review" value={rounds.data?.summary.inReview ?? "—"} tone="info" icon={<FileCheck2 className="h-4 w-4" />} />
        <StatCard label="Changes requested" value={rounds.data?.summary.changesRequested ?? "—"} tone="warn" icon={<RotateCcw className="h-4 w-4" />} />
        <StatCard label="Approved" value={rounds.data?.summary.approved ?? "—"} tone="good" icon={<CheckCircle2 className="h-4 w-4" />} />
        <StatCard label="Open annotations" value={rounds.data?.summary.openAnnotations ?? "—"} icon={<MessageSquare className="h-4 w-4" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-4 items-start">
        {/* Rounds list */}
        <SectionCard title="Review rounds" description="Newest first. Click to open the annotation drawer." bodyClass="p-2 max-h-[620px] overflow-y-auto">
          {rounds.loading ? <LoadingBlock /> : list.length === 0 ? (
            <EmptyState title="No proof rounds" description="Open a round on a deliverable to start structured review." />
          ) : list.map((r) => (
            <button
              key={r.id}
              onClick={() => setOpenRoundId(r.id)}
              className={cn("w-full text-left rounded-lg border px-3 py-2.5 mb-1.5 transition-colors",
                openRoundId === r.id ? "border-blue-300 bg-blue-50" : "border-slate-200 hover:border-blue-200 bg-white")}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate">
                    <span className="font-mono text-[10px] text-blue-700 mr-1">{r.deliverable.code}</span>{r.deliverable.name}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Round {r.roundNumber} · {r.versionLabel} · {r.deliverable.project?.code || "—"}
                  </p>
                </div>
                <StatusChip status={r.status} />
              </div>
              <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400">
                <span>Reviewer: {r.reviewerName || "—"}</span>
                {r.dueDate && <span>· due {fmtDate(r.dueDate)}</span>}
                <span className={cn(r.openAnnotations > 0 && "text-amber-600 font-medium")}>· {r.openAnnotations} open notes</span>
              </div>
            </button>
          ))}
        </SectionCard>

        {/* Round detail */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm min-h-[420px]">
          {!openRound ? (
            <EmptyState title="Select a proof round" description="Open a round to review annotations and record a decision." />
          ) : (
            <div className="flex flex-col h-full">
              <div className="p-4 border-b border-slate-100">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">{openRound.deliverable.name}</h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Round {openRound.roundNumber} ({openRound.versionLabel}) · reviewer {openRound.reviewerName || "—"}
                      {openRound.decisionAt ? ` · decided ${fmtDate(openRound.decisionAt)}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    {openRound.status === "IN_REVIEW" && (
                      <>
                        <Button size="sm" className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700" onClick={() => decide(openRound, "APPROVED")}><CheckCircle2 className="h-3.5 w-3.5" />Approve</Button>
                        <Button size="sm" variant="outline" className="h-8 gap-1.5 text-amber-700 border-amber-300 hover:bg-amber-50" onClick={() => decide(openRound, "CHANGES_REQUESTED")}><RotateCcw className="h-3.5 w-3.5" />Request changes</Button>
                      </>
                    )}
                    {(openRound.status === "APPROVED" || openRound.status === "CHANGES_REQUESTED") && (
                      <Button size="sm" variant="outline" className="h-8" onClick={() => decide(openRound, "IN_REVIEW")}>Reopen</Button>
                    )}
                  </div>
                </div>
                {openRound.notes && <p className="text-xs text-slate-500 mt-2">{openRound.notes}</p>}
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[380px]">
                {detail.loading ? <LoadingBlock label="Loading annotations…" /> : (openRound.annotations || []).length === 0 ? (
                  <EmptyState title="No annotations yet" description="Add review notes below — page numbers, timecodes, or general comments." />
                ) : (openRound.annotations || []).map((a) => (
                  <div key={a.id} className={cn("rounded-lg border px-3 py-2", a.resolved ? "bg-slate-50 border-slate-200" : "bg-white border-slate-200")}>
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-semibold text-slate-700">
                        {a.authorName || "Reviewer"}
                        {a.locator && <span className="ml-1.5 font-mono text-[10px] text-blue-700 bg-blue-50 rounded px-1">{a.locator}</span>}
                      </p>
                      {!a.resolved && (
                        <button className="text-[10px] text-blue-600 hover:underline" onClick={() => toggleResolve(openRound.id, a.id, true)}>Resolve</button>
                      )}
                    </div>
                    <p className="text-xs text-slate-700 mt-1 whitespace-pre-wrap">{a.comment}</p>
                    {a.resolved && <p className="text-[10px] text-emerald-600 mt-1 font-medium">✓ Resolved</p>}
                  </div>
                ))}
              </div>

              <div className="p-3 border-t border-slate-100">
                <Textarea
                  value={annotation}
                  onChange={(e) => setAnnotation(e.target.value)}
                  placeholder="Add review note — e.g. '00:42 — logo is off-brand, use the 2026 mark'…"
                  className="text-xs min-h-16"
                />
                <div className="flex justify-end mt-2">
                  <Button size="sm" className="h-8" onClick={addAnnotation} disabled={!annotation.trim()}>Add note</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
