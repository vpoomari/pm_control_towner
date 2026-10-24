// PM CONTROL TOWER — Daily Log detail API (Command Center v3.0)
// DELETE /api/daily-logs/[id]

import { db } from "@/lib/db";
import { withApi, ok, ApiError } from "@/lib/api";
import { writeAudit } from "@/lib/audit";

export const DELETE = withApi(async (ctx) => {
  const session = ctx.session!;
  const { id } = ctx.params;
  const existing = await db.dailyLog.findUnique({ where: { id }, select: { id: true, projectId: true } });
  if (!existing) throw new ApiError(404, "Daily log not found");
  await db.dailyLog.delete({ where: { id } });
  await writeAudit({
    userId: session.id, userName: session.name, role: session.roles[0],
    action: "DELETE", entityType: "DailyLog", entityId: id, ipAddress: ctx.ip,
  });
  return ok({ deleted: true });
}, { permission: "field.manage", rateLimit: { limit: 120, windowMs: 60_000 } });
