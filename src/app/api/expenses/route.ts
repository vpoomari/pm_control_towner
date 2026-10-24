// PM CONTROL TOWER — Expenses API (Command Center v3.0)
// GET  /api/expenses?projectId&status — expense register
// POST /api/expenses — log expense

import { z } from "zod";
import { db } from "@/lib/db";
import { withApi, ok, ApiError, parseBody } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { round2 } from "@/lib/constants";

const EXPENSE_STATUS = ["PENDING", "APPROVED", "REJECTED", "REIMBURSED"] as const;
const EXPENSE_CATEGORIES = ["LABOR", "MATERIALS", "EQUIPMENT", "TRAVEL", "SOFTWARE", "SERVICES", "OTHER"] as const;

export const GET = withApi(async (ctx) => {
  const projectId = ctx.searchParams.get("projectId")?.trim();
  const status = ctx.searchParams.get("status")?.trim();

  const expenses = await db.expense.findMany({
    where: {
      ...(projectId ? { projectId } : {}),
      ...(status && EXPENSE_STATUS.includes(status as (typeof EXPENSE_STATUS)[number]) ? { status } : {}),
    },
    include: { project: { select: { id: true, code: true, name: true } } },
    orderBy: { expenseDate: "desc" },
    take: 500,
  });
  return ok({
    expenses,
    summary: {
      total: expenses.length,
      amount: round2(expenses.reduce((s, e) => s + e.amount, 0)),
      billable: round2(expenses.filter((e) => e.billable).reduce((s, e) => s + e.amount, 0)),
      pending: expenses.filter((e) => e.status === "PENDING").length,
      byCategory: EXPENSE_CATEGORIES.map((c) => ({
        category: c,
        amount: round2(expenses.filter((e) => e.category === c).reduce((s, e) => s + e.amount, 0)),
      })),
    },
  });
}, { permission: "financial.view", rateLimit: { limit: 300, windowMs: 60_000 } });

const createSchema = z.object({
  projectId: z.string().min(1),
  category: z.enum(EXPENSE_CATEGORIES).default("OTHER"),
  description: z.string().min(2).max(400),
  amount: z.coerce.number().min(0),
  currency: z.string().max(3).default("USD"),
  expenseDate: z.coerce.date().default(() => new Date()),
  billable: z.coerce.boolean().default(true),
  vendorName: z.string().max(160).optional().nullable(),
  receiptUrl: z.string().max(400).optional().nullable(),
});

export const POST = withApi(async (ctx) => {
  const session = ctx.session!;
  const body = await parseBody(ctx.req, createSchema);
  const project = await db.project.findUnique({ where: { id: body.projectId }, select: { id: true, code: true } });
  if (!project) throw new ApiError(404, "Project not found");
  const created = await db.expense.create({ data: { ...body, expenseDate: body.expenseDate ?? new Date() } });
  await writeAudit({
    userId: session.id, userName: session.name, role: session.roles[0],
    action: "CREATE", entityType: "Expense", entityId: created.id, entityName: created.description,
    after: { amount: created.amount, category: created.category, projectId: body.projectId }, ipAddress: ctx.ip,
  });
  return ok({ expense: created }, 201);
}, { permission: "client.manage", rateLimit: { limit: 120, windowMs: 60_000 } });
