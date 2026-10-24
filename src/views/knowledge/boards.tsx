"use client";
// PM CONTROL TOWER — Message Boards (Command Center v3.0 — Basecamp analog)
// Project-wide announcements and discussions, distinct from task comments.

import { useEffect, useMemo, useState } from "react";
import { useApi, api } from "@/lib/client";
import { PageHeader, StatCard, SectionCard, LoadingBlock, ErrorBlock, EmptyState, StatusChip, SearchInput } from "@/components/pmct/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { fmtDateTime } from "@/lib/constants";
import { MessagesSquare, Plus, Pin, Send, MessageCircle } from "lucide-react";

interface ThreadRow {
  id: string; title: string; category: string; pinned: boolean; replyCount: number;
  lastActivityAt: string; createdAt: string; createdByName: string | null;
  project: { id: string; code: string; name: string } | null;
}
interface CommentRow { id: string; authorName: string; body: string; createdAt: string }

const CATEGORIES = ["GENERAL", "ANNOUNCEMENTS", "STANDUP", "Q_AND_A", "RISKS", "WINS"] as const;

function NewThreadDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("GENERAL");
  const [projectId, setProjectId] = useState("none");
  const [firstComment, setFirstComment] = useState("");
  const [busy, setBusy] = useState(false);
  const projects = useApi<{ items: { id: string; code: string; name: string }[] }>(open ? "/api/projects?take=500" : null);

  const submit = async () => {
    if (!title.trim()) { toast.error("Title is required"); return; }
    setBusy(true);
    try {
      await api.post("/api/message-boards", {
        title: title.trim(), category,
        projectId: projectId !== "none" ? projectId : null,
        firstComment: firstComment.trim() || null,
      });
      toast.success("Thread started");
      setOpen(false); setTitle(""); setFirstComment("");
      onCreated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to start thread");
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" className="h-8 gap-1.5" onClick={() => setOpen(true)}><Plus className="h-3.5 w-3.5" />New thread</Button>
      <DialogContent>
        <DialogHeader><DialogTitle>Start a discussion</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-600">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Weekly delivery sync — move to Thursdays?" className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600">Category</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c.replace("_", " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Project (optional)</label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">All projects</SelectItem>
                  {(projects.data?.items || []).map((p) => <SelectItem key={p.id} value={p.id}>{p.code} — {p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Opening message</label>
            <Textarea value={firstComment} onChange={(e) => setFirstComment(e.target.value)} placeholder="Set the context for the discussion…" className="mt-1 min-h-20" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>{busy ? "Posting…" : "Start thread"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function MessageBoardsView() {
  const [search, setSearch] = useState("");
  const [openThreadId, setOpenThreadId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  const threads = useApi<{ threads: ThreadRow[]; summary: { total: number; pinned: number; recentActivity: number } }>("/api/message-boards");
  const detail = useApi<{ thread: ThreadRow; comments: CommentRow[] }>(openThreadId ? `/api/message-boards/${openThreadId}` : null);

  // Reset reply box when switching threads
  useEffect(() => { setReply(""); }, [openThreadId]);

  const q = search.toLowerCase();
  const list = useMemo(
    () => (threads.data?.threads || []).filter((t) => !q || t.title.toLowerCase().includes(q) || (t.project?.code || "").toLowerCase().includes(q)),
    [threads.data, q]
  );

  const togglePin = async (t: ThreadRow) => {
    try {
      await api.patch(`/api/message-boards/${t.id}`, { pinned: !t.pinned });
      threads.refetch();
      if (openThreadId === t.id) detail.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  };

  const sendReply = async () => {
    if (!openThreadId || !reply.trim()) return;
    setSending(true);
    try {
      await api.post(`/api/message-boards/${openThreadId}`, { body: reply.trim() });
      setReply("");
      detail.refetch();
      threads.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reply failed");
    } finally { setSending(false); }
  };

  if (threads.error) return <ErrorBlock message={threads.error} onRetry={threads.refetch} />;

  const openThread = detail.data?.thread || null;
  const comments = detail.data?.comments || [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Message Boards"
        subtitle="Project-level announcements, standups and Q&A — team alignment kept out of task comments but linked to projects."
        breadcrumb={["Home", "Knowledge", "Message Boards"]}
        actions={
          <div className="flex items-center gap-2">
            <SearchInput value={search} onChange={setSearch} placeholder="Search threads…" className="w-44" />
            <NewThreadDialog onCreated={threads.refetch} />
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Threads" value={threads.data?.summary.total ?? "—"} icon={<MessagesSquare className="h-4 w-4" />} />
        <StatCard label="Pinned" value={threads.data?.summary.pinned ?? "—"} icon={<Pin className="h-4 w-4" />} />
        <StatCard label="Active this week" value={threads.data?.summary.recentActivity ?? "—"} icon={<MessageCircle className="h-4 w-4" />} />
        <StatCard label="Replies" value={(threads.data?.threads || []).reduce((s, t) => s + t.replyCount, 0)} icon={<Send className="h-4 w-4" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-4 items-start">
        {/* Thread list */}
        <SectionCard title="Discussions" bodyClass="p-2 max-h-[620px] overflow-y-auto">
          {threads.loading ? <LoadingBlock /> : list.length === 0 ? (
            <EmptyState title="No threads" description="Start the first discussion — announcements work best pinned." />
          ) : list.map((t) => (
            <button
              key={t.id}
              onClick={() => setOpenThreadId(t.id)}
              className={cn(
                "w-full text-left rounded-lg px-3 py-2.5 transition-colors border",
                openThreadId === t.id ? "bg-blue-50 border-blue-200" : "border-transparent hover:bg-slate-50"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-semibold text-slate-800 leading-snug">
                  {t.pinned && <Pin className="h-3 w-3 inline mr-1 text-blue-600 -mt-0.5" />}{t.title}
                </p>
                <span className="text-[10px] text-slate-400 shrink-0">{t.replyCount} 💬</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600">{t.category.replace("_", " ")}</span>
                {t.project && <span className="text-[10px] text-blue-700">{t.project.code}</span>}
                <span className="text-[10px] text-slate-400">· {t.createdByName || "—"} · {fmtDateTime(t.lastActivityAt)}</span>
              </div>
            </button>
          ))}
        </SectionCard>

        {/* Thread detail */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm min-h-[420px]">
          {!openThread ? (
            <EmptyState title="Select a thread" description="Pick a discussion to read and reply." />
          ) : (
            <div className="flex flex-col h-full">
              <div className="p-4 border-b border-slate-100 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">{openThread.title}</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {openThread.category.replace("_", " ")}{openThread.project ? ` · ${openThread.project.code} — ${openThread.project.name}` : ""} · started by {openThread.createdByName || "—"} · {fmtDateTime(openThread.createdAt)}
                  </p>
                </div>
                <Button size="sm" variant={openThread.pinned ? "default" : "outline"} className="h-8 gap-1.5" onClick={() => togglePin(openThread)}>
                  <Pin className="h-3.5 w-3.5" />{openThread.pinned ? "Pinned" : "Pin"}
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[420px]">
                {detail.loading ? <LoadingBlock label="Loading messages…" /> : comments.length === 0 ? (
                  <EmptyState title="No messages yet" description="Post the first reply below." />
                ) : comments.map((c) => (
                  <div key={c.id} className="flex gap-3">
                    <span
                      className="h-7 w-7 rounded-full text-[10px] font-bold text-white flex items-center justify-center shrink-0 bg-[#1e3a5f]"
                      aria-hidden
                    >
                      {c.authorName.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                    </span>
                    <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 flex-1">
                      <p className="text-[11px] font-semibold text-slate-700">{c.authorName} <span className="font-normal text-slate-400 ml-1">{fmtDateTime(c.createdAt)}</span></p>
                      <p className="text-xs text-slate-700 mt-1 whitespace-pre-wrap leading-relaxed">{c.body}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t border-slate-100 flex gap-2">
                <Input
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                  placeholder="Reply… (Enter to send)"
                  className="text-xs"
                />
                <Button size="sm" className="h-9 gap-1.5" onClick={sendReply} disabled={sending || !reply.trim()}><Send className="h-3.5 w-3.5" />Reply</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
