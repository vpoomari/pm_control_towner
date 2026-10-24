// PM CONTROL TOWER — Clients API (Command Center v3.0)
// GET  /api/clients?q — client register with project/invoice roll-ups
// POST /api/clients   — create client

import { z } from "zod";
import { db } from "@/lib/db";
import { withApi, ok, ApiError, parseBody } from "@/lib/api";
import { writeAudit } from "@/lib/audit";

const CLIENT_STATUS = ["PROSPECT", "ACTIVE", "ON_HOLD", "CHURNED"] as const;

export const GET = withApi(async (ctx) => {
  const q = ctx.searchParams.get("q")?.trim();
  const clients = await db.client.findMany({
    where: q ? { OR: [{ name: { contains: q } }, { organization: { contains: q } }, { contactName: { contains: q } }] } : {},
    include: {
      _count: { select: { projects: true, invoices: true } },
    },
    orderBy: { name: "asc" },
  });
  const invoiceAgg = await db.invoice.groupBy({ by: ["clientId", "status"], _sum: { total: true } });
  return ok({
    clients: clients.map((c) => {
      const agg = invoiceAgg.filter((a) => a.clientId === c.id);
      const sum = (s: string) => agg.filter((a) => a.status === s).reduce((t, a) => t + (a._sum.total ?? 0), 0);
      return {
        ...c,
        projectCount: c._count.projects,
        invoiceCount: c._count.invoices,
        invoicedTotal: agg.reduce((t, a) => t + (a._sum.total ?? 0), 0),
        paidTotal: sum("PAID"),
        outstandingTotal: sum("SENT") + sum("OVERDUE"),
      };
    }),
    summary: {
      total: clients.length,
      active: clients.filter((c) => c.status === "ACTIVE").length,
      invoiced: invoiceAgg.reduce((t, a) => t + (a._sum.total ?? 0), 0),
    },
  });
}, { permission: "financial.view", rateLimit: { limit: 300, windowMs: 60_000 } });

const createSchema = z.object({
  name: z.string().min(2).max(160),
  organization: z.string().max(160).optional().nullable(),
  contactName: z.string().max(160).optional().nullable(),
  email: z.string().max(200).optional().nullable(),
  phone: z.string().max(60).optional().nullable(),
  portalUrl: z.string().max(400).optional().nullable(),
  status: z.enum(CLIENT_STATUS).default("ACTIVE"),
  notes: z.string().max(4000).optional().nullable(),
});

export const POST = withApi(async (ctx) => {
  const session = ctx.session!;
  const body = await parseBody(ctx.req, createSchema);
  const created = await db.client.create({ data: { ...body } });
  await writeAudit({
    userId: session.id, userName: session.name, role: session.roles[0],
    action: "CREATE", entityType: "Client", entityId: created.id, entityName: created.name,
    after: { status: created.status }, ipAddress: ctx.ip,
  });
  return ok({ client: created }, 201);
}, { permission: "client.manage", rateLimit: { limit: 120, windowMs: 60_000 } });
