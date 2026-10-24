// PM CONTROL TOWER — Expense detail API (Command Center v3.0)
// PATCH  /api/expenses/[id] — update / approve / reimburse
// DELETE /api/expenses/[id]

import { z } from "zod";
import { db } from "@/lib/db";
import { withApi, ok, ApiError, parseBody } from "@/lib/api";
import { writeAudit } from "@/lib/audit";

const EXPENSE_STATUS = ["PENDING", "APPROVED", "REJECTED", "REIMBURSED"] as const;
const EXPENSE_CATEGORIES = ["LABOR", "MATERIALS", "EQUIPMENT", "TRAVEL", "SOFTWARE", "SERVICES", "OTHER"] as const;

const updateSchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES).optional(),
  description: z.string().min(2).max(400).optional(),
  amount: z.coerce.number().min(0).optional(),
  billable: z.coerce.boolean().optional(),
  vendorName: z.string().max(160).optional().nullable(),
  receiptUrl: z.string().max(400).optional().nullable(),
  status: z.enum(EXPENSE_STATUS).optional(),
});

export const PATCH = withApi(async (ctx) => {
  const session = ctx.session!;
  const { id } = ctx.params;
  const body = await parseBody(ctx.req, updateSchema);
  const existing = await db.expense.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "Expense not found");
  const updated = await db.expense.update({
    where: { id },
    data: {
      ...body,
      ...(body.status === "APPROVED" || body.status === "REIMBURSED" ? { approvedByName: session.name } : {}),
    },
  });
  await writeAudit({
    userId: session.id, userName: session.name, role: session.roles[0],
    action: "UPDATE", entityType: "Expense", entityId: id, entityName: updated.description,
    before: { status: existing.status, amount: existing.amount },
    after: { status: updated.status, amount: updated.amount }, ipAddress: ctx.ip,
  });
  return ok({ expense: updated });
}, { permission: "client.manage", rateLimit: { limit: 120, windowMs: 60_000 } });

export const DELETE = withApi(async (ctx) => {
  const session = ctx.session!;
  const { id } = ctx.params;
  const existing = await db.expense.findUnique({ where: { id }, select: { id: true, description: true } });
  if (!existing) throw new ApiError(404, "Expense not found");
  await db.expense.delete({ where: { id } });
  await writeAudit({
    userId: session.id, userName: session.name, role: session.roles[0],
    action: "DELETE", entityType: "Expense", entityId: id, entityName: existing.description, ipAddress: ctx.ip,
  });
  return ok({ deleted: true });
}, { permission: "client.manage", rateLimit: { limit: 120, windowMs: 60_000 } });
