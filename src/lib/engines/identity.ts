// PM CONTROL TOWER — Identity & Access engine (pure): TOTP (RFC 6238), IdP group→role
// mapping, SCIM user transform. No DB access. All cryptographic primitives from node:crypto.

import { createHmac, randomBytes, createHash } from "crypto";

// ---- TOTP (RFC 6238, SHA-1, 6 digits, 30s step, ±1 window) ----
export function generateTotpSecret(bytes = 20): string {
  return base32Encode(randomBytes(bytes));
}

function base32Encode(buf: Buffer): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0, value = 0, out = "";
  for (const b of buf) { value = (value << 8) | b; bits += 8; while (bits >= 5) { out += alphabet[(value >>> (bits - 5)) & 31]; bits -= 5; } }
  if (bits > 0) out += alphabet[(value << (5 - bits)) & 31];
  return out;
}

function base32Decode(s: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0, value = 0; const out: number[] = [];
  for (const c of s.toUpperCase().replace(/=+$/, "")) {
    const idx = alphabet.indexOf(c);
    if (idx < 0) continue;
    value = (value << 5) | idx; bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(out);
}

export function totpCode(secret: string, timeStep: number): string {
  return totpAt(secret, timeStep);
}

function totpAt(secret: string, timeStep: number): string {
  const key = base32Decode(secret);
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(timeStep));
  const hmac = createHmac("sha1", key).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = ((hmac[offset] & 0x7f) << 24) | (hmac[offset + 1] << 16) | (hmac[offset + 2] << 8) | hmac[offset + 3];
  return String(code % 1_000_000).padStart(6, "0");
}

export function verifyTotp(secret: string, token: string, nowMs: number = Date.now(), window = 1): boolean {
  const step = Math.floor(nowMs / 30_000);
  const clean = token.replace(/\s/g, "");
  for (let w = -window; w <= window; w++) {
    if (totpAt(secret, step + w) === clean) return true;
  }
  return false;
}

export function otpauthUrl(secret: string, label: string, issuer: string): string {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(label)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

// ---- IdP group → role mapping ----
export interface GroupRoleMapping { idpGroup: string; roleCode: string }
export interface SsoIdentity { groups: string[]; email: string; name: string; subject: string }

export interface MappedIdentity { email: string; name: string; roleCodes: string[]; unmatchedGroups: string[] }

/** Deterministic: IdP groups + mapping rules -> PMCT role codes. First matching mapping per group wins. */
export function mapGroupsToRoles(identity: SsoIdentity, mappings: GroupRoleMapping[]): MappedIdentity {
  const roleCodes = new Set<string>();
  const unmatchedGroups: string[] = [];
  for (const g of identity.groups) {
    const m = mappings.find((mp) => mp.idpGroup.toLowerCase() === g.toLowerCase());
    if (m) roleCodes.add(m.roleCode);
    else unmatchedGroups.push(g);
  }
  return { email: identity.email.toLowerCase(), name: identity.name, roleCodes: [...roleCodes], unmatchedGroups };
}

// ---- SCIM 2.0 transform ----
export interface ScimUser {
  userName: string;
  name?: { givenName?: string; familyName?: string };
  emails?: { value: string; primary?: boolean }[];
  active: boolean;
  groups?: { value: string }[];
  externalId?: string;
}

export function scimToIdentity(scim: ScimUser): SsoIdentity & { active: boolean } {
  const primary = scim.emails?.find((e) => e.primary) ?? scim.emails?.[0];
  return {
    email: primary?.value ?? scim.userName,
    name: [scim.name?.givenName, scim.name?.familyName].filter(Boolean).join(" ") || scim.userName,
    groups: (scim.groups ?? []).map((g) => g.value),
    subject: scim.externalId ?? scim.userName,
    active: scim.active !== false,
  };
}

// ---- Misc identity helpers ----
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateScimToken(): string {
  return "scim_" + randomBytes(24).toString("hex");
}
