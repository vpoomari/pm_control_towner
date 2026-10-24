// PM CONTROL TOWER — Docs & Knowledge API (Command Center v3.0 — Notion/Coda analog)
// GET  /api/docs?space&q — doc index (list without full content for speed)
// POST /api/docs — create page

import { z } from "zod";
import { db } from "@/lib/db";
import { withApi, ok, ApiError, parseBody } from "@/lib/api";
import { writeAudit } from "@/lib/audit";

const DOC_SPACES = ["GENERAL", "ENGINEERING", "CONSTRUCTION", "FINANCE", "PRODUCT", "GOVERNANCE"] as const;

export const GET = withApi(async (ctx) => {
  const space = ctx.searchParams.get("space")?.trim();
  const q = ctx.searchParams.get("q")?.trim();

  const pages = await db.docPage.findMany({
    where: {
      ...(space && DOC_SPACES.includes(space as (typeof DOC_SPACES)[number]) ? { space } : {}),
      ...(q ? { OR: [{ title: { contains: q } }, { content: { contains: q } }] } : {}),
    },
    select: {
      id: true, title: true, icon: true, space: true, tags: true, parentId: true, projectId: true,
      authorName: true, isPublished: true, orderIndex: true, updatedAt: true,
      content: true, // include content for search snippets; views truncate
    },
    orderBy: [{ space: "asc" }, { orderIndex: "asc" }, { updatedAt: "desc" }],
    take: 300,
  });
  return ok({
    pages: pages.map((p) => ({ ...p, excerpt: (p.content || "").slice(0, 180) })),
    spaces: DOC_SPACES,
    summary: { total: pages.length, spaces: [...new Set(pages.map((p) => p.space))] },
  });
}, { permission: "inbox.use", rateLimit: { limit: 300, windowMs: 60_000 } });

const createSchema = z.object({
  title: z.string().min(1).max(200),
  icon: z.string().max(8).default("📄"),
  content: z.string().max(200_000).default(""),
  space: z.enum(DOC_SPACES).default("GENERAL"),
  tags: z.string().max(400).optional().nullable(),
  parentId: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
  isPublished: z.coerce.boolean().default(true),
  orderIndex: z.coerce.number().int().default(0),
});

export const POST = withApi(async (ctx) => {
  const session = ctx.session!;
  const body = await parseBody(ctx.req, createSchema);
  const created = await db.docPage.create({
    data: { ...body, authorId: session.id, authorName: session.name },
  });
  await writeAudit({
    userId: session.id, userName: session.name, role: session.roles[0],
    action: "CREATE", entityType: "DocPage", entityId: created.id, entityName: created.title,
    after: { space: created.space }, ipAddress: ctx.ip,
  });
  return ok({ page: created }, 201);
}, { permission: "docs.use", rateLimit: { limit: 120, windowMs: 60_000 } });
