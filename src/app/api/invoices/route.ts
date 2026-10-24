// PM CONTROL TOWER — Invoices API (Command Center v3.0)
// GET  /api/invoices?clientId&projectId&status — invoice register with lines
// POST /api/invoices — create invoice with line items (totals computed server-side)

import { z } from "zod";
import { db } from "@/lib/db";
import { withApi, ok, ApiError, parseBody } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { round2 } from "@/lib/constants";

const INVOICE_STATUS = ["DRAFT", "SENT", "PAID", "OVERDUE", "VOID"] as const;

export const GET = withApi(async (ctx) => {
  const clientId = ctx.searchParams.get("clientId")?.trim();
  const projectId = ctx.searchParams.get("projectId")?.trim();
  const status = ctx.searchParams.get("status")?.trim();

  const invoices = await db.invoice.findMany({
    where: {
      ...(clientId ? { clientId } : {}),
      ...(projectId ? { projectId } : {}),
      ...(status && INVOICE_STATUS.includes(status as (typeof INVOICE_STATUS)[number]) ? { status } : {}),
    },
    include: {
      client: { select: { id: true, name: true, organization: true } },
      project: { select: { id: true, code: true, name: true } },
      lines: true,
    },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  const now = Date.now();
  return ok({
    invoices,
    summary: {
      total: invoices.length,
      invoiced: round2(invoices.filter((i) => i.status !== "VOID").reduce((s, i) => s + i.total, 0)),
      paid: round2(invoices.filter((i) => i.status === "PAID").reduce((s, i) => s + i.total, 0)),
      outstanding: round2(invoices.filter((i) => i.status === "SENT" || i.status === "OVERDUE").reduce((s, i) => s + i.total, 0)),
      overdue: invoices.filter((i) => i.status !== "PAID" && i.status !== "VOID" && i.dueDate && i.dueDate.getTime() < now).length,
    },
  });
}, { permission: "financial.view", rateLimit: { limit: 300, windowMs: 60_000 } });

const lineSchema = z.object({
  description: z.string().min(1).max(300),
  quantity: z.coerce.number().min(0).default(1),
  unitPrice: z.coerce.number().min(0),
  taskId: z.string().optional().nullable(),
});

const createSchema = z.object({
  clientId: z.string().min(1),
  projectId: z.string().optional().nullable(),
  number: z.string().min(1).max(40),
  status: z.enum(INVOICE_STATUS).default("DRAFT"),
  currency: z.string().max(3).default("USD"),
  issueDate: z.coerce.date().optional().nullable(),
  dueDate: z.coerce.date().optional().nullable(),
  taxPct: z.coerce.number().min(0).max(100).default(0),
  notes: z.string().max(4000).optional().nullable(),
  lines: z.array(lineSchema).min(1).max(100),
});

export const POST = withApi(async (ctx) => {
  const session = ctx.session!;
  const body = await parseBody(ctx.req, createSchema);
  const client = await db.client.findUnique({ where: { id: body.clientId }, select: { id: true, name: true } });
  if (!client) throw new ApiError(404, "Client not found");
  if (body.projectId) {
    const project = await db.project.findUnique({ where: { id: body.projectId }, select: { id: true } });
    if (!project) throw new ApiError(404, "Project not found");
  }
  const dupe = await db.invoice.findUnique({ where: { number: body.number }, select: { id: true } });
  if (dupe) throw new ApiError(400, `Invoice number ${body.number} already exists`);

  const subtotal = round2(body.lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0));
  const taxAmount = round2(subtotal * (body.taxPct / 100));
  const created = await db.invoice.create({
    data: {
      clientId: body.clientId,
      projectId: body.projectId ?? null,
      number: body.number,
      status: body.status,
      currency: body.currency,
      issueDate: body.issueDate ?? new Date(),
      dueDate: body.dueDate ?? null,
      taxPct: body.taxPct,
      subtotal,
      taxAmount,
      total: round2(subtotal + taxAmount),
      notes: body.notes ?? null,
      lines: {
        create: body.lines.map((l) => ({
          description: l.description, quantity: l.quantity, unitPrice: l.unitPrice,
          total: round2(l.quantity * l.unitPrice), taskId: l.taskId ?? null,
        })),
      },
    },
    include: { lines: true },
  });
  await writeAudit({
    userId: session.id, userName: session.name, role: session.roles[0],
    action: "CREATE", entityType: "Invoice", entityId: created.id, entityName: created.number,
    after: { total: created.total, status: created.status, clientId: body.clientId }, ipAddress: ctx.ip,
  });
  return ok({ invoice: created }, 201);
}, { permission: "client.manage", rateLimit: { limit: 120, windowMs: 60_000 } });
