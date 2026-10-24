// PM CONTROL TOWER — Strategy seed (golden-path validation fix)
// Creates StrategicObjective rows and aligns projects to them so the
// Strategy → Objective → Portfolio → Project chain (master prompt §75) is
// demonstrable with real traceability through /api/portfolio/strategy.
// Idempotent: skips if objectives already exist.

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const OBJECTIVES = [
  { name: "Modernize the enterprise core", description: "Retire legacy platforms and consolidate ERP, data and cloud foundations.", weight: 30, order: 1, match: /ERP|DATA|CLD/i },
  { name: "Grow digital revenue", description: "Launch and scale customer-facing digital products and services.", weight: 30, order: 2, match: /PORT|MOB|CRM/i },
  { name: "Operational excellence & control", description: "Lift delivery predictability, governance maturity and cost transparency.", weight: 25, order: 3, match: /.*/, fallback: true },
  { name: "Empowered people & ways of working", description: "Agile delivery at scale, data literacy and workforce enablement.", weight: 15, order: 4, match: /.*/, fallback: true },
];

async function main() {
  const existing = await db.strategicObjective.count();
  if (existing > 0) {
    console.log(`Strategic objectives already present (${existing}) — skipping.`);
    return;
  }
  const created: { id: string; name: string; weight: number; order: number }[] = [];
  for (const o of OBJECTIVES) {
    created.push(await db.strategicObjective.create({ data: { name: o.name, description: o.description, weight: o.weight, order: o.order } }));
  }
  console.log(`  ✓ ${created.length} strategic objectives`);

  const projects = await db.project.findMany({ select: { id: true, code: true, strategicObjectiveId: true } });
  let linked = 0;
  for (const p of projects) {
    if (p.strategicObjectiveId) continue;
    const byMatch = created.find((_, i) => OBJECTIVES[i].match && OBJECTIVES[i].match.test(p.code));
    const fallback = created[created.length - 1];
    const target = byMatch || created[2] || fallback;
    await db.project.update({ where: { id: p.id }, data: { strategicObjectiveId: target.id } });
    linked++;
  }
  console.log(`  ✓ ${linked} projects aligned to objectives`);
  console.log("Strategy seed complete.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
