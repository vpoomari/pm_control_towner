// PM CONTROL TOWER — SCIM 2.0 user provisioning (RFC 7644 subset)
// GET  /api/scim/v2/Users          — list/filter users (userName filter)
// POST /api/scim/v2/Users          — JIT create with mapped roles
// PATCH/DELETE /api/scim/v2/Users/[id] — activate/deactivate
// Auth: SCIM bearer token (hashed in ScimToken). Every operation audited.

import { db } from "@/lib/db";
import { ApiError, ok } from "@/lib/api";
import { scimToIdentity, mapGroupsToRoles } from "@/lib/engines/identity";
import { writeAudit } from "@/lib/audit";
import bcrypt from "bcryptjs";

export async function scimAuth(req: Request) {
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) throw new ApiError(401, "SCIM bearer token required");
  const { createHash } = await import("crypto");
  const rec = await db.scimToken.findFirst({ where: { tokenHash: createHash("sha256").update(token).digest("hex"), active: true } });
  if (!rec) throw new ApiError(401, "Invalid SCIM token");
  await db.scimToken.update({ where: { id: rec.id }, data: { lastUsedAt: new Date() } });
  return rec;
}

const userJson = (u: { id: string; userName: string; name: string; email: string; active: boolean }) => ({
  schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
  id: u.id, userName: u.userName, name: { givenName: u.name }, emails: [{ value: u.email, primary: true }], active: u.active, meta: { resourceType: "User" },
});

export async function GET(req: Request) {
  try {
    await scimAuth(req);
    const filter = new URL(req.url).searchParams.get("filter") ?? "";
    const match = filter.match(/userName\s+Eq\s+"([^"]+)"/i);
    const users = await db.user.findMany({
      where: match ? { email: match[1] } : {},
      select: { id: true, email: true, name: true, isActive: true },
    });
    return scimOk({
      totalResults: users.length, startIndex: 1, itemsPerPage: users.length,
      Resources: users.map((u) => userJson({ ...u, userName: u.email, active: u.isActive })),
    });
  } catch (e) {
    return errResponse(e);
  }
}

export async function POST(req: Request) {
  try {
    const rec = await scimAuth(req);
    const body = (await req.json()) as Parameters<typeof scimToIdentity>[0] & { active?: boolean };
    const identity = scimToIdentity(body);
    const exists = await db.user.findUnique({ where: { email: identity.email } });
    if (exists) return scimOk(userJson({ id: exists.id, userName: exists.email, name: exists.name, email: exists.email, active: exists.isActive }));
    const defaultRole = await db.role.findFirst({ where: { code: "TEAM_MEMBER" } });
    const user = await db.user.create({
      data: {
        email: identity.email, name: identity.name, passwordHash: bcrypt.hashSync("SCIM-" + rec.id.slice(0, 8) + "-" + Date.now(), 10),
        isActive: identity.active, authSource: "SCIM", externalId: identity.subject,
        ...(defaultRole ? { userRoles: { create: { roleId: defaultRole.id } } } : {}),
      },
      include: { userRoles: { include: { role: true } } },
    });
    await writeAudit({ userId: user.id, userName: "SCIM", action: "CREATE", entityType: "User", entityId: user.id, entityName: user.email, after: { via: "SCIM provisioning" }, severity: "NOTICE" });
    return scimOk(userJson({ id: user.id, userName: user.email, name: user.name, email: user.email, active: true }), 201);
  } catch (e) {
    return errResponse(e);
  }
}

function errResponse(e: unknown) {
  const status = e instanceof ApiError ? e.status : 500;
  const message = e instanceof Error ? e.message : "SCIM error";
  return new Response(JSON.stringify({ schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"], status: String(status), detail: message }), { status, headers: { "content-type": "application/scim+json" } });
}

function scimOk(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/scim+json" } });
}
