// PM CONTROL TOWER — OIDC SSO flow
// GET /api/auth/sso/start?providerId=  → IdP authorize redirect URL
// GET /api/auth/sso/callback?provider=&code= → code exchange → group→role mapping → JIT user → PMCT session token

import { db } from "@/lib/db";
import { mapGroupsToRoles } from "@/lib/engines/identity";
import { writeAudit } from "@/lib/audit";
import { SignJWT } from "jose";

const secret = () => new TextEncoder().encode(process.env.JWT_SECRET || "pmct-sandbox-dev-secret-change-in-production-0f4a9b");
const WEB = process.env.WEB_ORIGIN || "http://localhost:3000";

const html = (title: string, body: string) => new Response(
  `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>body{font-family:'Segoe UI',sans-serif;background:#0a1c33;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}div{background:#13294a;padding:2rem;border-radius:12px;max-width:32rem}h1{font-size:1.2rem;margin:0 0 .5rem}p{color:#9fb3ce;font-size:.9rem}a{color:#6ea8ff}</style></head><body><div><h1>${title}</h1>${body}</div></body></html>`,
  { headers: { "content-type": "text/html; charset=utf-8" } },
);

export async function GET(req: Request, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  const url = new URL(req.url);

  if (action === "start") {
    const providerId = url.searchParams.get("providerId");
    if (!providerId) return html("SSO", "<p>providerId required</p>");
    const prov = await db.identityProvider.findUnique({ where: { id: providerId } });
    if (!prov || prov.protocol !== "OIDC") return html("SSO unavailable", "<p>OIDC provider not configured.</p>");
    const redirect = `${WEB}/api/auth/sso/callback?provider=${prov.id}`;
    const authorize = new URL(prov.ssoUrl);
    authorize.searchParams.set("response_type", "code");
    authorize.searchParams.set("client_id", prov.clientId ?? "");
    authorize.searchParams.set("redirect_uri", redirect);
    authorize.searchParams.set("scope", "openid profile email groups");
    return Response.redirect(authorize.toString(), 302);
  }

  if (action === "callback") {
    const providerId = url.searchParams.get("provider");
    const code = url.searchParams.get("code");
    if (!providerId || !code) return html("SSO failed", "<p>Missing provider or code.</p>");
    const prov = await db.identityProvider.findUnique({ where: { id: providerId } });
    if (!prov) return html("SSO failed", "<p>Provider not configured.</p>");

    let claims: Record<string, unknown> = {};
    try {
      const tokenRes = await fetch(prov.ssoUrl.replace("/authorize", "/token"), {
        method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ grant_type: "authorization_code", code, client_id: prov.clientId ?? "", client_secret: prov.clientSecret ?? "", redirect_uri: `${WEB}/api/auth/sso/callback?provider=${prov.id}` }),
      });
      if (!tokenRes.ok) return html("SSO failed", "<p>Token exchange with the identity provider failed.</p>");
      const tokens = (await tokenRes.json()) as { id_token?: string };
      if (!tokens.id_token) return html("SSO failed", "<p>No id_token returned.</p>");
      claims = JSON.parse(Buffer.from(tokens.id_token.split(".")[1], "base64url").toString()) as Record<string, unknown>;
    } catch {
      return html("SSO failed", "<p>Identity provider communication error.</p>");
    }

    const groups = (claims.groups as string[]) ?? [];
    const mapped = mapGroupsToRoles({ groups, email: String(claims.email ?? claims.preferred_username ?? ""), name: String(claims.name ?? claims.preferred_username ?? "SSO User"), subject: String(claims.sub ?? "") }, JSON.parse(prov.groupsRoleMappingJson));
    if (mapped.roleCodes.length === 0) return html("Access denied", "<p>Your identity groups map to no PMCT role. Contact the PMO administrator.</p>");

    // JIT user: create or update, assign mapped roles
    let user = await db.user.findUnique({ where: { email: mapped.email }, include: { userRoles: { include: { role: true } } } });
    if (!user) {
      user = await db.user.create({ data: { email: mapped.email, name: mapped.name, passwordHash: "SSO_EXTERNAL", authSource: prov.protocol, externalId: String(claims.sub ?? ""), isActive: true, userRoles: { create: [] } }, include: { userRoles: { include: { role: true } } } });
    } else if (!user.isActive) {
      return html("Access denied", "<p>Account is deactivated.</p>");
    }
    const u = user;
    for (const roleCode of mapped.roleCodes) {
      const role = await db.role.findUnique({ where: { code: roleCode } });
      if (role && !u.userRoles.some((ur) => ur.roleId === role.id)) {
        await db.userRole.create({ data: { userId: u.id, roleId: role.id } }).catch(() => undefined);
      }
    }
    // Refresh role list after assignment
    const roles = await db.userRole.findMany({ where: { userId: user.id }, include: { role: true } });
    const token = await new SignJWT({ sub: user.id, email: user.email, iss: "pm-control-tower" })
      .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("7d").sign(secret());
    await writeAudit({ userId: user.id, userName: user.name, action: "SSO_LOGIN", entityType: "User", entityId: user.id, entityName: user.email, after: { provider: prov.name, roles: roles.map((r) => r.role?.code) }, severity: "NOTICE" });

    return html("Welcome, " + user.name, `<p>Authenticated via ${prov.name} (${prov.protocol}).</p><p>Your PMCT session token (valid 7 days):</p><p style="word-break:break-all;font-family:monospace;font-size:11px;color:#6ea8ff">${token}</p><p>Return to <a href="${WEB}">PM Control Tower</a> and sign in with SSO to start a session.</p>`);
  }

  return html("Not found", "<p>Unknown SSO action.</p>");
}
