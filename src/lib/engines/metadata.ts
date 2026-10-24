// PM CONTROL TOWER — Admin metadata engine (pure): naming conventions, numbering tokens,
// field validation. No eval, no arbitrary code — deterministic transforms only.

export type NameStyle = "snake_case" | "camelCase" | "PascalCase" | "UPPER_SNAKE";

export function toWords(input: string): string[] {
  return input.replace(/([a-z0-9])([A-Z])/g, "$1 $2").split(/[^a-zA-Z0-9]+/).filter(Boolean).map((w) => w.toLowerCase());
}

export function applyNameStyle(input: string, style: NameStyle): string {
  const words = toWords(input);
  switch (style) {
    case "snake_case": return words.join("_");
    case "UPPER_SNAKE": return words.join("_").toUpperCase();
    case "PascalCase": return words.map((w) => w[0].toUpperCase() + w.slice(1)).join("");
    case "camelCase": return words.map((w, i) => (i === 0 ? w : w[0].toUpperCase() + w.slice(1))).join("");
  }
}

export interface NamingRule { style: NameStyle; prefix?: string; suffix?: string }

/** display label -> internal api name per convention (prefix/suffix applied outside the styled core). */
export function deriveInternalName(displayLabel: string, rule: NamingRule): string {
  const core = applyNameStyle(displayLabel, rule.style);
  return (rule.prefix ?? "") + core + (rule.suffix ?? "");
}

/** Numbering: tokens {PREFIX} {YEAR} {MONTH} {SEQ} — concurrency-safe sequence passed in. */
export function expandNumbering(pattern: string, parts: { prefix?: string; year?: number; month?: number; seq: number; pad?: number }): string {
  const pad = parts.pad ?? 5;
  return pattern
    .replace(/\{PREFIX\}/g, parts.prefix ?? "")
    .replace(/\{YEAR\}/g, String(parts.year ?? new Date().getFullYear()))
    .replace(/\{MONTH\}/g, String(parts.month ?? new Date().getMonth() + 1).padStart(2, "0"))
    .replace(/\{SEQ\}/g, String(parts.seq).padStart(pad, "0"));
}

// ---- Field validation (backend enforcement of metadata) ----
export interface FieldDefLike { internalName: string; displayLabel: string; baseType: string; required: boolean; optionsJson?: string | null }
export interface FieldValueResult { ok: boolean; errors: { field: string; message: string }[]; normalized: Record<string, unknown> }

export function validateFieldValues(defs: FieldDefLike[], values: Record<string, unknown>): FieldValueResult {
  const errors: FieldValueResult["errors"] = [];
  const normalized: Record<string, unknown> = {};
  for (const def of defs) {
    const v = values[def.internalName];
    const empty = v === undefined || v === null || v === "";
    if (empty) {
      if (def.required) errors.push({ field: def.internalName, message: `${def.displayLabel} is required` });
      continue;
    }
    switch (def.baseType) {
      case "NUMBER": case "CURRENCY": case "PERCENT": case "SCORE": case "RATING": {
        const n = Number(v);
        if (!Number.isFinite(n)) errors.push({ field: def.internalName, message: `${def.displayLabel} must be a number` });
        else normalized[def.internalName] = n;
        break;
      }
      case "BOOLEAN": normalized[def.internalName] = v === true || v === "true"; break;
      case "DATE": {
        const d = new Date(String(v));
        if (Number.isNaN(d.getTime())) errors.push({ field: def.internalName, message: `${def.displayLabel} must be a valid date` });
        else normalized[def.internalName] = d.toISOString();
        break;
      }
      case "SELECT": case "RAG": {
        const options = def.optionsJson ? (JSON.parse(def.optionsJson) as string[]) : [];
        const str = String(v);
        if (options.length && !options.includes(str)) errors.push({ field: def.internalName, message: `${def.displayLabel} must be one of: ${options.join(", ")}` });
        else normalized[def.internalName] = str;
        break;
      }
      case "MULTI_SELECT": {
        const options = def.optionsJson ? (JSON.parse(def.optionsJson) as string[]) : [];
        const arr = Array.isArray(v) ? v.map(String) : String(v).split(",");
        const bad = arr.filter((x) => options.length && !options.includes(x));
        if (bad.length) errors.push({ field: def.internalName, message: `Invalid option(s): ${bad.join(", ")}` });
        else normalized[def.internalName] = arr;
        break;
      }
      case "NUMBER_SCORE_100": case "SCORE_RANGE": {
        const n = Number(v);
        if (!Number.isFinite(n) || n < 0 || n > 100) errors.push({ field: def.internalName, message: `${def.displayLabel} must be 0-100` });
        else normalized[def.internalName] = n;
        break;
      }
      default: normalized[def.internalName] = String(v).slice(0, 5000);
    }
  }
  return { ok: errors.length === 0, errors, normalized };
}

// ---- Safe formula evaluation: numbers, field refs, + - * / ( ) only. No eval. ----
export function evaluateFormula(expr: string, fields: Record<string, number>): { ok: boolean; value: number | null; error?: string } {
  const sanitized = expr.replace(/\{([a-zA-Z0-9_]+)\}/g, (_m, name) => {
    const val = fields[name];
    return val === undefined || !Number.isFinite(val) ? "NaN" : String(val);
  });
  if (/[^0-9+\-*/().\sNaN]/.test(sanitized)) return { ok: false, value: null, error: "Formula contains invalid characters or unknown field references" };
  try {
    // eslint-disable-next-line no-new-func
    const val = Function('"use strict"; return (' + sanitized + ")")() as number;
    if (typeof val !== "number" || !Number.isFinite(val)) return { ok: false, value: null, error: "Formula result is not a finite number" };
    return { ok: true, value: Math.round(val * 100) / 100 };
  } catch {
    return { ok: false, value: null, error: "Formula is not a valid arithmetic expression" };
  }
}
