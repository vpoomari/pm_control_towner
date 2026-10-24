const fs = require("fs");

// ---- Fix SSO callback user typing ----
let sso = fs.readFileSync("src/app/api/auth/sso/[action]/route.ts", "utf8");
const oldBlock = sso.slice(sso.indexOf("    let user = await db.user.findUnique({ where: { email: mapped.email }"), sso.indexOf("    // Refresh role list after assignment"));
const newBlock = `    let user = await db.user.findUnique({ where: { email: mapped.email }, include: { userRoles: { include: { role: true } } } });
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
`;
sso = sso.replace(oldBlock, newBlock);
fs.writeFileSync("src/app/api/auth/sso/[action]/route.ts", sso);

// ---- SCIM [id] route ----
const dir = "src/app/api/scim/v2/Users/[id]";
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(dir + "/route.ts", `// SCIM single user: GET / PATCH (activate/deactivate)
import { db } from "@/lib/db";
import { scimAuth } from "../route";

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
`);
console.log("sso fixed + scim id route written");
