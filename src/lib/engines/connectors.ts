// PM CONTROL TOWER — Ecosystem sync engine (v2.1.0)
// Adapters for Jira, Azure DevOps, ServiceNow. Each: testConnection (live round-trip
// flips CONFIGURED→CONNECTED), pullItems (external items → PMCT task upserts).
// Uses credentials stored on the Integration record. All network errors honest.

export interface ConnectorConfig {
  baseUrl: string;
  auth: Record<string, string>; // token / email+token / pat
  projectKey?: string;
}

export interface ExternalItem {
  externalId: string;
  key: string;
  name: string;
  status: string;
  assignee?: string | null;
  url?: string;
  updatedAt: string;
}

export interface SyncResult {
  connector: string;
  status: "CONNECTED" | "FAILED";
  pulled: number;
  created: number;
  updated: number;
  errors: string[];
  testedAt: string;
}

async function safeFetch(url: string, init: RequestInit): Promise<{ ok: boolean; status: number; body: unknown }> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(15_000) });
  const text = await res.text();
  let body: unknown = text;
  try { body = JSON.parse(text); } catch { /* not json */ }
  return { ok: res.ok, status: res.status, body };
}

// ---- Jira ----
export async function jiraTest(cfg: ConnectorConfig): Promise<{ ok: boolean; detail: string }> {
  const auth = "Basic " + Buffer.from(cfg.auth.email + ":" + cfg.auth.token).toString("base64");
  const r = await safeFetch(`${cfg.baseUrl}/myself`, { headers: { authorization: auth, accept: "application/json" } });
  const name = (r.body as { displayName?: string })?.displayName;
  return { ok: r.ok, detail: r.ok ? "Authenticated as " + name : "HTTP " + r.status };
}

export async function jiraPull(cfg: ConnectorConfig): Promise<ExternalItem[]> {
  const auth = "Basic " + Buffer.from(cfg.auth.email + ":" + cfg.auth.token).toString("base64");
  const jql = cfg.projectKey ? `project=${cfg.projectKey}` : "";
  const r = await safeFetch(`${cfg.baseUrl}/search?jql=${encodeURIComponent(jql)}&maxResults=50`, { headers: { authorization: auth, accept: "application/json" } });
  if (!r.ok) throw new Error("Jira search HTTP " + r.status);
  const parsed = r.body as { issues?: { id: string; key: string; fields: { summary: string; status: { name: string }; assignee?: { displayName?: string } } }[] } | undefined;
  const issues = parsed?.issues ?? [];
  return issues.map((i) => ({
    externalId: i.id, key: i.key, name: i.fields.summary,
    status: i.fields.status.name.toUpperCase().replace(/\s+/g, "_"),
    assignee: i.fields.assignee?.displayName ?? null,
    updatedAt: new Date().toISOString(),
  }));
}

// ---- Azure DevOps ----
export async function adoTest(cfg: ConnectorConfig): Promise<{ ok: boolean; detail: string }> {
  const auth = "Basic " + Buffer.from(":" + cfg.auth.pat).toString("base64");
  const r = await safeFetch(`${cfg.baseUrl}/_apis/projects?api-version=7.0`, { headers: { authorization: auth } });
  return { ok: r.ok, detail: r.ok ? "Connected to " + cfg.baseUrl : "HTTP " + r.status };
}

export async function adoPull(cfg: ConnectorConfig): Promise<ExternalItem[]> {
  const auth = "Basic " + Buffer.from(":" + cfg.auth.pat).toString("base64");
  const wiql = JSON.stringify({ query: `SELECT [System.Id], [System.Title], [System.State] FROM WorkItems WHERE [System.WorkItemType] IN ('Task','Bug') ORDER BY [System.ChangedDate] DESC` });
  const wiqlRes = await safeFetch(`${cfg.baseUrl}/_apis/wit/wiql?api-version=7.0`, { method: "POST", headers: { authorization: auth, "content-type": "application/json" }, body: wiql });
  if (!wiqlRes.ok) throw new Error("ADO WIQL HTTP " + wiqlRes.status);
  const wiqlParsed = wiqlRes.body as { workItems?: { id: number }[] } | undefined;
  const ids = (wiqlParsed?.workItems ?? []).slice(0, 50).map((w) => w.id);
  if (ids.length === 0) return [];
  const batch = await safeFetch(`${cfg.baseUrl}/_apis/wit/workitems?ids=${ids.join(",")}&$expand=none&api-version=7.0`, { headers: { authorization: auth } });
  if (!batch.ok) throw new Error("ADO batch HTTP " + batch.status);
  const batchParsed = batch.body as { value?: { id: number; fields: Record<string, unknown> }[] } | undefined;
  const items = batchParsed?.value ?? [];
  return items.map((w) => ({
    externalId: String(w.id), key: "#" + w.id,
    name: String(w.fields["System.Title"] ?? "Untitled"),
    status: String(w.fields["System.State"] ?? "").toUpperCase().replace(/\s+/g, "_"),
    assignee: (w.fields["System.AssignedTo"] as { displayName?: string })?.displayName ?? null,
    updatedAt: new Date().toISOString(),
  }));
}

// ---- ServiceNow ----
export async function snowTest(cfg: ConnectorConfig): Promise<{ ok: boolean; detail: string }> {
  const auth = "Basic " + Buffer.from(cfg.auth.user + ":" + cfg.auth.password).toString("base64");
  const r = await safeFetch(`${cfg.baseUrl}/api/now/table/sys_user?sysparm_limit=1`, { headers: { authorization: auth, accept: "application/json" } });
  return { ok: r.ok, detail: r.ok ? "Connected to " + cfg.baseUrl : "HTTP " + r.status };
}

export async function snowPull(cfg: ConnectorConfig): Promise<ExternalItem[]> {
  const auth = "Basic " + Buffer.from(cfg.auth.user + ":" + cfg.auth.password).toString("base64");
  const r = await safeFetch(`${cfg.baseUrl}/api/now/table/incident?sysparm_limit=50&sysparm_fields=sys_id,number,short_description,state,assigned_to,sys_updated_on`, { headers: { authorization: auth, accept: "application/json" } });
  if (!r.ok) throw new Error("ServiceNow HTTP " + r.status);
  const incs = ((r.body as { result?: { sys_id: string; number: string; short_description: string; state: string; sys_updated_on: string }[] }).result ?? []);
  return incs.map((i) => ({
    externalId: i.sys_id, key: i.number,
    name: i.short_description,
    status: i.state === "1" ? "OPEN" : i.state === "6" ? "RESOLVED" : i.state === "7" ? "CLOSED" : "IN_PROGRESS",
    assignee: null, updatedAt: i.sys_updated_on,
  }));
}

export function adapterFor(kind: string) {
  switch (kind) {
    case "JIRA": return { test: jiraTest, pull: jiraPull };
    case "ADO": return { test: adoTest, pull: adoPull };
    case "SNOW": return { test: snowTest, pull: snowPull };
    default: throw new Error("No adapter for " + kind);
  }
}
