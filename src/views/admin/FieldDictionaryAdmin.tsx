"use client";
// PM CONTROL TOWER — ADMIN · Field Dictionary
// Dynamic Field Configuration Engine: define up to 500+ custom fields
// (TEXT | NUMBER | DATE | BOOLEAN | DROPDOWN | USER_LOOKUP | EMAIL | URL |
// PHONE | MULTI_SELECT) with search, filters, pagination, a create/edit
// modal (options editor for choice fields) and per-field validation &
// display rules: range, length, integer, unit, placeholder, multiline and a
// default value that prefills new project forms.

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { api, useApi } from "@/lib/client";
import {
  PageHeader, StatCard, SectionCard, Toolbar, SearchInput, DataTable, StatusChip,
  ConfirmButton, Button, Input, cn, type Column,
} from "@/components/pmct/kit";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { RefreshCw, Plus, Pencil, Trash2, ListChecks, X, SlidersHorizontal } from "lucide-react";
import { FIELD_DATA_TYPES, ruleSummary, type FieldConfig, type FieldDataType } from "@/lib/engines/custom-fields";

interface FieldRow {
  id: string;
  fieldKey: string;
  label: string;
  dataType: string;
  options: string[] | null;
  config: FieldConfig | null;
  description: string | null;
  isActive: boolean;
  tabCount: number;
}

const TYPE_TONE: Record<string, string> = {
  TEXT: "bg-slate-100 text-slate-600 border-slate-200",
  NUMBER: "bg-blue-50 text-blue-700 border-blue-200",
  DATE: "bg-violet-50 text-violet-700 border-violet-200",
  BOOLEAN: "bg-amber-50 text-amber-700 border-amber-200",
  DROPDOWN: "bg-emerald-50 text-emerald-700 border-emerald-200",
  USER_LOOKUP: "bg-cyan-50 text-cyan-700 border-cyan-200",
  EMAIL: "bg-teal-50 text-teal-700 border-teal-200",
  URL: "bg-indigo-50 text-indigo-700 border-indigo-200",
  PHONE: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200",
  MULTI_SELECT: "bg-lime-50 text-lime-700 border-lime-200",
};

const PAGE_SIZE = 25;
const CHOICE_TYPES: FieldDataType[] = ["DROPDOWN", "MULTI_SELECT"];
const isChoice = (t: FieldDataType) => CHOICE_TYPES.includes(t);
const STRING_TYPES: FieldDataType[] = ["TEXT", "EMAIL", "URL", "PHONE"];
const isStringy = (t: FieldDataType) => STRING_TYPES.includes(t);

/** Which config keys actually apply to a type — used when the type changes so
 *  stale rules (a min/max left over from a NUMBER) never travel with the field. */
const RELEVANT_KEYS: Record<FieldDataType, (keyof FieldConfig)[]> = {
  TEXT: ["minLength", "maxLength", "multiline", "placeholder", "defaultValue"],
  NUMBER: ["min", "max", "step", "integer", "unit", "placeholder", "defaultValue"],
  DATE: ["defaultValue"],
  BOOLEAN: ["defaultValue"],
  DROPDOWN: ["placeholder", "defaultValue"],
  USER_LOOKUP: ["defaultValue"],
  EMAIL: ["maxLength", "placeholder", "defaultValue"],
  URL: ["maxLength", "placeholder", "defaultValue"],
  PHONE: ["maxLength", "placeholder", "defaultValue"],
  MULTI_SELECT: ["placeholder", "defaultValue"],
};

function defaultValueFits(type: FieldDataType, v: FieldConfig["defaultValue"]): boolean {
  if (v === undefined || v === null || v === "") return true;
  if (type === "NUMBER") return typeof v === "number";
  if (type === "BOOLEAN") return typeof v === "boolean";
  if (type === "MULTI_SELECT") return Array.isArray(v);
  return typeof v === "string";
}

/** Drop the keys the new type ignores (and an incompatible default value). */
function pruneConfig(type: FieldDataType, cfg: FieldConfig): FieldConfig {
  const allowed = RELEVANT_KEYS[type];
  const next: FieldConfig = {};
  for (const k of allowed) {
    const v = cfg[k];
    if (v === undefined || v === null || v === "") continue;
    next[k] = v as never;
  }
  if (!defaultValueFits(type, next.defaultValue)) delete next.defaultValue;
  return next;
}

/** Compact config → payload (empty object becomes null so rules can be cleared). */
function buildConfig(cfg: FieldConfig): Record<string, unknown> | null {
  const out: Record<string, unknown> = {};
  const put = (k: keyof FieldConfig, v: unknown) => {
    if (v === undefined || v === null || v === "") return;
    if (typeof v === "number" && !Number.isFinite(v)) return;
    out[k] = v;
  };
  put("min", cfg.min);
  put("max", cfg.max);
  put("step", cfg.step);
  if (cfg.integer) out.integer = true;
  put("unit", cfg.unit);
  put("minLength", cfg.minLength);
  put("maxLength", cfg.maxLength);
  if (cfg.multiline) out.multiline = true;
  put("placeholder", cfg.placeholder);
  put("defaultValue", cfg.defaultValue);
  return Object.keys(out).length ? out : null;
}

interface FieldDraft {
  id: string | null;
  fieldKey: string;
  label: string;
  dataType: FieldDataType;
  options: string[];
  config: FieldConfig;
  description: string;
  isActive: boolean;
}

const EMPTY_DRAFT: FieldDraft = {
  id: null, fieldKey: "", label: "", dataType: "TEXT",
  options: [], config: {}, description: "", isActive: true,
};

/** Numeric input that maps an empty/invalid entry back to "no rule" (undefined). */
function NumberRule({ label, value, onChange, hint, step }: {
  label: string; value: number | undefined; onChange: (v: number | undefined) => void; hint?: string; step?: number;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] text-slate-500">{label}</Label>
      <Input
        type="number"
        className="h-8 text-xs"
        value={value ?? ""}
        step={step}
        placeholder={hint}
        onChange={(e) => {
          const raw = e.target.value;
          const n = Number(raw);
          onChange(raw === "" || !Number.isFinite(n) ? undefined : n);
        }}
      />
    </div>
  );
}

export default function FieldDictionaryAdmin() {
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [page, setPage] = useState(0);

  const query = useMemo(() => {
    const params = new URLSearchParams({ take: String(PAGE_SIZE), skip: String(page * PAGE_SIZE) });
    if (q.trim()) params.set("q", q.trim());
    if (typeFilter !== "ALL") params.set("dataType", typeFilter);
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    return `/api/fields?${params.toString()}`;
  }, [q, typeFilter, statusFilter, page]);

  const data = useApi<{ fields: FieldRow[]; total: number; take: number; skip: number }>(query);

  const [draft, setDraft] = useState<FieldDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [optionInput, setOptionInput] = useState("");

  const fields = data.data?.fields ?? [];
  const total = data.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const openCreate = () => { setDraft({ ...EMPTY_DRAFT }); setOptionInput(""); };
  const openEdit = (row: FieldRow) => {
    setDraft({
      id: row.id, fieldKey: row.fieldKey, label: row.label,
      dataType: (FIELD_DATA_TYPES as readonly string[]).includes(row.dataType) ? row.dataType as FieldDataType : "TEXT",
      options: row.options ?? [], config: row.config ?? {},
      description: row.description ?? "", isActive: row.isActive,
    });
    setOptionInput("");
  };

  const changeType = (dataType: FieldDataType) => {
    if (!draft) return;
    setDraft({ ...draft, dataType, config: pruneConfig(dataType, draft.config) });
  };

  const addOption = () => {
    const v = optionInput.trim();
    if (!v || !draft) return;
    if (draft.options.includes(v)) { toast.error("Option already exists"); return; }
    setDraft({ ...draft, options: [...draft.options, v] });
    setOptionInput("");
  };

  const save = async () => {
    if (!draft) return;
    if (!draft.label.trim()) { toast.error("Label is required"); return; }
    if (!draft.id && !/^[a-z][a-z0-9_]{1,63}$/.test(draft.fieldKey)) {
      toast.error("Field key must be snake_case (a-z, 0-9, _)");
      return;
    }
    if (isChoice(draft.dataType) && draft.options.length === 0) {
      toast.error(`${draft.dataType} fields need at least one option`);
      return;
    }
    const c = draft.config;
    if (c.min !== undefined && c.max !== undefined && c.min > c.max) {
      toast.error("Minimum cannot exceed maximum");
      return;
    }
    if (c.minLength !== undefined && c.maxLength !== undefined && c.minLength > c.maxLength) {
      toast.error("Min length cannot exceed max length");
      return;
    }
    if (draft.dataType === "DROPDOWN" && typeof c.defaultValue === "string" && c.defaultValue
      && !draft.options.includes(c.defaultValue)) {
      toast.error("Default value must be one of the options");
      return;
    }
    if (draft.dataType === "MULTI_SELECT" && Array.isArray(c.defaultValue)
      && c.defaultValue.some((v) => !draft.options.includes(v))) {
      toast.error("Default selections must all be options");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        label: draft.label.trim(),
        dataType: draft.dataType,
        options: isChoice(draft.dataType) ? draft.options : null,
        config: buildConfig(c),
        description: draft.description.trim() || null,
        isActive: draft.isActive,
      };
      if (draft.id) {
        await api.patch(`/api/fields/${draft.id}`, payload);
        toast.success(`Field "${payload.label}" updated`);
      } else {
        await api.post("/api/fields", { fieldKey: draft.fieldKey.trim(), ...payload });
        toast.success(`Field "${payload.label}" created`);
      }
      setDraft(null);
      await data.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: FieldRow) => {
    try {
      const res = await api.del<{ purgedFromProjects: number }>(`/api/fields/${row.id}`);
      toast.success(`Field deleted${res.purgedFromProjects ? ` (value purged from ${res.purgedFromProjects} project(s))` : ""}`);
      await data.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const columns: Column<FieldRow & Record<string, unknown>>[] = [
    {
      key: "fieldKey", header: "Key",
      render: (r) => <span className="font-mono text-xs text-slate-600">{r.fieldKey}</span>,
    },
    { key: "label", header: "Label", render: (r) => <span className="font-medium text-slate-800">{r.label}</span> },
    {
      key: "dataType", header: "Type",
      render: (r) => (
        <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium", TYPE_TONE[r.dataType] || "bg-slate-100 text-slate-600 border-slate-200")}>
          {r.dataType}
        </span>
      ),
    },
    {
      key: "options", header: "Options",
      render: (r) => isChoice(r.dataType as FieldDataType)
        ? <span className="text-xs text-slate-500">{(r.options ?? []).join(", ") || "—"}</span>
        : <span className="text-xs text-slate-300">—</span>,
    },
    {
      key: "config", header: "Rules",
      render: (r) => {
        const summary = ruleSummary(r.config);
        return summary
          ? <span className="text-xs text-slate-600" title={summary}>{summary}</span>
          : <span className="text-xs text-slate-300">—</span>;
      },
    },
    {
      key: "tabCount", header: "Used in",
      render: (r) => <span className="text-xs tabular-nums text-slate-500">{r.tabCount} tab{r.tabCount === 1 ? "" : "s"}</span>,
    },
    { key: "isActive", header: "Status", render: (r) => <StatusChip status={r.isActive ? "ACTIVE" : "INACTIVE"} /> },
    {
      key: "actions", header: "", className: "text-right",
      render: (r) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(r as FieldRow)} title="Edit">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <ConfirmButton
            title={`Delete field "${r.label}"?`}
            description={`The field is removed from ${r.tabCount} tab(s). Stored values are purged from every project's custom data. This cannot be undone.`}
            confirmLabel="Delete field"
            variant="destructive"
            onConfirm={() => remove(r as FieldRow)}
          >
            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600" title="Delete">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </ConfirmButton>
        </div>
      ),
    },
  ];

  const cfg = draft?.config;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Field Dictionary"
        breadcrumb={["Administration", "Field Dictionary"]}
        subtitle="The Dynamic Field Configuration Engine — define custom fields once (with validation rules), assign them to project form tabs, and store values on each project record as structured JSON."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={data.refetch}><RefreshCw className="h-4 w-4 mr-1.5" /> Refresh</Button>
            <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1.5" /> New field</Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Fields defined" value={total} icon={<ListChecks className="h-4 w-4" />} />
        <StatCard label="Active" value={fields.filter((f) => f.isActive).length} sub={`of ${fields.length} on this page`} tone="good" />
        <StatCard label="Data types" value={new Set(fields.map((f) => f.dataType)).size} sub={FIELD_DATA_TYPES.join(" · ")} tone="info" />
      </div>

      <SectionCard title="Dictionary" description="Search, filter, and edit the custom field catalog — double-click a row to edit">
        <div className="space-y-3">
          <Toolbar>
            <SearchInput value={q} onChange={(v) => { setQ(v); setPage(0); }} placeholder="Search key or label…" className="w-64" />
            <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(0); }}>
              <SelectTrigger className="h-9 w-44"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All types</SelectItem>
                {FIELD_DATA_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
              <SelectTrigger className="h-9 w-36"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </Toolbar>

          <DataTable
            columns={columns}
            rows={fields as unknown as (FieldRow & Record<string, unknown>)[]}
            keyField="id"
            onRowDoubleClick={(r) => openEdit(r as unknown as FieldRow)}
            emptyTitle="No fields yet"
            emptyDescription="Create your first custom field — it becomes available to every project form tab."
          />

          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{total} field{total === 1 ? "" : "s"} · page {page + 1} of {pages}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="h-7" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button>
              <Button variant="outline" size="sm" className="h-7" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>Next</Button>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Create / edit modal */}
      <Dialog open={draft !== null} onOpenChange={(open) => { if (!open) setDraft(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{draft?.id ? `Edit field — ${draft.fieldKey}` : "New custom field"}</DialogTitle>
          </DialogHeader>
          {draft && cfg && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="fd-label" className="text-xs">Label *</Label>
                  <Input id="fd-label" className="h-9" value={draft.label} placeholder="Delivery Region"
                    onChange={(e) => setDraft({ ...draft, label: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="fd-key" className="text-xs">Field key {draft.id ? "" : "*"}</Label>
                  <Input id="fd-key" className="h-9 font-mono text-xs" value={draft.fieldKey} placeholder="delivery_region"
                    disabled={!!draft.id}
                    onChange={(e) => setDraft({ ...draft, fieldKey: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })} />
                  {!draft.id && <p className="text-[11px] text-slate-400">snake_case machine name — immutable after creation</p>}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Data type</Label>
                <Select value={draft.dataType} onValueChange={(v) => changeType(v as FieldDataType)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FIELD_DATA_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-slate-400">
                  {draft.dataType === "EMAIL" && "Format-checked email address (name@domain.tld)."}
                  {draft.dataType === "URL" && "Format-checked web address (https:// is assumed when missing)."}
                  {draft.dataType === "PHONE" && "Phone number — 7 to 15 digits, +, spaces, dashes and brackets allowed."}
                  {draft.dataType === "MULTI_SELECT" && "Pick any number of options (stored as a string array)."}
                  {draft.dataType === "DROPDOWN" && "Pick exactly one option."}
                  {draft.dataType === "TEXT" && "Single or long-form text (enable long text below for a textarea)."}
                  {draft.dataType === "NUMBER" && "Numeric value with optional range, unit and whole-number rule."}
                  {draft.dataType === "DATE" && "Calendar date (yyyy-mm-dd)."}
                  {draft.dataType === "BOOLEAN" && "Yes / no toggle."}
                  {draft.dataType === "USER_LOOKUP" && "Picks a user from the platform directory."}
                </p>
              </div>

              {isChoice(draft.dataType) && (
                <div className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50/40 p-3">
                  <Label className="text-xs">{draft.dataType === "DROPDOWN" ? "Dropdown options *" : "Multi-select options *"}</Label>
                  {draft.options.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {draft.options.map((opt) => (
                        <span key={opt} className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-white px-2 py-0.5 text-xs text-slate-700">
                          {opt}
                          <button type="button" className="text-slate-400 hover:text-red-500" onClick={() => setDraft({ ...draft, options: draft.options.filter((o) => o !== opt) })}>
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Input className="h-8 flex-1" value={optionInput} placeholder="Add an option…"
                      onChange={(e) => setOptionInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addOption(); } }} />
                    <Button variant="outline" size="sm" className="h-8" onClick={addOption}>Add</Button>
                  </div>
                </div>
              )}

              {/* ---- Validation & display rules ---- */}
              <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
                    <SlidersHorizontal className="h-3.5 w-3.5" /> Validation &amp; display rules
                  </Label>
                  <span className="text-[10px] text-slate-400">optional</span>
                </div>

                {draft.dataType === "NUMBER" && (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <NumberRule label="Min" value={cfg.min} onChange={(v) => setDraft({ ...draft, config: { ...cfg, min: v } })} hint="−∞" />
                    <NumberRule label="Max" value={cfg.max} onChange={(v) => setDraft({ ...draft, config: { ...cfg, max: v } })} hint="∞" />
                    <NumberRule label="Step" value={cfg.step} onChange={(v) => setDraft({ ...draft, config: { ...cfg, step: v } })} hint="any" step={0.1} />
                    <div className="space-y-1">
                      <Label className="text-[11px] text-slate-500">Unit</Label>
                      <Input className="h-8 text-xs" value={cfg.unit ?? ""} placeholder="% / hrs / USD" maxLength={16}
                        onChange={(e) => setDraft({ ...draft, config: { ...cfg, unit: e.target.value || undefined } })} />
                    </div>
                    <div className="col-span-full flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2">
                      <div>
                        <p className="text-xs font-medium text-slate-700">Whole numbers only</p>
                        <p className="text-[11px] text-slate-400">Rejects 12.5 — for counts, headcount, quantities</p>
                      </div>
                      <Switch checked={cfg.integer === true} onCheckedChange={(v) => setDraft({ ...draft, config: { ...cfg, integer: v || undefined } })} />
                    </div>
                  </div>
                )}

                {isStringy(draft.dataType) && (
                  <div className="grid grid-cols-2 gap-3">
                    <NumberRule label="Min characters" value={cfg.minLength} onChange={(v) => setDraft({ ...draft, config: { ...cfg, minLength: v } })} hint="0" />
                    <NumberRule label="Max characters" value={cfg.maxLength} onChange={(v) => setDraft({ ...draft, config: { ...cfg, maxLength: v } })} hint="2000" />
                  </div>
                )}

                {isChoice(draft.dataType) && draft.options.length > 0 && draft.dataType === "DROPDOWN" && (
                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-500">Default option (prefills new forms)</Label>
                    <Select value={typeof cfg.defaultValue === "string" && cfg.defaultValue ? cfg.defaultValue : "__none__"}
                      onValueChange={(v) => setDraft({ ...draft, config: { ...cfg, defaultValue: v === "__none__" ? undefined : v } })}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">No default</SelectItem>
                        {draft.options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {draft.dataType === "MULTI_SELECT" && draft.options.length > 0 && (
                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-slate-500">Default selections (prefills new forms)</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {draft.options.map((opt) => {
                        const picked = Array.isArray(cfg.defaultValue) && cfg.defaultValue.includes(opt);
                        return (
                          <button
                            key={opt} type="button"
                            className={cn("rounded-md border px-2 py-0.5 text-xs transition-colors",
                              picked ? "border-lime-300 bg-lime-50 text-lime-700" : "border-slate-200 bg-white text-slate-500 hover:border-slate-300")}
                            onClick={() => {
                              const current = Array.isArray(cfg.defaultValue) ? cfg.defaultValue as string[] : [];
                              const next = picked ? current.filter((o) => o !== opt) : [...current, opt];
                              setDraft({ ...draft, config: { ...cfg, defaultValue: next.length ? next : undefined } });
                            }}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {draft.dataType === "BOOLEAN" && (
                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-500">Default value (prefills new forms)</Label>
                    <Select value={cfg.defaultValue === true ? "true" : cfg.defaultValue === false ? "false" : "__none__"}
                      onValueChange={(v) => setDraft({ ...draft, config: { ...cfg, defaultValue: v === "__none__" ? undefined : v === "true" } })}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">No default</SelectItem>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {draft.dataType === "NUMBER" && (
                  <NumberRule label="Default value (prefills new forms)" value={typeof cfg.defaultValue === "number" ? cfg.defaultValue : undefined}
                    onChange={(v) => setDraft({ ...draft, config: { ...cfg, defaultValue: v } })} hint="none" />
                )}

                {(isStringy(draft.dataType) || draft.dataType === "DROPDOWN" || draft.dataType === "MULTI_SELECT") && (
                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-500">Placeholder</Label>
                    <Input className="h-8 text-xs" value={cfg.placeholder ?? ""} maxLength={120}
                      placeholder="Hint shown while the field is empty"
                      onChange={(e) => setDraft({ ...draft, config: { ...cfg, placeholder: e.target.value || undefined } })} />
                  </div>
                )}

                {(isStringy(draft.dataType) || draft.dataType === "DATE" || draft.dataType === "USER_LOOKUP") && (
                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-500">
                      Default value {draft.dataType === "DATE" ? "(yyyy-mm-dd)" : draft.dataType === "USER_LOOKUP" ? "(user id)" : ""}
                    </Label>
                    <Input className="h-8 text-xs" value={typeof cfg.defaultValue === "string" ? cfg.defaultValue : ""}
                      placeholder="Prefills new project forms — leave empty for none"
                      onChange={(e) => setDraft({ ...draft, config: { ...cfg, defaultValue: e.target.value || undefined } })} />
                  </div>
                )}

                {draft.dataType === "TEXT" && (
                  <div className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2">
                    <div>
                      <p className="text-xs font-medium text-slate-700">Long text (textarea)</p>
                      <p className="text-[11px] text-slate-400">Renders a multi-line box spanning both form columns</p>
                    </div>
                    <Switch checked={cfg.multiline === true} onCheckedChange={(v) => setDraft({ ...draft, config: { ...cfg, multiline: v || undefined } })} />
                  </div>
                )}

                {RELEVANT_KEYS[draft.dataType].length === 0 && (
                  <p className="text-[11px] text-slate-400">This type has no configurable rules.</p>
                )}

                <p className="text-[11px] text-slate-400">
                  Rules are enforced when a project saves this field — {ruleSummary(cfg) ? `currently: ${ruleSummary(cfg)}` : "no rules configured yet"}.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="fd-desc" className="text-xs">Description (help text)</Label>
                <Textarea id="fd-desc" rows={2} value={draft.description} placeholder="Shown under the field on the project form"
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium text-slate-700">Active</p>
                  <p className="text-[11px] text-slate-400">Inactive fields stop rendering and reject new values</p>
                </div>
                <Switch checked={draft.isActive} onCheckedChange={(v) => setDraft({ ...draft, isActive: v })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Saving…" : draft?.id ? "Save changes" : "Create field"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
