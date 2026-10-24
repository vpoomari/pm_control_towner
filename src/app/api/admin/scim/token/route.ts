// PM CONTROL TOWER — SCIM bearer tokens for provisioning clients
// GET  /api/admin/scim/token — list active tokens (hashed, masked)
// POST /api/admin/scim/token {label} — generate a new token (plaintext shown ONCE)

import { z } from "zod";
import { db } from "@/lib/db";
import { withApi, ok, ApiError, parseBody } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { generateScimToken, hashToken } from "@/lib/engines/identity";

export const GET = withApi(async () => {
  const tokens = await db.scimToken.findMany({ where: { active: true }, orderBy: { createdAt: "desc" } });
  return ok({ tokens: tokens.map((t) => ({ id: t.id, label: t.label, lastUsedAt: t.lastUsedAt, createdAt: t.createdAt })) });
}, { permission: "admin.config", rateLimit: { limit: 120, windowMs: 60_000 } });

export const POST = withApi(async (ctx) => {
  const session = ctx.session!;
  const body = await parseBody(ctx.req, z.object({ label: z.string().min(2) }));
  const token = generateScimToken();
  const rec = await db.scimToken.create({ data: { tokenHash: hashToken(token), label: body.label } });
  await writeAudit({ userId: session.id, userName: session.name, action: "CREATE", entityType: "ScimToken", entityId: rec.id, entityName: body.label, severity: "WARNING" });
  return ok({ id: rec.id, label: rec.label, token, note: "Store this token now — it is shown only once." }, 201);
}, { permission: "admin.config", rateLimit: { limit: 30, windowMs: 60_000 } });
