// PM CONTROL TOWER — Admin Control Center API (metadata-driven configuration)
// GET   /api/admin                          — full configuration state
// POST  /api/admin  {action:...}            — mutations (all audited, admin.config gated)
// PATCH /api/admin  {action:...}            — updates

import { z } from "zod";
import { db } from "@/lib/db";
import { withApi, ok, ApiError, parseBody } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { deriveInternalName, validateFieldValues, type NamingRule } from "@/lib/engines/metadata";

const BASE_TYPES = ["TEXT", "LONG_TEXT", "NUMBER", "CURRENCY", "PERCENT", "DATE", "BOOLEAN", "SELECT", "MULTI_SELECT", "RAG", "SCORE", "RATING", "USER", "FORMULA"];

async function ensureDefaults() {
  let settings = await db.adminSettings.findUnique({ where: { id: "singleton" } });
  if (!settings) settings = await db.adminSettings.create({ data: { id: "singleton" } });
  let naming = await db.namingConvention.findUnique({ where: { scope: "fields" } });
  if (!naming) {
    for (const n of [
      { scope: "fields", style: "snake_case", prefix: "", suffix: "" },
      { scope: "entities", style: "PascalCase", prefix: "", suffix: "" },
      { scope: "projectCode", style: "UPPER_SNAKE", prefix: "PRJ", includeYear: true, seqPad: 5 },
      { scope: "riskCode", style: "UPPER_SNAKE", prefix: "RSK", includeYear: true, seqPad: 5 },
      { scope: "issueCode", style: "UPPER_SNAKE", prefix: "ISS", includeYear: true, seqPad: 5 },
    ]) await db.namingConvention.upsert({ where: { scope: n.scope }, create: n as never, update: {} });
  }
  const termCount = await db.terminology.count();
  if (termCount === 0) {
    for (const t of [
      { termKey: "project", defaultTerm: "Project", pluralName: "Projects" },
      { termKey: "portfolio", defaultTerm: "Portfolio", pluralName: "Portfolios" },
      { termKey: "program", defaultTerm: "Program", pluralName: "Programs" },
      { termKey: "risk", defaultTerm: "Risk", pluralName: "Risks" },
      { termKey: "issue", defaultTerm: "Issue", pluralName: "Issues" },
      { termKey: "milestone", defaultTerm: "Milestone", pluralName: "Milestones" },
      { termKey: "task", defaultTerm: "Task", pluralName: "Tasks" },
      { termKey: "resource", defaultTerm: "Resource", pluralName: "Resources" },
      { termKey: "businessCase", defaultTerm: "Business Case", pluralName: "Business Cases" },
    ]) await db.terminology.create({ data: t });
  }
  const flagCount = await db.featureFlag.count();
  if (flagCount === 0) {
    for (const f of [
      { key: "advanced_evm", enabled: true },
      { key: "ai_insights", enabled: true },
      { key: "sap_connector", enabled: false },
      { key: "learning_assistant", enabled: true },
    ]) await db.featureFlag.create({ data: f });
  }
  return { settings, naming };
}

export const GET = withApi(async () => {
  await ensureDefaults();
  const [entities, fields, fieldTypes, terminology, naming, flags, settings] = await Promise.all([
    db.entityDefinition.findMany({ orderBy: { entityKey: "asc" } }),
    db.fieldDefinition.findMany({ orderBy: [{ entityKey: "asc" }, { displayOrder: "asc" }] }),
    db.customFieldType.findMany({ orderBy: { name: "asc" } }),
    db.terminology.findMany({ orderBy: { termKey: "asc" } }),
    db.namingConvention.findMany({ orderBy: { scope: "asc" } }),
    db.featureFlag.findMany({ orderBy: { key: "asc" } }),
    db.adminSettings.findUnique({ where: { id: "singleton" } }),
  ]);
  return ok({ entities, fields, fieldTypes, terminology, naming, flags, settings });
}, { permission: "admin.config", rateLimit: { limit: 240, windowMs: 60_000 } });

const postSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("addField"), entityKey: z.string(), displayLabel: z.string().min(2),
    baseType: z.enum(BASE_TYPES as [string, ...string[]]), customTypeId: z.string().optional().nullable(),
    required: z.boolean().default(false), defaultValue: z.string().optional().nullable(),
    helpText: z.string().optional().nullable(), sensitive: z.boolean().default(false),
    options: z.array(z.string()).optional(), formula: z.string().optional().nullable(),
    namingStyle: z.enum(["snake_case", "camelCase", "PascalCase", "UPPER_SNAKE"]).optional(),
    namingPrefix: z.string().optional(),
  }),
  z.object({ action: z.literal("updateField"), id: z.string(), displayLabel: z.string().min(2).optional(), required: z.boolean().optional(), helpText: z.string().optional().nullable(), status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional() }),
  z.object({ action: z.literal("createFieldType"), name: z.string().min(2), baseType: z.enum(BASE_TYPES as [string, ...string[]]), options: z.array(z.string()).optional(), display: z.string().default("INPUT"), required: z.boolean().default(false) }),
  z.object({ action: z.literal("terminology"), termKey: z.string(), customTerm: z.string().optional().nullable(), pluralName: z.string().optional().nullable(), active: z.boolean().optional() }),
  z.object({ action: z.literal("naming"), scope: z.string(), style: z.string(), prefix: z.string().default(""), suffix: z.string().default(""), includeYear: z.boolean().optional(), seqPad: z.number().int().optional() }),
  z.object({ action: z.literal("flag"), key: z.string(), enabled: z.boolean() }),
  z.object({ action: z.literal("settings"), orgName: z.string().optional(), confidentialityLabel: z.string().optional(), currency: z.string().optional(), dateFormat: z.string().optional() }),
  z.object({ action: z.literal("validateProjectFields"), values: z.record(z.string(), z.unknown()) }),
]);

export const POST = withApi(async (ctx) => {
  const session = ctx.session!;
  const body = await parseBody(ctx.req, postSchema);
  const audit = (action: string, entity: string, entityId: string, name: string, after: unknown) =>
    writeAudit({ userId: session.id, userName: session.name, action, entityType: "AdminConfig:" + entity, entityId, entityName: name, after, severity: "WARNING" });

  switch (body.action) {
    case "addField": {
      const naming = await db.namingConvention.findUnique({ where: { scope: "fields" } });
      const rule: NamingRule = { style: (body.namingStyle ?? naming?.style ?? "snake_case") as NamingRule["style"], prefix: body.namingPrefix ?? naming?.prefix ?? "" };
      const internalName = deriveInternalName(body.displayLabel, rule);
      const dup = await db.fieldDefinition.findUnique({ where: { entityKey_internalName: { entityKey: body.entityKey, internalName } } });
      if (dup) throw new ApiError(409, `Field ${internalName} already exists on this entity`);
      const optionsJson = body.options ? JSON.stringify(body.options) : body.formula ? JSON.stringify({ formula: body.formula }) : null;
      const field = await db.fieldDefinition.create({
        data: { entityKey: body.entityKey, internalName, displayLabel: body.displayLabel, baseType: body.baseType, customTypeId: body.customTypeId ?? null, required: body.required, defaultValue: body.defaultValue ?? null, helpText: body.helpText ?? null, sensitive: body.sensitive, optionsJson, createdBy: session.id },
      });
      await audit("CREATE", "FieldDefinition", field.id, internalName, { entityKey: body.entityKey, baseType: body.baseType, required: body.required });
      return ok({ field }, 201);
    }
    case "updateField": {
      const before = await db.fieldDefinition.findUnique({ where: { id: body.id } });
      if (!before) throw new ApiError(404, "Field not found");
      const field = await db.fieldDefinition.update({
        where: { id: body.id },
        data: { ...(body.displayLabel ? { displayLabel: body.displayLabel } : {}), ...(body.required !== undefined ? { required: body.required } : {}), ...(body.helpText !== undefined ? { helpText: body.helpText } : {}), ...(body.status ? { status: body.status } : {}) },
      });
      await audit("UPDATE", "FieldDefinition", field.id, field.internalName, { status: field.status });
      return ok({ field });
    }
    case "createFieldType": {
      const ft = await db.customFieldType.create({
        data: { name: body.name, baseType: body.baseType, optionsJson: body.options ? JSON.stringify(body.options) : null, display: body.display, required: body.required, createdBy: session.id },
      });
      await audit("CREATE", "CustomFieldType", ft.id, ft.name, { baseType: ft.baseType, options: body.options });
      return ok({ fieldType: ft }, 201);
    }
    case "terminology": {
      const term = await db.terminology.upsert({
        where: { termKey: body.termKey },
        create: { termKey: body.termKey, defaultTerm: body.termKey, customTerm: body.customTerm ?? null, pluralName: body.pluralName ?? null, active: body.active ?? true },
        update: { ...(body.customTerm !== undefined ? { customTerm: body.customTerm } : {}), ...(body.pluralName !== undefined ? { pluralName: body.pluralName } : {}), ...(body.active !== undefined ? { active: body.active } : {}) },
      });
      await audit("UPDATE", "Terminology", term.id, body.termKey, { customTerm: body.customTerm });
      return ok({ term });
    }
    case "naming": {
      const nc = await db.namingConvention.upsert({ where: { scope: body.scope }, create: { scope: body.scope, style: body.style, prefix: body.prefix, suffix: body.suffix, includeYear: body.includeYear ?? false, seqPad: body.seqPad ?? 5 }, update: { style: body.style, prefix: body.prefix, suffix: body.suffix, includeYear: body.includeYear ?? false, seqPad: body.seqPad ?? 5 } });
      await audit("UPDATE", "NamingConvention", nc.id, body.scope, { style: body.style, prefix: body.prefix });
      return ok({ naming: nc });
    }
    case "flag": {
      const flag = await db.featureFlag.upsert({ where: { key: body.key }, create: { key: body.key, enabled: body.enabled }, update: { enabled: body.enabled } });
      await audit("UPDATE", "FeatureFlag", flag.id, body.key, { enabled: body.enabled });
      return ok({ flag });
    }
    case "settings": {
      await ensureDefaults();
      const settings = await db.adminSettings.update({ where: { id: "singleton" }, data: { ...(body.orgName ? { orgName: body.orgName } : {}), ...(body.confidentialityLabel ? { confidentialityLabel: body.confidentialityLabel } : {}), ...(body.currency ? { currency: body.currency } : {}), ...(body.dateFormat ? { dateFormat: body.dateFormat } : {}) } });
      await audit("UPDATE", "AdminSettings", "singleton", "System settings", body);
      return ok({ settings });
    }
    case "validateProjectFields": {
      const defs = await db.fieldDefinition.findMany({ where: { entityKey: "project", status: "PUBLISHED" } });
      return ok(validateFieldValues(defs.map((d) => ({ internalName: d.internalName, displayLabel: d.displayLabel, baseType: d.baseType, required: d.required, optionsJson: d.optionsJson })), body.values));
    }
  }
}, { permission: "admin.config", rateLimit: { limit: 120, windowMs: 60_000 } });
