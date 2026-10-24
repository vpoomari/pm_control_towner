"use client";
// PM CONTROL TOWER — Admin Control Center (metadata-driven configuration, v1.9.0)

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api, useApi } from "@/lib/client";
import {
  PageHeader, SectionCard, StatCard, StatusChip, LoadingBlock, ErrorBlock, EmptyState, Button, Badge, Input, cn,
} from "@/components/pmct/kit";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Database, Save, Tag, Type, ToggleRight, ShieldCheck, Plus } from "lucide-react";

interface AdminState {
  entities: { entityKey: string; displayName: string; pluralName: string }[];
  fields: { id: string; entityKey: string; internalName: string; displayLabel: string; baseType: string; required: boolean; status: string; sensitive: boolean }[];
  fieldTypes: { id: string; name: string; baseType: string; optionsJson: string | null; display: string }[];
  terminology: { id: string; termKey: string; defaultTerm: string; customTerm: string | null; pluralName: string | null }[];
  naming: { scope: string; style: string; prefix: string; suffix: string; seqPad: number }[];
  flags: { id: string; key: string; enabled: boolean }[];
  settings: { orgName: string; confidentialityLabel: string; currency: string; dateFormat: string };
}
const SECTIONS = ["Overview", "Field Builder", "Terminology", "Naming", "Feature Flags", "Organization"] as const;

export default function AdminView() {
  const state = useApi<AdminState>("/api/admin");
  const [section, setSection] = useState<(typeof SECTIONS)[number]>("Overview");
  const [busy, setBusy] = useState(false);
  const act = async (body: unknown, msg: string) => {
    setBusy(true);
    try { await api.post("/api/admin", body); toast.success(msg); state.refetch(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setBusy(false); }
  };

  // field builder state
  const [fLabel, setFLabel] = useState("");
  const [fEntity, setFEntity] = useState("project");
  const [fType, setFType] = useState("TEXT");
  const [fRequired, setFRequired] = useState(false);
  const [fOptions, setFOptions] = useState("");
  const [fFormula, setFFormula] = useState("");
  const needsOptions = fType === "SELECT" || fType === "MULTI_SELECT" || fType === "RAG";
  const isFormula = fType === "FORMULA";
  const addField = async () => {
    if (!fLabel.trim()) { toast.error("Display label required"); return; }
    if (needsOptions && !fOptions.trim()) { toast.error("Options required for this type (comma separated)"); return; }
    setBusy(true);
    try {
      await api.post("/api/admin", {
        action: "addField", entityKey: fEntity, displayLabel: fLabel.trim(), baseType: fType, required: fRequired,
        options: needsOptions ? fOptions.split(",").map((x) => x.trim()).filter(Boolean) : undefined,
        formula: isFormula ? fFormula || null : undefined,
      });
      toast.success(`Field "${fLabel}" published to ${fEntity}`); setFLabel(""); state.refetch();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setBusy(false); }
  };

  if (state.loading && !state.data) return <LoadingBlock label="Loading control center…" />;
  if (state.error && !state.data) return <ErrorBlock message={state.error} onRetry={state.refetch} />;
  const d = state.data!;

  return (
    <div className="space-y-5">
      <PageHeader
        io="admin"
        title="Admin Control Center"
        subtitle="Metadata-driven configuration — entities, fields, naming conventions, terminology, feature flags and organization settings. Internal identifiers stay stable; only configuration changes."
        breadcrumb={["Home", "Administration", "Control Center"]}
      />

      <div className="flex flex-wrap items-center gap-2">
        {SECTIONS.map((s) => (
          <button key={s} onClick={() => setSection(s)}
            className={cn("px-3 py-1.5 rounded-md text-sm font-medium border transition-colors",
              section === s ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:border-blue-300")}>
            {s}
          </button>
        ))}
      </div>

      {section === "Overview" && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Configured entities" value={d.entities.length} icon={<Database className="h-4 w-4" />} />
          <StatCard label="Custom fields" value={d.fields.length} />
          <StatCard label="Custom field types" value={d.fieldTypes.length} icon={<Type className="h-4 w-4" />} />
          <StatCard label="Feature flags" value={d.flags.filter((f) => f.enabled).length + "/" + d.flags.length} icon={<ToggleRight className="h-4 w-4" />} />
        </div>
      )}

      {/* FIELD BUILDER */}
      {section === "Field Builder" && (
        <div className="space-y-4">
          <SectionCard title="Add field" description="Creates a metadata field on the entity. Internal API name is generated from your naming convention (stable forever); the display label can change anytime. Backend validation enforces required/type/options.">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
              <div className="space-y-1"><Label>Entity</Label>
                <Select value={fEntity} onValueChange={setFEntity}><SelectTrigger className="bg-white"><SelectValue /></SelectTrigger><SelectContent>{d.entities.map((e) => <SelectItem key={e.entityKey} value={e.entityKey}>{e.displayName}</SelectItem>)}</SelectContent></Select>
              </div>
              <div className="space-y-1"><Label>Display label *</Label><Input value={fLabel} onChange={(e) => setFLabel(e.target.value)} placeholder="Business Criticality" /></div>
              <div className="space-y-1"><Label>Base type *</Label>
                <Select value={fType} onValueChange={setFType}><SelectTrigger className="bg-white"><SelectValue /></SelectTrigger><SelectContent>{["TEXT", "LONG_TEXT", "NUMBER", "CURRENCY", "PERCENT", "DATE", "BOOLEAN", "SELECT", "MULTI_SELECT", "RAG", "SCORE", "RATING", "USER", "FORMULA"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
              </div>
              {needsOptions && <div className="space-y-1 sm:col-span-2 lg:col-span-3"><Label>Options (comma separated)</Label><Input value={fOptions} onChange={(e) => setFOptions(e.target.value)} placeholder="Low, Medium, High, Critical" /></div>}
              {isFormula && <div className="space-y-1 sm:col-span-2 lg:col-span-3"><Label>Formula — field refs in {} · + - * / only (no code execution)</Label><Input value={fFormula} onChange={(e) => setFFormula(e.target.value)} placeholder="{probability} * {impact}" /></div>}
              <div className="flex items-center gap-2 pb-1">
                <input id="req" type="checkbox" checked={fRequired} onChange={(e) => setFRequired(e.target.checked)} />
                <Label htmlFor="req" className="text-xs">Required</Label>
              </div>
            </div>
            <Button disabled={busy} onClick={() => void addField()}><Plus className="h-4 w-4 mr-1.5" />Publish field</Button>
          </SectionCard>
          <SectionCard title="Configured fields" description="All metadata fields across entities (ARCHIVED fields are hidden from forms but never deleted)">
            {d.fields.length === 0 ? <EmptyState title="No metadata fields yet" /> : (
              <div className="space-y-1.5">
                {d.fields.map((f) => (
                  <div key={f.id} className="flex flex-wrap items-center gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm">
                    <span className="font-mono text-xs text-slate-400 w-24">{f.entityKey}</span>
                    <span className="font-medium text-slate-800 flex-1 truncate">{f.displayLabel}</span>
                    <code className="text-[11px] text-slate-400">{f.internalName}</code>
                    <Badge variant="outline" className="border-slate-200 text-slate-500">{f.baseType}</Badge>
                    {f.required && <Badge variant="outline" className="border-red-200 text-red-600">required</Badge>}
                    {f.sensitive && <Badge variant="outline" className="border-purple-200 text-purple-600">sensitive</Badge>}
                    <StatusChip status={f.status} />
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {/* TERMINOLOGY */}
      {section === "Terminology" && (
        <SectionCard title="Enterprise terminology dictionary" description="Rename application terms organization-wide — internal identifiers stay stable.">
          <div className="space-y-1.5">
            {d.terminology.map((t) => <TerminologyRow key={t.id} term={t} busy={busy} onSave={act} />)}
          </div>
        </SectionCard>
      )}

      {/* NAMING */}
      {section === "Naming" && (
        <SectionCard title="Naming conventions" description="How internal names are generated from display labels, plus entity code patterns.">
          <div className="space-y-2">
            {d.naming.map((n) => <NamingRow key={n.scope} nc={n} busy={busy} onSave={act} />)}
          </div>
        </SectionCard>
      )}

      {/* FLAGS */}
      {section === "Feature Flags" && (
        <SectionCard title="Feature flags" description="Enable/disable capabilities without deployments.">
          <div className="space-y-1.5">
            {d.flags.map((f) => (
              <div key={f.id} className="flex items-center gap-3 rounded-md border border-slate-200 px-3 py-2">
                <span className="text-sm font-medium text-slate-700 flex-1 font-mono">{f.key}</span>
                <Button size="sm" variant={f.enabled ? "default" : "outline"} className="h-7 text-xs"
                  onClick={() => void act({ action: "flag", key: f.key, enabled: !f.enabled }, f.key + (f.enabled ? " disabled" : " enabled"))}>
                  <ToggleRight className="h-3.5 w-3.5 mr-1" />{f.enabled ? "ON" : "OFF"}
                </Button>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* ORGANIZATION */}
      {section === "Organization" && (
        <SectionCard title="Organization settings" description="Branding and defaults used across reports and exports.">
          <OrgSettings settings={d.settings} busy={busy} onSave={act} />
        </SectionCard>
      )}
    </div>
  );
}

function TerminologyRow({ term, busy, onSave }: { term: { termKey: string; defaultTerm: string; customTerm: string | null; pluralName: string | null }; busy: boolean; onSave: (b: unknown, m: string) => Promise<void> }) {
  const [value, setValue] = useState(term.customTerm ?? "");
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-slate-200 px-3 py-2">
      <span className="text-sm font-medium text-slate-800 w-36">{term.defaultTerm}</span>
      <code className="text-[11px] text-slate-400">{term.termKey}</code>
      <Input className="h-8 w-52" placeholder={term.defaultTerm} value={value} onChange={(e) => setValue(e.target.value)} />
      <Button size="sm" variant="outline" disabled={busy} onClick={() => void onSave({ action: "terminology", termKey: term.termKey, customTerm: value || null }, "Terminology updated")}>
        <Save className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function NamingRow({ nc, busy, onSave }: { nc: { scope: string; style: string; prefix: string; suffix: string; seqPad: number }; busy: boolean; onSave: (b: unknown, m: string) => Promise<void> }) {
  const [style, setStyle] = useState(nc.style);
  const [prefix, setPrefix] = useState(nc.prefix);
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-slate-200 px-3 py-2">
      <span className="text-sm font-medium text-slate-800 w-28">{nc.scope.replace(/([A-Z])/g, " $1")}</span>
      <Select value={style} onValueChange={setStyle}><SelectTrigger className="bg-white h-8 w-40"><SelectValue /></SelectTrigger><SelectContent>{["snake_case", "camelCase", "PascalCase", "UPPER_SNAKE"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
      <Input className="h-8 w-28" placeholder="prefix" value={prefix} onChange={(e) => setPrefix(e.target.value)} />
      <Button size="sm" variant="outline" disabled={busy} onClick={() => void onSave({ action: "naming", scope: nc.scope, style, prefix, suffix: nc.suffix ?? "", seqPad: nc.seqPad }, "Convention saved")}><Save className="h-3.5 w-3.5" /></Button>
    </div>
  );
}

function OrgSettings({ settings, busy, onSave }: { settings: { orgName: string; confidentialityLabel: string; currency: string; dateFormat: string }; busy: boolean; onSave: (b: unknown, m: string) => Promise<void> }) {
  const [s, setS] = useState(settings);
  return (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1"><Label>Organization name</Label><Input value={s.orgName} onChange={(e) => setS({ ...s, orgName: e.target.value })} /></div>
        <div className="space-y-1"><Label>Confidentiality label</Label><Input value={s.confidentialityLabel} onChange={(e) => setS({ ...s, confidentialityLabel: e.target.value })} /></div>
        <div className="space-y-1"><Label>Currency</Label><Input value={s.currency} onChange={(e) => setS({ ...s, currency: e.target.value })} /></div>
        <div className="space-y-1"><Label>Date format</Label><Input value={s.dateFormat} onChange={(e) => setS({ ...s, dateFormat: e.target.value })} /></div>
      </div>
      <Button disabled={busy} onClick={() => void onSave({ action: "settings", orgName: s.orgName, confidentialityLabel: s.confidentialityLabel, currency: s.currency, dateFormat: s.dateFormat }, "Organization settings saved")}>
        <ShieldCheck className="h-4 w-4 mr-1.5" />Save organization settings
      </Button>
    </div>
  );
}
