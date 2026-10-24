// PM CONTROL TOWER — Schedule What-If Analysis API
// POST /api/projects/[id]/whatif {taskId, deltaDays} — run CPM with the modified task
//                                                      and return the computed finish delta.
// GET  /api/projects/[id]/whatif — list saved scenarios

import { z } from "zod";
import { db } from "@/lib/db";
import { withApi, ok, ApiError, parseBody } from "@/lib/api";
import { computeCPM } from "@/lib/engines/cpm";
import { writeAudit } from "@/lib/audit";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const scenarios = await db.scheduleScenario.findMany({ where: { projectId: id }, orderBy: { createdAt: "desc" }, take: 20 });
  return ok({ scenarios });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json() as { taskId?: string; deltaDays?: number };
  const project = await db.project.findUnique({ where: { id }, select: { code: true, name: true } });
  if (!project) throw new Error("Project not found");
  const tasks = await db.task.findMany({ where: { projectId: id }, select: { id: true, name: true, durationDays: true, isSummary: true, startDate: true } });
  const deps = await db.dependency.findMany({ where: { projectId: id }, select: { predecessorId: true, successorId: true, depType: true, lagDays: true } });
  if (!tasks.length) return ok({ error: "No tasks in this project" });

  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const cpmInput = tasks.map((t) => ({ id: t.id, durationDays: t.durationDays, isSummary: t.isSummary }));
  const depInput = deps.map((d) => ({ predecessorId: d.predecessorId, successorId: d.successorId, depType: d.depType, lagDays: d.lagDays }));
  const base = computeCPM(cpmInput, depInput, tasks[0]?.startDate ?? null);
  const baseFinish = Math.max(0, ...[...base.values()].map((r) => r.ef));

  // Apply delta
  const delta = body.deltaDays ?? 5;
  const target = body.taskId ? taskMap.get(body.taskId) : null;
  const modified = target ? cpmInput.map((t) => (t.id === target.id ? { ...t, durationDays: Math.max(1, t.durationDays + delta) } : t)) : cpmInput;
  const mod = computeCPM(modified, depInput, tasks[0]?.startDate ?? null);
  const modFinish = Math.max(0, ...[...mod.values()].map((r) => r.ef));

  // Save
  const scenario = await db.scheduleScenario.create({
    data: {
      projectId: id, name: `${target ? target.name : "All"} ${delta >= 0 ? "+" : ""}${delta}d`,
      deltasJson: JSON.stringify({ taskId: body.taskId, deltaDays: delta }),
      baseFinish, scenarioFinish: modFinish,
    },
  });
  return ok({
    scenarioId: scenario.id, baseFinish, scenarioFinish: modFinish,
    finishDeltaDays: modFinish - baseFinish,
    affectedTask: target?.name ?? "none",
  });
}
