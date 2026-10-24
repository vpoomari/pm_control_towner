// PM CONTROL TOWER — Invoice detail API (Command Center v3.0)
// GET    /api/invoices/[id] — invoice with lines
// PATCH  /api/invoices/[id] — update status/dates/lines (totals recomputed)
// DELETE /api/invoices/[id] — remove draft invoice

import { z } from "zod";
import { db } from "@/lib/db";
import { withApi, ok, ApiError, parseBody } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { round2 } from "@/lib/constants";

const INVOICE_STATUS = ["DRAFT", "SENT", "PAID", "OVERDUE", "VOID"] as const;

const lineSchema = z.object({
  description: z.string().min(1).max(300),
  quantity: z.coerce.number().min(0).default(1),
  unitPrice: z.coerce.number().min(0),
  taskId: z.string().optional().nullable(),
});

const updateSchema = z.object({
  status: z.enum(INVOICE_STATUS).optional(),
  dueDate: z.coerce.date().optional().nullable(),
  issueDate: z.coerce.date().optional().nullable(),
  taxPct: z.coerce.number().min(0).max(100).optional(),
  notes: z.string().max(4000).optional().nullable(),
  lines: z.array(lineSchema).min(1).max(100).optional(),
  paidAt: z.coerce.date().optional().nullable(),
});

export const GET = withApi(async (ctx) => {
  const { id } = ctx.params;
  const invoice = await db.invoice.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true, organization: true, contactName: true, email: true } },
      project: { select: { id: true, code: true, name: true } },
      lines: true,
    },
  });
  if (!invoice) throw new ApiError(404, "Invoice not found");
  return ok({ invoice });
}, { permission: "financial.view", rateLimit: { limit: 300, windowMs: 60_000 } });

export const PATCH = withApi(async (ctx) => {
  const session = ctx.session!;
  const { id } = ctx.params;
  const body = await parseBody(ctx.req, updateSchema);
  const existing = await db.invoice.findUnique({ where: { id }, include: { lines: true } });
  if (!existing) throw new ApiError(404, "Invoice not found");
  if (existing.status === "PAID" && body.status && body.status !== "PAID") {
    throw new ApiError(400, "Paid invoices are locked — reopen via VOID first");
  }

  const lines = body.lines ?? existing.lines.map((l) => ({ description: l.description, quantity: l.quantity, unitPrice: l.unitPrice, taskId: l.taskId }));
  const taxPct = body.taxPct ?? existing.taxPct;
  const subtotal = round2(lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0));
  const taxAmount = round2(subtotal * (taxPct / 100));

  const updated = await db.invoice.update({
    where: { id },
    data: {
      ...(body.status !== undefined ? { status: body.status } : {}),
      ...(body.issueDate !== undefined ? { issueDate: body.issueDate } : {}),
      ...(body.dueDate !== undefined ? { dueDate: body.dueDate } : {}),
      ...(body.notes !== undefined ? { notes: body.notes } : {}),
      ...(body.taxPct !== undefined ? { taxPct } : {}),
      ...(body.paidAt !== undefined ? { paidAt: body.paidAt } : {}),
      ...(body.lines !== undefined ? { lines: { deleteMany: {}, create: lines.map((l) => ({ description: l.description, quantity: l.quantity, unitPrice: l.unitPrice, total: round2(l.quantity * l.unitPrice), taskId: l.taskId ?? null })) } } : {}),
      subtotal, taxAmount, total: round2(subtotal + taxAmount),
      ...(body.status === "PAID" && !existing.paidAt ? { paidAt: new Date() } : {}),
    },
    include: { lines: true },
  });
  await writeAudit({
    userId: session.id, userName: session.name, role: session.roles[0],
    action: "UPDATE", entityType: "Invoice", entityId: id, entityName: updated.number,
    before: { status: existing.status, total: existing.total },
    after: { status: updated.status, total: updated.total }, ipAddress: ctx.ip,
  });
  return ok({ invoice: updated });
}, { permission: "client.manage", rateLimit: { limit: 120, windowMs: 60_000 } });

export const DELETE = withApi(async (ctx) => {
  const session = ctx.session!;
  const { id } = ctx.params;
  const existing = await db.invoice.findUnique({ where: { id }, select: { id: true, number: true, status: true } });
  if (!existing) throw new ApiError(404, "Invoice not found");
  if (existing.status === "PAID") throw new ApiError(400, "Paid invoices cannot be deleted");
  await db.invoice.delete({ where: { id } });
  await writeAudit({
    userId: session.id, userName: session.name, role: session.roles[0],
    action: "DELETE", entityType: "Invoice", entityId: id, entityName: existing.number, ipAddress: ctx.ip,
  });
  return ok({ deleted: true });
}, { permission: "client.manage", rateLimit: { limit: 120, windowMs: 60_000 } });
