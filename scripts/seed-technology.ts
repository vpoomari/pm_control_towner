// PM CONTROL TOWER — Technology & Architecture seed (non-destructive, idempotent)
import { db } from "../src/lib/db";

const APPS = [
  { name: "Core Banking Ledger", category: "APPLICATION", businessCriticality: "MISSION_CRITICAL", lifecycleStatus: "LEGACY", cloudHosted: false, owner: "CTO Office", version: "7.2.1", healthScore: 55 },
  { name: "Customer Data Platform", category: "PLATFORM", businessCriticality: "HIGH", lifecycleStatus: "ACTIVE", cloudHosted: true, owner: "Data Office", version: "3.1.0", healthScore: 82 },
  { name: "Payments Gateway", category: "APPLICATION", businessCriticality: "MISSION_CRITICAL", lifecycleStatus: "ACTIVE", cloudHosted: true, owner: "Payments", version: "5.4.2", healthScore: 88 },
  { name: "Legacy Data Warehouse", category: "INFRASTRUCTURE", businessCriticality: "MEDIUM", lifecycleStatus: "SUNSET", cloudHosted: false, owner: "Data Office", version: "1.9", healthScore: 45 },
  { name: "Integration Hub (ESB)", category: "INFRASTRUCTURE", businessCriticality: "HIGH", lifecycleStatus: "LEGACY", cloudHosted: false, owner: "Architecture", version: "2.0.9", healthScore: 60 },
  { name: "Mobile Banking App", category: "APPLICATION", businessCriticality: "MISSION_CRITICAL", lifecycleStatus: "ACTIVE", cloudHosted: true, owner: "Digital", version: "4.7.0", healthScore: 90 },
  { name: "Partner API Gateway", category: "API", businessCriticality: "HIGH", lifecycleStatus: "ACTIVE", cloudHosted: true, owner: "Architecture", version: "2.2.0", healthScore: 85 },
];
const TECHS = [
  { name: "Java 8", category: "LANGUAGE", lifecycleStatus: "UNSUPPORTED", usedByCount: 3 },
  { name: "COBOL", category: "LANGUAGE", lifecycleStatus: "UNSUPPORTED", usedByCount: 1 },
  { name: "TypeScript", category: "LANGUAGE", lifecycleStatus: "ACTIVE", usedByCount: 6 },
  { name: "Spring Boot", category: "FRAMEWORK", lifecycleStatus: "ACTIVE", version: "3.x", usedByCount: 4 },
  { name: "PostgreSQL", category: "DATABASE", lifecycleStatus: "ACTIVE", version: "16", usedByCount: 5 },
  { name: "Oracle DB", category: "DATABASE", lifecycleStatus: "DEPRECATED", version: "12c", usedByCount: 2 },
  { name: "AWS", category: "CLOUD", lifecycleStatus: "ACTIVE", usedByCount: 5 },
  { name: "Kubernetes", category: "TOOL", lifecycleStatus: "ACTIVE", version: "1.29", usedByCount: 4 },
];
const DAYS = 86_400_000;

async function main() {
  console.log("◈ Technology & Architecture seed…");
  const appCount = await db.techApplication.count();
  if (appCount === 0) {
    for (const a of APPS) await db.techApplication.create({ data: a });
    const apps = await db.techApplication.findMany();
    const byName = (n: string) => apps.find((a) => a.name === n)!;
    for (const t of TECHS) await db.techTechnology.create({ data: t });
    const debts = [
      { applicationId: byName("Core Banking Ledger").id, title: "COBOL batch jobs with no test coverage", severity: "CRITICAL", estimateHours: 600 },
      { applicationId: byName("Integration Hub (ESB)").id, title: "Point-to-point integrations bypassing the ESB", severity: "HIGH", estimateHours: 320 },
      { applicationId: byName("Legacy Data Warehouse").id, title: "Unmanaged ETL scripts", severity: "HIGH", estimateHours: 240 },
      { applicationId: byName("Payments Gateway").id, title: "HSM firmware lifecycle review", severity: "MEDIUM", estimateHours: 80 },
      { applicationId: byName("Customer Data Platform").id, title: "PII retention policy automation", severity: "MEDIUM", estimateHours: 120 },
    ];
    for (const d of debts) await db.technicalDebt.create({ data: d });
    const rels = [
      { app: "Payments Gateway", version: "5.4.2", daysAgo: 5, deployments: 3, lead: 2 },
      { app: "Mobile Banking App", version: "4.7.0", daysAgo: 12, deployments: 8, lead: 3 },
      { app: "Customer Data Platform", version: "3.1.0", daysAgo: 30, deployments: 2, lead: 9 },
      { app: "Partner API Gateway", version: "2.2.0", daysAgo: 45, deployments: 4, lead: 5 },
      { app: "Payments Gateway", version: "5.4.1", daysAgo: 60, deployments: 3, lead: 4 },
      { app: "Core Banking Ledger", version: "7.2.1", daysAgo: 80, deployments: 1, lead: 45 },
    ];
    for (const r of rels) await db.techRelease.create({ data: { applicationId: byName(r.app).id, version: r.version, releasedAt: new Date(Date.now() - r.daysAgo * DAYS), status: "DEPLOYED", deployments: r.deployments, leadTimeDays: r.lead } });
    console.log("  ✓", apps.length, "apps,", TECHS.length, "technologies,", debts.length, "debts,", rels.length, "releases seeded");
  } else {
    console.log("  ✓ Technology register already populated (" + appCount + " apps) — skipping");
  }

  // ---- Governed delivery automation rules (WHEN/IF/THEN, engine-backed) ----
  const rules = [
    { name: "SPI breach -> PM re-plan alert", description: "EVM period closes with SPI < 0.90 -> PM alerted to review the drafted recovery scenarios.", triggerType: "EVM_PERIOD_CLOSED", conditionsJson: JSON.stringify([{ field: "spi", op: "LT", value: 0.9 }]), actionsJson: JSON.stringify([{ type: "CREATE_INBOX_ITEM", params: { roles: ["PROJECT_MANAGER", "PMO_ADMIN"], category: "ACTION_REQUIRED", priority: "HIGH", title: "SPI below 0.90 — quantified recovery scenarios drafted", message: "A reporting period closed with SPI below 0.90. Open Data Integrity > AI Actions for the three quantified recovery options (crash / descope / extend).", actionUrl: "#/integrity" } }]) },
    { name: "EVM period closed -> executive digest", description: "Every period close notifies PMO leadership with the new CPI/SPI.", triggerType: "EVM_PERIOD_CLOSED", conditionsJson: JSON.stringify([]), actionsJson: JSON.stringify([{ type: "NOTIFY_ROLE", params: { roles: ["PMO_ADMIN", "EXECUTIVE"], title: "EVM period closed", message: "A new EVM period was captured — indices updated on the tower." } }]) },
    { name: "Freshness critical -> PMO escalation", description: "Any project hitting CRITICAL data freshness escalates to the PMO.", triggerType: "FRESHNESS_CRITICAL", conditionsJson: JSON.stringify([]), actionsJson: JSON.stringify([{ type: "NOTIFY_ROLE", params: { roles: ["PMO_ADMIN"], title: "Data freshness critical", message: "A project crossed the critical staleness threshold — its dashboard figures may not reflect reality.", actionUrl: "#/integrity" } }]) },
  ];
  for (const r of rules) {
    const exists = await db.automationRule.findFirst({ where: { name: r.name } });
    if (!exists) await db.automationRule.create({ data: { ...r, isActive: true, createdBy: "seed" } });
  }
  console.log("  ✓ Governance automation rules seeded (SPI breach, period digest, freshness escalation)");


  // ---- Prioritization workshop scores (human-judged inputs; totals computed) ----
  const crits = await db.priorityCriterion.findMany({ orderBy: { order: "asc" } });
  if (crits.length > 0) {
    const scoreSets: Record<string, Record<string, number>> = {
      "PRJ-ERP-001": { strategic: 92, value: 85, customer: 88, risk: 75, compliance: 95, roi: 82, urgency: 85 },
      "PRJ-DATA-002": { strategic: 88, value: 90, customer: 80, risk: 85, compliance: 90, roi: 78, urgency: 90 },
      "PRJ-PORT-003": { strategic: 75, value: 70, customer: 72, risk: 60, compliance: 55, roi: 65, urgency: 60 },
      "PRJ-MOB-004": { strategic: 82, value: 78, customer: 92, risk: 55, compliance: 60, roi: 75, urgency: 70 },
      "PRJ-CLD-005": { strategic: 85, value: 72, customer: 60, risk: 80, compliance: 70, roi: 80, urgency: 65 },
      "PRJ-CRM-006": { strategic: 65, value: 62, customer: 85, risk: 50, compliance: 50, roi: 60, urgency: 55 },
      "PRJ-TPL-950": { strategic: 40, value: 35, customer: 40, risk: 30, compliance: 20, roi: 35, urgency: 30 },
    };
    const costs: Record<string, number> = { "PRJ-ERP-001": 3500000, "PRJ-DATA-002": 2800000, "PRJ-PORT-003": 1200000, "PRJ-MOB-004": 900000, "PRJ-CLD-005": 1500000, "PRJ-CRM-006": 600000, "PRJ-TPL-950": 200000 };
    const projects2 = await db.project.findMany({ select: { id: true, code: true } });
    const totalW = crits.reduce((acc: number, c: { weight: number }) => acc + c.weight, 0) || 1;
    for (const pr of projects2) {
      const scores = scoreSets[pr.code];
      if (!scores) continue;
      const exists = await db.projectScore.findUnique({ where: { projectId: pr.id } });
      if (exists) continue;
      const weighted = Math.round((crits.reduce((acc: number, c: { id: string; weight: number }) => acc + (scores[c.id] ?? 0) * c.weight, 0) / totalW) * 10) / 10;
      const cls = weighted >= 90 ? "CRITICAL" : weighted >= 80 ? "HIGH" : weighted >= 70 ? "MEDIUM" : weighted >= 60 ? "LOW" : "DEFER";
      await db.projectScore.create({ data: { projectId: pr.id, scoresJson: JSON.stringify(scores), weightedScore: weighted, classification: cls, costEstimate: costs[pr.code] ?? 500000, expectedValue: Math.round((costs[pr.code] ?? 500000) * (weighted / 100) * 1.8) } });
    }
    console.log("  ✓ Prioritization workshop scores seeded");
  }

  await db.$disconnect();
}
main().catch((e) => { console.error("Seed failed:", e.message); process.exit(1); });
