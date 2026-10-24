// PM CONTROL TOWER — SSO Identity Provider configuration (admin.config)
// GET  /api/admin/sso — list IdPs (secrets masked)
// POST /api/admin/sso — register IdP (SAML2/OIDC) with group→role mappings
// Honest status: CONFIGURED until a live authentication round-trip succeeds.

import { z } from "zod";
import { db } from "@/lib/db";
import { withApi, ok, ApiError, parseBody } from "@/lib/api";
import { writeAudit } from "@/lib/audit";

export const GET = withApi(async () => {
  const providers = await db.identityProvider.findMany({ orderBy: { createdAt: "desc" } });
  return ok({ providers: providers.map((p) => ({ ...p, clientSecret: p.clientSecret ? "••••" : null, idpCertificate: p.idpCertificate ? p.idpCertificate.slice(0, 40) + "…" : null })) });
}, { permission: "admin.config", rateLimit: { limit: 120, windowMs: 60_000 } });

export const POST = withApi(async (ctx) => {
  const session = ctx.session!;
  const body = await parseBody(ctx.req, z.object({
    protocol: z.enum(["OIDC", "SAML2"]), name: z.string().min(2), issuer: z.string().min(2),
    clientId: z.string().optional().nullable(), clientSecret: z.string().optional().nullable(),
    ssoUrl: z.string().url(), idpCertificate: z.string().optional().nullable(),
    groupsRoleMapping: z.array(z.object({ idpGroup: z.string(), roleCode: z.string() })).default([]),
  }));
  const prov = await db.identityProvider.create({
    data: { protocol: body.protocol, name: body.name, issuer: body.issuer, clientId: body.clientId ?? null, clientSecret: body.clientSecret ?? null, ssoUrl: body.ssoUrl, idpCertificate: body.idpCertificate ?? null, groupsRoleMappingJson: JSON.stringify(body.groupsRoleMapping), status: "CONFIGURED" },
  });
  await writeAudit({ userId: session.id, userName: session.name, action: "CREATE", entityType: "IdentityProvider", entityId: prov.id, entityName: prov.name, after: { protocol: body.protocol, mappings: body.groupsRoleMapping.length }, severity: "WARNING" });
  return ok({ id: prov.id, status: prov.status, note: "CONFIGURED — becomes CONNECTED after a successful live authentication round-trip" }, 201);
}, { permission: "admin.config", rateLimit: { limit: 60, windowMs: 60_000 } });
