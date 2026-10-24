// PM CONTROL TOWER — Ecosystem connector catalog (v1.4.0)
// Registers the enterprise connector set into the Integration Hub with full
// metadata. HONEST STATUS: every connector ships as CONFIGURED (endpoint +
// auth + entity mapping defined) — a connector only becomes CONNECTED after a
// live credential test succeeds. Never fake it.
import { db } from "../src/lib/db";

const CONNECTORS = [
  { name: "Jira Software", category: "DELIVERY", provider: "Atlassian", authType: "API_TOKEN", syncDirection: "BIDIRECTIONAL", syncFrequency: "REALTIME", description: "Sync issues, sprints, story points and statuses into PMCT tasks; PMCT EVM/health flow back to Jira dashboards.", cfg: { baseUrl: "https://{site}.atlassian.net/rest/api/3", entities: ["issue", "sprint", "project"], webhooks: ["jira:issue_updated", "sprint_closed"], inboundEntity: "Task", outboundEntity: "EvmSnapshot" } },
  { name: "ServiceNow SPM", category: "ITSM", provider: "ServiceNow", authType: "OAUTH2", syncDirection: "BIDIRECTIONAL", syncFrequency: "HOURLY", description: "Import demands/incidents as projects & risks; export project status to the ServiceNow SPM workspace.", cfg: { baseUrl: "https://{instance}.service-now.com/api/now", entities: ["pm_project", "incident", "demand"], webhooks: [], inboundEntity: "Project/Risk", outboundEntity: "ProjectStatus" } },
  { name: "SAP S/4HANA", category: "FINANCE", provider: "SAP", authType: "OAUTH2_SAML", syncDirection: "INBOUND", syncFrequency: "DAILY", description: "Actual costs, purchase orders, invoices and cost centers feed the PMCT cost ledger and committed-cost view.", cfg: { baseUrl: "https://{host}/sap/opu/odata/sap", entities: ["costLedger", "purchaseOrder", "costCenter"], webhooks: [], inboundEntity: "ActualCost/CommittedCost" } },
  { name: "Microsoft Teams", category: "COLLABORATION", provider: "Microsoft", authType: "OAUTH2", syncDirection: "OUTBOUND", syncFrequency: "REALTIME", description: "Approval deep links, alerts and weekly steering packs delivered to Teams channels & adaptive cards.", cfg: { baseUrl: "https://graph.microsoft.com/v1.0", entities: ["channelMessage", "adaptiveCard"], webhooks: [], inboundEntity: "-", outboundEntity: "Approval/Alert/SteeringPack" } },
  { name: "Microsoft SharePoint", category: "DOCUMENTS", provider: "Microsoft", authType: "OAUTH2", syncDirection: "BIDIRECTIONAL", syncFrequency: "DAILY", description: "Project document libraries linked to PMCT deliverables; gate evidence pulled from SharePoint folders.", cfg: { baseUrl: "https://{tenant}.sharepoint.com/sites/{site}/_api", entities: ["documentLibrary", "folder"], webhooks: [], inboundEntity: "Document", outboundEntity: "GateEvidence" } },
  { name: "Microsoft Excel", category: "DATA", provider: "Microsoft", authType: "OAUTH2", syncDirection: "BIDIRECTIONAL", syncFrequency: "ON_DEMAND", description: "Round-trip export/import: any PMCT grid to Excel; governed CSV/Excel import with dry-run validation for bulk updates.", cfg: { baseUrl: "https://graph.microsoft.com/v1.0/me/drive", entities: ["workbook", "table"], webhooks: [], inboundEntity: "BulkUpdate(governed)", outboundEntity: "AnyGrid" } },
  { name: "Broadcom Clarity", category: "PPM", provider: "Broadcom", authType: "API_KEY", syncDirection: "BIDIRECTIONAL", syncFrequency: "DAILY", description: "Migrate/mirror investments, resources and financial plans from Clarity into PMCT portfolios.", cfg: { baseUrl: "https://{host}/ppm/rest/v1", entities: ["investment", "resource", "financialPlan"], webhooks: [], inboundEntity: "Investment", outboundEntity: "Portfolio" } },
  { name: "Azure DevOps", category: "DELIVERY", provider: "Microsoft", authType: "PAT", syncDirection: "INBOUND", syncFrequency: "REALTIME", description: "Work items, builds and release pipelines feed delivery progress and the CTO tower's DevOps metrics.", cfg: { baseUrl: "https://dev.azure.com/{org}/_apis", entities: ["workItem", "build", "release"], webhooks: ["build.complete", "release.deploymentCompleted"], inboundEntity: "Task/Release" } },
  { name: "GitHub", category: "DEVOPS", provider: "GitHub", authType: "PAT", syncDirection: "INBOUND", syncFrequency: "REALTIME", description: "Commits, PRs and deployments enrich task progress and release evidence for the CTO tower.", cfg: { baseUrl: "https://api.github.com", entities: ["commit", "pullRequest", "deployment"], webhooks: ["push", "deployment_status"], inboundEntity: "TaskProgress/Release" } },
  { name: "Slack", category: "COLLABORATION", provider: "Slack", authType: "OAUTH2", syncDirection: "OUTBOUND", syncFrequency: "REALTIME", description: "Exception alerts and approval requests to Slack channels with interactive buttons.", cfg: { baseUrl: "https://slack.com/api", entities: ["channelMessage", "blockKit"], webhooks: [], inboundEntity: "-", outboundEntity: "Alert/Approval" } },
  { name: "Salesforce", category: "CRM", provider: "Salesforce", authType: "OAUTH2", syncDirection: "INBOUND", syncFrequency: "DAILY", description: "Customer commitments and accounts link projects to revenue impact for benefits realization.", cfg: { baseUrl: "https://{instance}/services/data/v60.0", entities: ["account", "opportunity"], webhooks: [], inboundEntity: "BenefitBaseline" } },
];

async function main() {
  console.log("◈ Ecosystem connector catalog seed…");
  for (const c of CONNECTORS) {
    const existing = await db.integration.findFirst({ where: { name: c.name } });
    const payload = {
      category: c.category, provider: c.provider, description: c.description,
      status: "CONFIGURED", authType: c.authType, authStatus: "NOT_CONFIGURED",
      syncDirection: c.syncDirection, syncFrequency: c.syncFrequency,
      configJson: JSON.stringify({ ...c.cfg, honestStatus: "CONFIGURED — becomes CONNECTED only after a live credential test succeeds" }),
    };
    if (existing) await db.integration.update({ where: { id: existing.id }, data: payload });
    else await db.integration.create({ data: { name: c.name, ...payload } });
  }
  const total = await db.integration.count();
  console.log(`  ✓ ${CONNECTORS.length} enterprise connectors registered (CONFIGURED) — ${total} total integrations in the hub`);
  await db.$disconnect();
}
main().catch((e) => { console.error("Seed failed:", e.message); process.exit(1); });
