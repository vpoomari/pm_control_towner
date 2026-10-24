"use client";
// PM CONTROL TOWER — Docs & Knowledge (Command Center v3.0 — Notion/Coda analog)
// Spaces → page tree with markdown editing, search, and live preview.

import { useMemo, useState } from "react";
import { useApi, api } from "@/lib/client";
import { PageHeader, StatCard, LoadingBlock, ErrorBlock, EmptyState, SearchInput, ConfirmButton } from "@/components/pmct/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { fmtDateTime } from "@/lib/constants";
import ReactMarkdown from "react-markdown";
import { FileText, Plus, Save, Trash2, Pencil, Eye, Search } from "lucide-react";

interface DocPageRow {
  id: string; title: string; icon: string; space: string; tags: string | null;
  authorName: string | null; isPublished: boolean; updatedAt: string; content?: string; excerpt?: string;
}

const SPACES = ["GENERAL", "ENGINEERING", "CONSTRUCTION", "FINANCE", "PRODUCT", "GOVERNANCE"] as const;
const SPACE_ICONS: Record<string, string> = {
  GENERAL: "🗂️", ENGINEERING: "⚙️", CONSTRUCTION: "🏗️", FINANCE: "💰", PRODUCT: "🧭", GOVERNANCE: "⚖️",
};

export default function DocsView() {
  const [space, setSpace] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [draftTitle, setDraftTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSpace, setNewSpace] = useState("GENERAL");

  const list = useApi<{ pages: DocPageRow[]; summary: { total: number } }>(
    `/api/docs?${space !== "ALL" ? `space=${space}&` : ""}${search.trim() ? `q=${encodeURIComponent(search.trim())}` : ""}`
  );

  const q = search.toLowerCase();
  const pages = useMemo(() => (list.data?.pages || []), [list.data]);
  const selected = pages.find((p) => p.id === selectedId) || null;

  const loadPage = async (id: string) => {
    setSelectedId(id);
    setEditing(false);
    try {
      const d = await api.get<{ page: DocPageRow }>(`/api/docs/${id}`);
      setDraft(d.page.content || "");
      setDraftTitle(d.page.title);
    } catch {
      toast.error("Failed to open page");
    }
  };

  const createPage = async () => {
    if (!newTitle.trim()) { toast.error("Title is required"); return; }
    setCreating(true);
    try {
      const d = await api.post<{ page: DocPageRow }>("/api/docs", { title: newTitle.trim(), space: newSpace });
      toast.success("Page created");
      setNewTitle("");
      await list.refetch();
      loadPage(d.page.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create page");
    } finally { setCreating(false); }
  };

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await api.patch(`/api/docs/${selected.id}`, { content: draft, title: draftTitle });
      toast.success("Page saved");
      setEditing(false);
      list.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally { setSaving(false); }
  };

  const remove = async (page: DocPageRow) => {
    try {
      await api.del(`/api/docs/${page.id}`);
      toast.success("Page deleted");
      if (selectedId === page.id) { setSelectedId(null); setEditing(false); }
      list.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  if (list.error) return <ErrorBlock message={list.error} onRetry={list.refetch} />;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Docs & Knowledge"
        subtitle="Docs-first workspace: markdown pages organized into spaces, searchable, and linked to projects — decisions live next to delivery."
        breadcrumb={["Home", "Knowledge", "Docs"]}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Pages" value={list.data?.summary.total ?? "—"} icon={<FileText className="h-4 w-4" />} />
        {SPACES.slice(0, 3).map((s) => (
          <StatCard key={s} label={s} value={pages.filter((p) => p.space === s).length} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 items-start">
        {/* Page index */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="p-3 space-y-2 border-b border-slate-100">
            <SearchInput value={search} onChange={setSearch} placeholder="Search pages…" />
            <div className="flex gap-2">
              <Select value={space} onValueChange={setSpace}>
                <SelectTrigger className="h-8 text-xs flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All spaces</SelectItem>
                  {SPACES.map((s) => <SelectItem key={s} value={s}>{SPACE_ICONS[s]} {s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="New page title…" className="h-8 text-xs" />
              <Select value={newSpace} onValueChange={setNewSpace}>
                <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{SPACES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
              <Button size="sm" className="h-8 gap-1" onClick={createPage} disabled={creating}><Plus className="h-3.5 w-3.5" />{creating ? "…" : "Add"}</Button>
            </div>
          </div>
          <div className="max-h-[560px] overflow-y-auto p-2 space-y-1">
            {list.loading ? <LoadingBlock label="Loading index…" /> : pages.length === 0 ? (
              <EmptyState title="No pages" description="Create the first knowledge page above." />
            ) : pages.map((p) => (
              <button
                key={p.id}
                onClick={() => loadPage(p.id)}
                className={cn(
                  "w-full text-left rounded-lg px-2.5 py-2 transition-colors",
                  selectedId === p.id ? "bg-blue-50 border border-blue-200" : "hover:bg-slate-50 border border-transparent"
                )}
              >
                <p className="text-xs font-medium text-slate-800 truncate">{p.icon} {p.title}</p>
                <p className="text-[10px] text-slate-400 truncate">{SPACE_ICONS[p.space] || "📄"} {p.space} · {fmtDateTime(p.updatedAt)}</p>
                {!q && p.excerpt && <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5 text-slate-400">{p.excerpt.slice(0, 80)}</p>}
              </button>
            ))}
          </div>
        </div>

        {/* Page viewer / editor */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm min-h-[400px]">
          {!selected ? (
            <EmptyState title="Select a page" description="Pick a page from the index, or create a new one." action={<Search className="h-5 w-5 text-slate-300" />} />
          ) : (
            <div className="p-4 md:p-6">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h1 className="text-lg font-semibold text-slate-900">{selected.icon} {editing ? draftTitle : selected.title}</h1>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {selected.space} · by {selected.authorName || "—"} · updated {fmtDateTime(selected.updatedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  {editing ? (
                    <>
                      <Button size="sm" className="h-8 gap-1.5" onClick={save} disabled={saving}><Save className="h-3.5 w-3.5" />{saving ? "Saving…" : "Save"}</Button>
                      <Button size="sm" variant="ghost" className="h-8 gap-1.5" onClick={() => { setEditing(false); setDraft(selected.content || ""); setDraftTitle(selected.title); }}><Eye className="h-3.5 w-3.5" />Preview</Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => { setEditing(true); setDraft(selected.content || ""); setDraftTitle(selected.title); }}><Pencil className="h-3.5 w-3.5" />Edit</Button>
                      <ConfirmButton onConfirm={() => remove(selected)} title={`Delete "${selected.title}"?`} description="This page will be removed permanently." confirmLabel="Delete page">
                        <Button size="sm" variant="ghost" className="h-8 text-red-600"><Trash2 className="h-3.5 w-3.5" /></Button>
                      </ConfirmButton>
                    </>
                  )}
                </div>
              </div>
              {editing ? (
                <div className="space-y-2">
                  <Input value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} className="font-medium" aria-label="Page title" />
                  <Textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    className="font-mono text-xs min-h-[420px] leading-relaxed"
                    placeholder="# Heading&#10;&#10;Write markdown here — tables, checklists, links…"
                  />
                </div>
              ) : (
                <div className="prose prose-slate prose-sm max-w-none min-h-[380px]">
                  {draft.trim() ? <ReactMarkdown>{draft}</ReactMarkdown> : <p className="text-slate-400 text-sm">Empty page — click Edit to add content.</p>}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
