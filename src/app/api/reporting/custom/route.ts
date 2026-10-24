// PM CONTROL TOWER — Custom Report Builder + Subscriptions API
// GET    /api/reporting/custom               — list user's custom reports
// POST   /api/reporting/custom               — create custom report definition
// DELETE /api/reporting/custom?id=           — delete
// GET    /api/reporting/custom/subs          — user's subscriptions
// POST   /api/reporting/custom/subs          — subscribe/unsubscribe

import { z } from "zod";
import { db } from "@/lib/db";
import { withApi, ok, ApiError, parseBody } from "@/lib/api";
import { writeAudit } from "@/lib/audit";

export const GET = withApi(async (ctx) => {
  const session = ctx.session!;
  if (ctx.searchParams.get("subs")) {
    const subs = await db.reportSubscription.findMany({ where: { userId: session.id } });
    const templates = await db.reportingTemplate.findMany({ where: { id: { in: subs.map((s) => s.templateId) } }, select: { id: true, name: true, category: true } });
    return ok({ subscriptions: subs, templates });
  }
  const custom = await db.customReport.findMany({ where: { createdBy: session.id }, orderBy: { updatedAt: "desc" } });
  return ok({ customReports: custom });
}, { permission: "reports.view", rateLimit: { limit: 240, windowMs: 60_000 } });

const componentSchema = z.object({
  type: z.enum(["kpi", "bar", "line", "pie", "table", "text", "rag", "waterfall"]),
  title: z.string(),
  dataSource: z.string().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

const createSchema = z.object({
  name: z.string().min(2),
  category: z.string().default("CUSTOM"),
  components: z.array(componentSchema).min(1),
});

export const POST = withApi(async (ctx) => {
  const session = ctx.session!;
  const body = await parseBody(ctx.req, createSchema);
  const cr = await db.customReport.create({
    data: { name: body.name, category: body.category, componentsJson: JSON.stringify(body.components), createdBy: session.id },
  });
  await writeAudit({ userId: session.id, userName: session.name, action: "CREATE", entityType: "CustomReport", entityId: cr.id, entityName: cr.name, after: { components: body.components.length } });
  return ok({ report: cr }, 201);
}, { permission: "reports.view", rateLimit: { limit: 60, windowMs: 60_000 } });

export const DELETE = withApi(async (ctx) => {
  const session = ctx.session!;
  const id = ctx.searchParams.get("id");
  if (!id) throw new ApiError(400, "id required");
  await db.customReport.delete({ where: { id } });
  await writeAudit({ userId: session.id, userName: session.name, action: "DELETE", entityType: "CustomReport", entityId: id, entityName: "Custom report" });
  return ok({ deleted: true });
}, { permission: "reports.view", rateLimit: { limit: 60, windowMs: 60_000 } });
