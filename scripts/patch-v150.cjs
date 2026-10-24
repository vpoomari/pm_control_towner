const fs = require("fs");
// registry + nav
let r = fs.readFileSync("src/views/registry.tsx", "utf8");
if (!r.includes("PrioritizationView")) {
  r = r.replace('const TechnologyView = L(() => import("@/views/technology/technology"));', 'const TechnologyView = L(() => import("@/views/technology/technology"));\nconst PrioritizationView = L(() => import("@/views/portfolio/prioritization"));');
  r = r.replace('    case "technology": return { C: TechnologyView, key };', '    case "technology": return { C: TechnologyView, key };\n    case "prioritization": return { C: PrioritizationView, key };');
}
fs.writeFileSync("src/views/registry.tsx", r);
let sh = fs.readFileSync("src/components/pmct/shell.tsx", "utf8");
if (!sh.includes("Prioritization")) {
  sh = sh.replace('      { label: "CTO Tower", href: "/technology", icon: Server, perm: "integration.view" },', '      { label: "CTO Tower", href: "/technology", icon: Server, perm: "integration.view" },\n      { label: "Prioritization", href: "/prioritization", icon: Target, perm: "portfolio.view" },');
  sh = sh.replace(/import \{([^}]*)\} from "lucide-react";/, (m, g) => (m.includes("Target,") || g.includes("Target")) ? m : "import { Target, " + g.replace(/^\s*/, "") + " from \"lucide-react\";".replace("import {", "").trim() && ("import {" + g.replace(/\s*$/, "") + ", Target } from \"lucide-react\";"));
}
fs.writeFileSync("src/components/pmct/shell.tsx", sh);

// seed scores
let s = fs.readFileSync("scripts/seed-technology.ts", "utf8");
if (!s.includes("projectScore")) {
  const block = [
    "",
    "  // ---- Prioritization workshop scores (human-judged inputs; totals computed) ----",
    "  const crits = await db.priorityCriterion.findMany({ orderBy: { order: \"asc\" } });",
    "  if (crits.length > 0) {",
    "    const scoreSets: Record<string, Record<string, number>> = {",
    "      \"PRJ-ERP-001\": { strategic: 92, value: 85, customer: 88, risk: 75, compliance: 95, roi: 82, urgency: 85 },",
    "      \"PRJ-DATA-002\": { strategic: 88, value: 90, customer: 80, risk: 85, compliance: 90, roi: 78, urgency: 90 },",
    "      \"PRJ-PORT-003\": { strategic: 75, value: 70, customer: 72, risk: 60, compliance: 55, roi: 65, urgency: 60 },",
    "      \"PRJ-MOB-004\": { strategic: 82, value: 78, customer: 92, risk: 55, compliance: 60, roi: 75, urgency: 70 },",
    "      \"PRJ-CLD-005\": { strategic: 85, value: 72, customer: 60, risk: 80, compliance: 70, roi: 80, urgency: 65 },",
    "      \"PRJ-CRM-006\": { strategic: 65, value: 62, customer: 85, risk: 50, compliance: 50, roi: 60, urgency: 55 },",
    "      \"PRJ-TPL-950\": { strategic: 40, value: 35, customer: 40, risk: 30, compliance: 20, roi: 35, urgency: 30 },",
    "    };",
    "    const costs: Record<string, number> = { \"PRJ-ERP-001\": 3500000, \"PRJ-DATA-002\": 2800000, \"PRJ-PORT-003\": 1200000, \"PRJ-MOB-004\": 900000, \"PRJ-CLD-005\": 1500000, \"PRJ-CRM-006\": 600000, \"PRJ-TPL-950\": 200000 };",
    "    const projects2 = await db.project.findMany({ select: { id: true, code: true } });",
    "    const totalW = crits.reduce((acc: number, c: { weight: number }) => acc + c.weight, 0) || 1;",
    "    for (const pr of projects2) {",
    "      const scores = scoreSets[pr.code];",
    "      if (!scores) continue;",
    "      const exists = await db.projectScore.findUnique({ where: { projectId: pr.id } });",
    "      if (exists) continue;",
    "      const weighted = Math.round((crits.reduce((acc: number, c: { id: string; weight: number }) => acc + (scores[c.id] ?? 0) * c.weight, 0) / totalW) * 10) / 10;",
    "      const cls = weighted >= 90 ? \"CRITICAL\" : weighted >= 80 ? \"HIGH\" : weighted >= 70 ? \"MEDIUM\" : weighted >= 60 ? \"LOW\" : \"DEFER\";",
    "      await db.projectScore.create({ data: { projectId: pr.id, scoresJson: JSON.stringify(scores), weightedScore: weighted, classification: cls, costEstimate: costs[pr.code] ?? 500000, expectedValue: Math.round((costs[pr.code] ?? 500000) * (weighted / 100) * 1.8) } });",
    "    }",
    "    console.log(\"  ✓ Prioritization workshop scores seeded\");",
    "  }",
    "",
    "  await db.$disconnect();",
  ].join("\n");
  s = s.replace("  await db.$disconnect();", block);
  fs.writeFileSync("scripts/seed-technology.ts", s);
}
console.log("done:", r.includes("PrioritizationView"), sh.includes("Prioritization"), s.includes("projectScore"));
