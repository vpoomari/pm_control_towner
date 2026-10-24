// PM CONTROL TOWER — MFA (TOTP) setup, verification and login completion
// POST /api/auth/mfa  {action:"setup"}                          → secret + otpauth URL (not yet enabled)
// POST /api/auth/mfa  {action:"enable", token}                  → verify + enable MFA
// POST /api/auth/mfa  {action:"challenge", email, password, token} → full login for MFA users

import { z } from "zod";
import { SignJWT } from "jose";
import { db } from "@/lib/db";
import { withApi, ok, ApiError, parseBody } from "@/lib/api";
import { generateTotpSecret, verifyTotp, otpauthUrl } from "@/lib/engines/identity";
import { writeAudit } from "@/lib/audit";

const secret = () => new TextEncoder().encode(process.env.JWT_SECRET || "pmct-sandbox-dev-secret-change-in-production-0f4a9b");
const ISSUER = process.env.WEB_ORIGIN || "PM Control Tower";

export const POST = withApi(async (ctx) => {
  const body = await parseBody(ctx.req, z.discriminatedUnion("action", [
    z.object({ action: z.literal("setup"), email: z.string().email(), password: z.string() }),
    z.object({ action: z.literal("enable"), email: z.string().email(), password: z.string(), token: z.string().length(6) }),
    z.object({ action: z.literal("challenge"), email: z.string().email(), password: z.string(), token: z.string().length(6) }),
  ]));

  const user = await db.user.findUnique({ where: { email: body.email.toLowerCase() }, include: { userRoles: { include: { role: true } } } });
  if (!user || !user.isActive) throw new ApiError(401, "Invalid credentials");
  const bcrypt = await import("bcryptjs");
  const passwordOk = await bcrypt.compare(body.password, user.passwordHash);
  if (!passwordOk) throw new ApiError(401, "Invalid credentials");

  if (body.action === "setup") {
    if (user.mfaEnabled) throw new ApiError(409, "MFA already enabled for this account");
    const mfaSecret = generateTotpSecret();
    await db.user.update({ where: { id: user.id }, data: { mfaSecret } });
    return ok({ otpauthUrl: otpauthUrl(mfaSecret, user.email, "PM Control Tower"), secret: mfaSecret, note: "Add to your authenticator app, then call enable with the 6-digit code." }, 201);
  }

  if (body.action === "enable") {
    if (!user.mfaSecret) throw new ApiError(400, "Run setup first");
    if (!verifyTotp(user.mfaSecret, body.token)) throw new ApiError(401, "Invalid or expired MFA code");
    await db.user.update({ where: { id: user.id }, data: { mfaEnabled: true } });
    await writeAudit({ userId: user.id, userName: user.name, action: "MFA_ENABLED", entityType: "User", entityId: user.id, entityName: user.email, severity: "NOTICE" });
    return ok({ mfaEnabled: true });
  }

  // challenge: password already validated + TOTP required to mint the session
  if (!user.mfaEnabled || !user.mfaSecret) throw new ApiError(400, "MFA is not enabled for this account");
  if (!verifyTotp(user.mfaSecret, body.token)) {
    await writeAudit({ userId: user.id, userName: user.name, action: "MFA_FAILED", entityType: "User", entityId: user.id, entityName: user.email, severity: "WARNING" });
    throw new ApiError(401, "Invalid or expired MFA code");
  }
  const token = await new SignJWT({ sub: user.id, email: user.email, iss: "pm-control-tower" })
    .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("7d").sign(secret());
  await writeAudit({ userId: user.id, userName: user.name, action: "LOGIN_MFA", entityType: "User", entityId: user.id, entityName: user.email, severity: "NOTICE" });
  return ok({ token, user: { id: user.id, email: user.email, name: user.name } });
}, { rateLimit: { limit: 30, windowMs: 60_000 } });
