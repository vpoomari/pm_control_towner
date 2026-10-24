// PM CONTROL TOWER — Universal PowerPoint export API (Command Center v3.1).
// POST /api/export/ppt { view, projectId? } → .pptx binary.
// Server-side generation: the browser dashboard and the desktop application call
// this same endpoint, so both platforms produce identical output.

import { NextResponse } from "next/server";
import { z } from "zod";
import { withApi, ok, ApiError, parseBody } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { PPT_VIEWS } from "@/lib/pptx/registry";
import { buildDeck } from "@/lib/engines/pptx-views";

const bodySchema = z.object({
  view: z.string().min(1).max(60),
  projectId: z.string().max(64).optional().nullable(),
});

export const POST = withApi(async (ctx) => {
  const session = ctx.session!;
  const body = await parseBody(ctx.req, bodySchema);

  const def = PPT_VIEWS[body.view];
  if (!def) throw new ApiError(400, `Unknown export view: ${body.view}`);
  if (def.projectScoped && !body.projectId) {
    throw new ApiError(400, `View "${def.label}" requires a project — pick one in the header first.`);
  }
  if (body.projectId) {
    const project = await (await import("@/lib/db")).db.project.findUnique({
      where: { id: body.projectId },
      select: { id: true },
    });
    if (!project) throw new ApiError(404, "Project not found");
  }

  const { buffer, label, projectCode } = await buildDeck(body.view, body.projectId ?? null);

  const stamp = new Date().toISOString().slice(0, 10);
  const safeName = `PMCT-${label}${projectCode ? `-${projectCode}` : ""}-${stamp}.pptx`.replace(/[^A-Za-z0-9._-]/g, "_");

  await writeAudit({
    userId: session.id, userName: session.name, role: session.roles[0],
    action: "EXPORT", entityType: "PptExport", entityId: body.view, entityName: def.label,
    after: { view: body.view, projectId: body.projectId ?? null, bytes: buffer.length },
    ipAddress: ctx.ip,
  });

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="${safeName}"`,
      "Content-Length": String(buffer.length),
      "Cache-Control": "no-store",
    },
  });
}, { permission: ["reports.view", "project.view"], rateLimit: { limit: 20, windowMs: 60_000 } });
