"use client";
// PM CONTROL TOWER — ADMIN · AI provider (Bring Your Own Key)
// One saved key activates AI features globally across the app.
// The key is encrypted server-side (AES-256-GCM) and never returned to the
// browser — this card only ever sees a masked "••••1234" view of it.

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { getAiSettings, removeAiKey, saveAiKey, testAiKey } from "@/lib/ai/ai-service";
import {
  AI_PROVIDERS,
  AI_PROVIDER_IDS,
  type AiProviderId,
  type AiSettingsStatus,
} from "@/lib/ai/shared";
import { SectionCard, Button, Badge, LoadingBlock, ErrorBlock, cn } from "@/components/pmct/kit";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sparkles, Eye, EyeOff, PlugZap, Save, Trash2, ExternalLink, ShieldCheck, KeyRound, Loader2,
} from "lucide-react";

type Busy = "save" | "test" | "remove" | null;

export default function AiProviderSettings() {
  const [status, setStatus] = useState<AiSettingsStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [editing, setEditing] = useState(false);

  const [provider, setProvider] = useState<AiProviderId>("gemini");
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [reveal, setReveal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAiSettings();
      if (res.ok) {
        setStatus(res.status);
        setError(null);
      } else {
        setError(res.error);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load AI settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const startEdit = () => {
    setProvider(status?.provider ?? "gemini");
    setModel(status?.model ?? "");
    setApiKey("");
    setReveal(false);
    setEditing(true);
  };

  const save = async () => {
    if (!apiKey.trim()) { toast.error("Enter an API key first."); return; }
    setBusy("save");
    try {
      const res = await saveAiKey({ provider, model: model.trim() || undefined, apiKey: apiKey.trim() });
      if (res.ok) {
        setStatus(res.status);
        setEditing(false);
        setApiKey("");
        toast.success("AI key saved", { description: `${AI_PROVIDERS[res.status.provider ?? provider].label} is now active for every AI feature in the app.` });
      } else {
        toast.error("Could not save the AI key", { description: res.error });
      }
    } catch (e) {
      toast.error("Could not save the AI key", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setBusy(null);
    }
  };

  const test = async () => {
    setBusy("test");
    try {
      const res = await testAiKey();
      if (res.ok) {
        toast.success("Connection OK", { description: `${res.provider} · ${res.model} · ${res.latencyMs} ms` });
      } else {
        toast.error("Connection failed", { description: res.error });
      }
    } catch (e) {
      toast.error("Connection failed", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    setBusy("remove");
    try {
      const res = await removeAiKey();
      if (res.ok) {
        setStatus(res.status);
        toast.success("AI key removed", { description: "AI features now show their capture hint until a key is saved again." });
      } else {
        toast.error("Could not remove the key", { description: res.error });
      }
    } catch (e) {
      toast.error("Could not remove the key", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setBusy(null);
    }
  };

  const spec = AI_PROVIDERS[provider];

  return (
    <SectionCard
      title="AI provider — Bring Your Own Key"
      description="One provider key activates every AI feature app-wide. Encrypted at rest (AES-256-GCM), server-side only, never sent back to the browser."
      actions={
        status?.configured && !editing ? (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={test} disabled={busy !== null}>
              {busy === "test" ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <PlugZap className="h-3.5 w-3.5 mr-1" />} Test
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={startEdit} disabled={busy !== null}>
              <KeyRound className="h-3.5 w-3.5 mr-1" /> Replace key
            </Button>
          </div>
        ) : undefined
      }
    >
      {loading && !status ? (
        <LoadingBlock label="Loading AI settings…" />
      ) : error ? (
        <ErrorBlock message={error} onRetry={load} />
      ) : (
        <div className="space-y-3" aria-busy={busy !== null}>
          {/* Status line — honest empty state + masked key view */}
          {!editing && (
            <div
              role="status"
              aria-live="polite"
              className={cn(
                "flex items-start gap-3 rounded-lg border px-3.5 py-3",
                status?.configured
                  ? "border-emerald-200 bg-emerald-50/50"
                  : "border-amber-200 bg-amber-50/50"
              )}
            >
              <Sparkles className={cn("h-4.5 w-4.5 mt-0.5 shrink-0", status?.configured ? "text-emerald-600" : "text-amber-600")} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-800 flex items-center gap-2 flex-wrap">
                  {status?.configured
                    ? <>Active — {AI_PROVIDERS[status.provider ?? "gemini"].label}</>
                    : "Not configured"}
                  {status?.configured && (
                    <>
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-mono">
                        {status.maskedKey}
                      </Badge>
                      <Badge variant="outline" className="bg-white text-slate-600 border-slate-200">{status.model}</Badge>
                    </>
                  )}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  {status?.configured
                    ? `Saved key in use across the app · ${status.usageCount} AI calls${status.lastUsedAt ? ` · last used ${new Date(status.lastUsedAt).toLocaleString()}` : " · never used yet"}`
                    : "No key saved yet — AI features display their capture hint (with the path to this screen) until you add one."}
                </p>
              </div>
              {status?.configured && (
                <Button
                  size="sm" variant="ghost" className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 shrink-0"
                  onClick={remove} disabled={busy !== null}
                  aria-label="Remove saved AI key"
                >
                  {busy === "remove" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                </Button>
              )}
            </div>
          )}

          {/* Key entry form */}
          {editing ? (
            <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/40 p-3.5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="min-w-0">
                  <label htmlFor="ai-provider" className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 block mb-1">Provider</label>
                  <Select value={provider} onValueChange={(v) => setProvider(v as AiProviderId)}>
                    <SelectTrigger id="ai-provider" className="h-9 text-xs bg-white" disabled={busy !== null}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AI_PROVIDER_IDS.map((id) => (
                        <SelectItem key={id} value={id} className="text-xs">{AI_PROVIDERS[id].label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-0">
                  <label htmlFor="ai-model" className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 block mb-1">Model</label>
                  <Input
                    id="ai-model"
                    className="h-9 text-xs bg-white"
                    placeholder={spec.defaultModel}
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    disabled={busy !== null}
                    autoComplete="off"
                  />
                </div>
              </div>

              <div className="min-w-0">
                <div className="flex items-baseline justify-between gap-2 mb-1">
                  <label htmlFor="ai-api-key" className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">API key</label>
                  <a
                    href={spec.keyUrl} target="_blank" rel="noopener noreferrer"
                    className="text-[10px] text-blue-600 hover:underline inline-flex items-center gap-0.5"
                  >
                    Get a free {spec.label} key <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                </div>
                <div className="relative">
                  <Input
                    id="ai-api-key"
                    type={reveal ? "text" : "password"}
                    className="h-9 text-xs bg-white pr-9 font-mono"
                    placeholder={status?.configured ? "•••••••• (enter a new key to replace)" : spec.keyHint}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    disabled={busy !== null}
                    autoComplete="off"
                    spellCheck={false}
                    aria-describedby="ai-key-help"
                  />
                  <button
                    type="button"
                    onClick={() => setReveal((r) => !r)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label={reveal ? "Hide API key" : "Show API key"}
                  >
                    {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p id="ai-key-help" className="text-[10px] text-slate-400 mt-1">
                  Stored encrypted (AES-256-GCM) in the platform database. The plaintext never reaches this browser and is never logged.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button size="sm" className="h-8 text-xs" onClick={save} disabled={busy !== null || !apiKey.trim()}>
                  {busy === "save" ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                  Save key
                </Button>
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => { setEditing(false); setApiKey(""); }} disabled={busy !== null}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            !status?.configured && (
              <Button size="sm" className="h-8 text-xs" onClick={startEdit}>
                <Sparkles className="h-3.5 w-3.5 mr-1" /> Add API key
              </Button>
            )
          )}

          {/* Vault posture — honest environment signal, presence-only */}
          {status && !status.vaultReady && (
            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-start gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              Dev fallback vault secret is active — set <span className="font-mono">JWT_SECRET</span> or{" "}
              <span className="font-mono">AI_KEY_VAULT_SECRET</span> in the deployment environment before saving real keys.
            </p>
          )}
        </div>
      )}
    </SectionCard>
  );
}
