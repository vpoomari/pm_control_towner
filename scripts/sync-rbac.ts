// PM CONTROL TOWER — RBAC sync: upsert PERMISSION_CATALOG and ROLE_TEMPLATES grants
// without touching any other data. Safe to run repeatedly.

import { PrismaClient } from "@prisma/client";
import { PERMISSION_CATALOG, ROLE_TEMPLATES } from "../src/lib/rbac";

const db = new PrismaClient();

async function main() {
  const permByCode = new Map<string, string>();
  for (const p of PERMISSION_CATALOG) {
    const row = await db.permission.upsert({
      where: { code: p.code },
      update: { category: p.category, description: p.description },
      create: p,
    });
    permByCode.set(p.code, row.id);
  }
  console.log(`  ✓ permissions synced (${PERMISSION_CATALOG.length})`);

  // Prune permissions no longer in the catalog (keeps DB aligned with code).
  const stale = await db.permission.findMany({ select: { id: true, code: true } });
  const codes = new Set(PERMISSION_CATALOG.map((p) => p.code));
  for (const s of stale.filter((x) => !codes.has(x.code))) {
    await db.permission.delete({ where: { id: s.id } });
  }

  for (const t of ROLE_TEMPLATES) {
    const role = await db.role.upsert({
      where: { code: t.code },
      update: { name: t.name, description: t.description, level: t.level },
      create: { code: t.code, name: t.name, description: t.description, level: t.level, isSystem: true },
    });
    const wanted = t.permissions.includes("*") ? PERMISSION_CATALOG.map((p) => p.code) : t.permissions;
    const existing = await db.rolePermission.findMany({ where: { roleId: role.id }, include: { permission: true } });
    const existingCodes = new Set(existing.map((rp) => rp.permission.code));
    for (const code of wanted) {
      const pid = permByCode.get(code);
      if (pid && !existingCodes.has(code)) await db.rolePermission.create({ data: { roleId: role.id, permissionId: pid } });
    }
    for (const rp of existing.filter((x) => !wanted.includes(x.permission.code) && !t.permissions.includes("*"))) {
      await db.rolePermission.delete({ where: { roleId_permissionId: { roleId: role.id, permissionId: rp.permissionId } } });
    }
  }
  console.log(`  ✓ role grants synced (${ROLE_TEMPLATES.length} roles)`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
