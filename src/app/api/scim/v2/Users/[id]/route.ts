// SCIM single user: GET / PATCH (activate/deactivate)
import { db } from "@/lib/db";
import { scimAuth } from "../route";
import { writeAudit } from "@/lib/audit";

function err(status: number, message: string) {
  return new Response(JSON.stringify({ schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"], status: String(status), detail: message }), { status, headers: { "content-type": "application/scim+json" } });
}
function ok(body: unknown) {
  return new Response(JSON.stringify(body), { headers: { "content-type": "application/scim+json" } });
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await scimAuth(req);
  const { id } = await params;
  const u = await db.user.findUnique({ where: { id }, select: { id: true, email: true, name: true, isActive: true } });
  if (!u) return err(404, "User not found");
  return ok({ schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"], id: u.id, userName: u.email, name: { givenName: u.name }, emails: [{ value: u.email, primary: true }], active: u.isActive, meta: { resourceType: "User" } });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const rec = await scimAuth(req);
  const { id } = await params;
  const body = (await req.json()) as { active?: boolean };
  const user = await db.user.findUnique({ where: { id }, select: { id: true, email: true, name: true, isActive: true } });
  if (!user) return err(404, "User not found");
  const updated = await db.user.update({ where: { id }, data: { isActive: body.active ?? user.isActive } });
  await writeAudit({ userId: rec.id, userName: "SCIM", action: "UPDATE", entityType: "User", entityId: id, entityName: user.email, before: { active: user.isActive }, after: { active: updated.isActive }, severity: "WARNING" });
  return ok({ id: updated.id, active: updated.isActive });
}
