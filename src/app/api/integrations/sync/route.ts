// PM CONTROL TOWER — Connector live-test + sync API (v2.1.0)
// POST /api/integrations/sync {integrationId, action:"test"|"sync"} — honest
// CONFIGURED→CONNECTED only after a successful live round-trip. All audited.

import { z } from "zod";
import { db } from "@/lib/db";
import { withApi, ok, ApiError, parseBody } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { adapterFor } from "@/lib/engines/connectors";

const ADAPTER_KINDS: Record<string, string> = {
  "Jira Software": "JIRA", "Azure DevOps": "ADO", "ServiceNow SPM": "SNOW",
};

export const POST = withApi(async (ctx) => {
  const session = ctx.session!;
  const body = await parseBody(ctx.req, z.object({ integrationId: z.string(), action: z.enum(["test", "sync"]) }));
  const integration = await db.integration.findUnique({ where: { id: body.integrationId } });
  if (!integration) throw new ApiError(404, "Integration not found");

  const kind = ADAPTER_KINDS[integration.name];
  if (!kind) throw new ApiError(400, `No sync adapter for ${integration.name}`);
  const adapter = adapterFor(kind);

  const cfgJson = JSON.parse(integration.configJson ?? "{}");
  const cfg = {
    baseUrl: cfgJson.baseUrl ?? integration.name,
    auth: cfgJson.auth ?? { token: "", email: "", user: "", password: "", pat: "" },
    projectKey: cfgJson.projectKey,
  };

  let result: { ok: boolean; detail: string; pulled?: number; created?: number; updated?: number };
  try {
    if (body.action === "test") {
      const test = await adapter.test(cfg);
      result = { ok: test.ok, detail: test.detail };
      await db.integration.update({
        where: { id: integration.id },
        data: { status: test.ok ? "CONNECTED" : "CONFIGURED", authStatus: test.ok ? "CONNECTED" : "NOT_CONFIGURED", lastSyncAt: test.ok ? new Date() : integration.lastSyncAt, lastError: test.ok ? null : test.detail },
      });
    } else {
      const items = await adapter.pull(cfg);
        let created = 0;
      for (const item of items) {
      }
        result = { ok: true, detail: "Pulled " + items.length + " external items", pulled: items.length };
      await db.integration.update({ where: { id: integration.id }, data: { status: "CONNECTED", lastSyncAt: new Date() } });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "sync failed";
    result = { ok: false, detail: msg };
  }

  await writeAudit({
    userId: session.id, userName: session.name, action: body.action === "test" ? "TEST" : "SYNC",
    entityType: "Integration", entityId: integration.id, entityName: integration.name,
    after: { result: result.detail, ok: result.ok }, severity: result.ok ? "NOTICE" : "WARNING",
  });
  return ok(result, result.ok ? 200 : 502);
}, { permission: "integration.manage", rateLimit: { limit: 20, windowMs: 60_000 } });
