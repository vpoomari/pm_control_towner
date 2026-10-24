"use client";
// PM CONTROL TOWER — Feedback & Roadmap (Command Center v3.0 — Aha!/Productboard analog)
// Feature voting board, feedback triage, and a quarter-based roadmap linked to strategy.

import { useMemo, useState } from "react";
import { useApi, api } from "@/lib/client";
import { PageHeader, StatCard, SectionCard, LoadingBlock, ErrorBlock, EmptyState, StatusChip, SearchInput, ConfirmButton, ProgressBar } from "@/components/pmct/kit";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { fmtDate } from "@/lib/constants";
import { Megaphone, ThumbsUp, Map, Plus, ChevronUp, Trash2, Sparkles } from "lucide-react";

interface FeedbackPostRow {
  id: string; title: string; body: string | null; category: string; source: string; status: string;
  submittedByName: string | null; votesCount: number; createdAt: string; updatedAt: string;
  project: { id: string; code: string; name: string } | null;
  roadmapItem: { id: string; title: string; quarter: string; status: string } | null;
  _count?: { votes: number };
}
interface RoadmapItemRow {
  id: string; title: string; description: string | null; quarter: string; status: string;
  progress: number; releaseTag: string | null;
  project: { id: string; code: string; name: string } | null;
  linkedFeedback: { id: string; title: string; votesCount: number }[];
}

function SubmitFeedbackDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("FEATURE");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!title.trim()) { toast.error("Title is required"); return; }
    setBusy(true);
    try {
      await api.post("/api/feedback", { title: title.trim(), body: body.trim() || null, category, source: "INTERNAL" });
      toast.success("Feedback submitted");
      setOpen(false); setTitle(""); setBody("");
      onCreated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to submit");
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" className="h-8 gap-1.5" onClick={() => setOpen(true)}><Plus className="h-3.5 w-3.5" />Submit feedback</Button>
      <DialogContent>
        <DialogHeader><DialogTitle>Submit feedback</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-600">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Bulk import of timesheets from CSV" className="mt-1" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Detail</label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Context, use case, affected teams…" className="mt-1 min-h-20" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Category</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>{["BUG", "FEATURE", "IDEA", "INTEGRATION", "UX"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>{busy ? "Submitting…" : "Submit"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewRoadmapDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [quarter, setQuarter] = useState("2026-Q4");
  const [status, setStatus] = useState("PLANNED");
  const [busy, setBusy] = useState(false);

  const quarters = useMemo(() => {
    const now = new Date();
    const out: string[] = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i * 3, 1);
      out.push(`${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`);
    }
    return [...new Set(out)];
  }, []);

  const submit = async () => {
    if (!title.trim()) { toast.error("Title is required"); return; }
    setBusy(true);
    try {
      await api.post("/api/roadmap", { title: title.trim(), quarter, status });
      toast.success("Roadmap item created");
      setOpen(false); setTitle("");
      onCreated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create");
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => setOpen(true)}><Map className="h-3.5 w-3.5" />New roadmap item</Button>
      <DialogContent>
        <DialogHeader><DialogTitle>New roadmap item</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-600">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Timesheet automation pack" className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600">Quarter</label>
              <Select value={quarter} onValueChange={setQuarter}>
                <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{quarters.map((q) => <SelectItem key={q} value={q}>{q}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Status</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{["PLANNED", "COMMITTED", "IN_PROGRESS", "SHIPPED", "DEFERRED"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>{busy ? "Creating…" : "Create"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FeedbackCard({ post, onVoted, canTriage, onTriage }: {
  post: FeedbackPostRow; onVoted: () => void; canTriage: boolean; onTriage: (p: FeedbackPostRow, status: string) => void;
}) {
  const [voting, setVoting] = useState(false);
  const vote = async () => {
    setVoting(true);
    try {
      await api.post(`/api/feedback/${post.id}/vote`);
      onVoted();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Vote failed");
    } finally { setVoting(false); }
  };

  return (
    <div className={cn("rounded-lg border bg-white p-3 flex gap-3", post.status === "SHIPPED" ? "border-emerald-200" : "border-slate-200")}>
      <button
        onClick={vote}
        disabled={voting}
        className="flex flex-col items-center justify-center rounded-lg border border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-blue-50 transition-colors w-12 h-14 shrink-0 disabled:opacity-50"
        aria-label={`Vote for ${post.title}`}
      >
        <ChevronUp className="h-4 w-4 text-slate-500" />
        <span className="text-sm font-bold tabular-nums text-slate-700">{post.votesCount}</span>
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-slate-800 leading-snug">{post.title}</p>
          <StatusChip status={post.status} />
        </div>
        {post.body && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{post.body}</p>}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600">{post.category}</span>
          <span className="text-[10px] text-slate-400">{post.submittedByName || "Anonymous"} · {fmtDate(post.createdAt)}</span>
          {post.roadmapItem && (
            <span className="text-[10px] text-blue-700 bg-blue-50 border border-blue-100 rounded px-1.5 py-0.5">
              → {post.roadmapItem.quarter} · {post.roadmapItem.title}
            </span>
          )}
        </div>
        {canTriage && post.status !== "SHIPPED" && (
          <div className="flex gap-1 mt-2">
            {["UNDER_REVIEW", "PLANNED", "IN_PROGRESS", "SHIPPED", "DECLINED"].map((s) => (
              <button
                key={s}
                onClick={() => onTriage(post, s)}
                className={cn("text-[10px] px-1.5 py-0.5 rounded border transition-colors",
                  post.status === s ? "bg-blue-600 text-white border-blue-600" : "border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-700")}
              >
                {s === "UNDER_REVIEW" ? "REVIEW" : s.replace("_", " ")}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function FeedbackRoadmapView() {
  const [tab, setTab] = useState("feedback");
  const [search, setSearch] = useState("");

  const feedback = useApi<{ posts: FeedbackPostRow[]; summary: { total: number; newCount: number; shipped: number; topVoted: { title: string; votes: number } | null } }>("/api/feedback");
  const roadmap = useApi<{ items: RoadmapItemRow[]; quarters: string[]; summary: { total: number; shipped: number; avgProgress: number; linkedFeedback: number } }>("/api/roadmap");

  const q = search.toLowerCase();
  const posts = useMemo(() => (feedback.data?.posts || []).filter((p) => !q || p.title.toLowerCase().includes(q)), [feedback.data, q]);
  const items = useMemo(() => (roadmap.data?.items || []).filter((i) => !q || i.title.toLowerCase().includes(q)), [roadmap.data, q]);

  const triage = async (post: FeedbackPostRow, status: string) => {
    try {
      await api.patch(`/api/feedback/${post.id}`, { status });
      toast.success(`Feedback → ${status.replace("_", " ").toLowerCase()}`);
      feedback.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Triage failed");
    }
  };

  const removePost = async (post: FeedbackPostRow) => {
    try {
      await api.del(`/api/feedback/${post.id}`);
      toast.success("Feedback removed");
      feedback.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const advanceRoadmap = async (item: RoadmapItemRow, status: string) => {
    try {
      await api.patch(`/api/roadmap/${item.id}`, { status });
      roadmap.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  };

  if (feedback.error) return <ErrorBlock message={feedback.error} onRetry={feedback.refetch} />;
  if (roadmap.error) return <ErrorBlock message={roadmap.error} onRetry={roadmap.refetch} />;

  const quarters = [...new Set(items.map((i) => i.quarter))].sort();

  return (
    <div className="space-y-5">
      <PageHeader
        title="Feedback & Roadmap"
        subtitle="Customer and internal feedback portal with feature voting, triage workflow, and a strategic roadmap — demand signals wired to delivery planning."
        breadcrumb={["Home", "Strategy", "Feedback & Roadmap"]}
        actions={
          <div className="flex items-center gap-2">
            <SearchInput value={search} onChange={setSearch} placeholder="Search…" className="w-44" />
            <NewRoadmapDialog onCreated={roadmap.refetch} />
            <SubmitFeedbackDialog onCreated={feedback.refetch} />
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Feedback posts" value={feedback.data?.summary.total ?? "—"} sub={`${feedback.data?.summary.newCount ?? 0} awaiting triage`} icon={<Megaphone className="h-4 w-4" />} />
        <StatCard label="Top voted" value={feedback.data?.summary.topVoted?.votes ?? "—"} sub={feedback.data?.summary.topVoted?.title || "No votes yet"} icon={<ThumbsUp className="h-4 w-4" />} />
        <StatCard label="Roadmap items" value={roadmap.data?.summary.total ?? "—"} sub={`${roadmap.data?.summary.shipped ?? 0} shipped`} icon={<Map className="h-4 w-4" />} />
        <StatCard label="Linked demand" value={roadmap.data?.summary.linkedFeedback ?? "—"} sub="feedback posts mapped to roadmap" icon={<Sparkles className="h-4 w-4" />} />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-9">
          <TabsTrigger value="feedback" className="text-xs">Feedback board</TabsTrigger>
          <TabsTrigger value="roadmap" className="text-xs">Roadmap</TabsTrigger>
        </TabsList>

        <TabsContent value="feedback" className="mt-4">
          <SectionCard title="Feedback board" description="Voting surface — one vote per user per post, toggled on click. Sorted by demand." bodyClass="p-3">
            {feedback.loading ? <LoadingBlock /> : posts.length === 0 ? (
              <EmptyState title="No feedback yet" description="Submit the first post to start collecting demand signals." />
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {posts.map((p) => (
                  <div key={p.id} className="relative">
                    <FeedbackCard post={p} onVoted={feedback.refetch} canTriage onTriage={triage} />
                    <ConfirmButton onConfirm={() => removePost(p)} title="Delete feedback?" description={`"${p.title}" and its votes will be removed.`} confirmLabel="Delete">
                      <button className="absolute top-2 right-2 text-slate-300 hover:text-red-500 opacity-0 hover:opacity-100 transition-opacity" aria-label="Delete feedback"><Trash2 className="h-3.5 w-3.5" /></button>
                    </ConfirmButton>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="roadmap" className="mt-4">
          <SectionCard title="Delivery roadmap" description="Quarter lanes with progress, release tags, and linked demand." bodyClass="p-3">
            {roadmap.loading ? <LoadingBlock /> : items.length === 0 ? (
              <EmptyState title="Roadmap is empty" description="Create the first roadmap item to anchor strategy." />
            ) : (
              <div className="space-y-4">
                {quarters.map((quarter) => (
                  <div key={quarter}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 rounded px-2 py-0.5">{quarter}</span>
                      <span className="text-[10px] text-slate-400">{items.filter((i) => i.quarter === quarter).length} items</span>
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                      {items.filter((i) => i.quarter === quarter).map((i) => (
                        <div key={i.id} className="rounded-lg border border-slate-200 bg-white p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-800">{i.title}</p>
                              {i.releaseTag && <p className="text-[10px] font-mono text-slate-400 mt-0.5">release {i.releaseTag}</p>}
                            </div>
                            <StatusChip status={i.status} />
                          </div>
                          {i.description && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{i.description}</p>}
                          {i.linkedFeedback.length > 0 && (
                            <p className="text-[10px] text-blue-700 mt-1.5">
                              ⟵ {i.linkedFeedback.length} feedback post{i.linkedFeedback.length > 1 ? "s" : ""} ({i.linkedFeedback.reduce((s, f) => s + f.votesCount, 0)} votes)
                            </p>
                          )}
                          <div className="mt-2">
                            <ProgressBar value={i.progress} />
                          </div>
                          <div className="flex gap-1 mt-2">
                            {["COMMITTED", "IN_PROGRESS", "SHIPPED"].map((s) => (
                              <button
                                key={s}
                                onClick={() => advanceRoadmap(i, s)}
                                className={cn("text-[10px] px-1.5 py-0.5 rounded border transition-colors",
                                  i.status === s ? "bg-blue-600 text-white border-blue-600" : "border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-700")}
                              >
                                {s.replace("_", " ")}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
