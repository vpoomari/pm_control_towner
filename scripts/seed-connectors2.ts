// v1.4.1 — additional ecosystem connectors (idempotent)
import { db } from "../src/lib/db";

const NEW_CONNECTORS = [
  { name: "GitLab", category: "DEVOPS", provider: "GitLab", authType: "PAT", syncDirection: "INBOUND", syncFrequency: "REALTIME", description: "Merge requests, pipelines and deployments feed task progress and release evidence (self-managed or SaaS).", cfg: { baseUrl: "https://{host}/api/v4", entities: ["mergeRequest", "pipeline", "deployment"], webhooks: ["merge_request", "pipeline", "deployment"], inboundEntity: "TaskProgress/Release" } },
  { name: "Microsoft 365 Suite", category: "COLLABORATION", provider: "Microsoft", authType: "OAUTH2", syncDirection: "BIDIRECTIONAL", syncFrequency: "REALTIME", description: "One Graph connection covering Teams approvals, SharePoint documents, Outlook notifications and Excel round-trips under a single consent.", cfg: { baseUrl: "https://graph.microsoft.com/v1.0", entities: ["teams", "sharepoint", "mail", "excel"], webhooks: ["changeNotifications"], inboundEntity: "Document", outboundEntity: "Approval/Alert/Report" } },
  { name: "Microsoft Power BI", category: "ANALYTICS", provider: "Microsoft", authType: "OAUTH2", syncDirection: "OUTBOUND", syncFrequency: "HOURLY", description: "Push PMCT datasets to Power BI workspaces for enterprise BI dashboards; scheduled dataset refresh from portfolio EVM/health.", cfg: { baseUrl: "https://api.powerbi.com/v1.0/myorg", entities: ["dataset", "pushDataset"], webhooks: [], inboundEntity: "-", outboundEntity: "PortfolioDataset/EvmDataset" } },
  { name: "Email / Outlook", category: "MESSAGING", provider: "Microsoft", authType: "OAUTH2", syncDirection: "OUTBOUND", syncFrequency: "REALTIME", description: "Email-ready notification channel: alerts, approvals and scheduled reports delivered as mail; graph sendMail with rich formatting.", cfg: { baseUrl: "https://graph.microsoft.com/v1.0/me/sendMail", entities: ["mail"], webhooks: [], inboundEntity: "-", outboundEntity: "Notification/Approval/Report" } },
  { name: "Google Workspace", category: "COLLABORATION", provider: "Google", authType: "OAUTH2", syncDirection: "BIDIRECTIONAL", syncFrequency: "DAILY", description: "Sheets export/import for grid round-trips; Drive document linking to deliverables; calendar sync for milestones and gates.", cfg: { baseUrl: "https://sheets.googleapis.com/v4 | https://www.googleapis.com/drive/v3 | https://www.googleapis.com/calendar/v3", entities: ["sheet", "driveFile", "calendarEvent"], webhooks: [], inboundEntity: "Document/BulkUpdate", outboundEntity: "Report/Milestone" } },
  { name: "REST API (Open Data)", category: "PLATFORM", provider: "PMCT Native", authType: "API_TOKEN", syncDirection: "BIDIRECTIONAL", syncFrequency: "REALTIME", description: "The 120-route PMCT REST API with JWT bearer tokens, zod-validated payloads, rate limiting and full audit — build any custom connector on it.", cfg: { baseUrl: "https://{host}/api", entities: ["all-entities"], webhooks: ["outbound-webhooks"], inboundEntity: "All", outboundEntity: "All" } },
  { name: "SSO / Identity (SAML 2.0 & OIDC)", category: "IDENTITY", provider: "Entra ID | Okta | Ping | ADFS", authType: "SAML_OIDC", syncDirection: "INBOUND", syncFrequency: "REALTIME", description: "Enterprise single sign-on: federated login maps IdP groups to PMCT roles (8 roles / 36 permissions) on first login; JIT user creation with role mapping rules.", cfg: { baseUrl: "https://{idp}/sso", entities: ["samlAssertion", "oidcIdToken"], webhooks: [], inboundEntity: "User/Session", outboundEntity: "-" } },
  { name: "SCIM User Provisioning", category: "IDENTITY", provider: "Entra ID | Okta", authType: "OAUTH2_BEARER", syncDirection: "BIDIRECTIONAL", syncFrequency: "REALTIME", description: "Automated user lifecycle: create/update/deactivate accounts and role assignments from your IdP directory — joiners, movers and leavers without manual admin.", cfg: { baseUrl: "https://{host}/api/scim/v2 (RFC 7644)", entities: ["User", "Group"], webhooks: [], inboundEntity: "User/Role", outboundEntity: "-" } },
];

async function main() {
  console.log("◈ Additional ecosystem connectors…");
  for (const c of NEW_CONNECTORS) {
    const payload = {
      category: c.category, provider: c.provider, description: c.description,
      status: "CONFIGURED", authType: c.authType, authStatus: "NOT_CONFIGURED",
      syncDirection: c.syncDirection, syncFrequency: c.syncFrequency,
      configJson: JSON.stringify({ ...c.cfg, honestStatus: "CONFIGURED — becomes CONNECTED only after a live credential test succeeds" }),
    };
    const existing = await db.integration.findFirst({ where: { name: c.name } });
    if (existing) await db.integration.update({ where: { id: existing.id }, data: payload });
    else await db.integration.create({ data: { name: c.name, ...payload } });
  }
  console.log("  ✓ " + NEW_CONNECTORS.length + " connectors added — total in hub: " + (await db.integration.count()));
  await db.$disconnect();
}
main().catch((e) => { console.error("Seed failed:", e.message); process.exit(1); });
