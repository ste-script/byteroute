import type { Request, Response } from "express";
import { UserModel } from "@byteroute/shared";
import { signAuthToken } from "../auth/passport.js";
import { hashPassword, verifyPassword } from "../services/password.js";
import { signInRequestSchema, signUpRequestSchema } from "../types/auth.js";
import { AUTH_COOKIE_NAME } from "../utils/cookie.js";
import { CSRF_COOKIE_NAME, generateCsrfToken } from "../utils/csrf.js";
import { normalizeTenantIds } from "../utils/tenant.js";

const cookieIsSecure =
  process.env.AUTH_COOKIE_SECURE === "true" ||
  (process.env.AUTH_COOKIE_SECURE !== "false" && process.env.NODE_ENV === "production");

function setAuthCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: cookieIsSecure,
    sameSite: "lax",
    path: "/",
  });
}

function clearAuthCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: cookieIsSecure,
    sameSite: "lax",
    path: "/",
  });
}

function setCsrfCookie(res: Response, token: string): void {
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    secure: cookieIsSecure,
    sameSite: "lax",
    path: "/",
  });
}

function clearCsrfCookie(res: Response): void {
  res.clearCookie(CSRF_COOKIE_NAME, {
    httpOnly: false,
    secure: cookieIsSecure,
    sameSite: "lax",
    path: "/",
  });
}

function createOwnedTenantId(userId: string): string {
  return `tenant-${userId.slice(-8)}`;
}

export async function signUp(req: Request, res: Response): Promise<void> {
  const parsed = signUpRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request: name, email and password (min 8 chars) are required" });
    return;
  }

  const { email, name, password } = parsed.data;

  const existing = await UserModel.findOne({ email }).lean();
  if (existing) {
    res.status(409).json({ error: "User already exists" });
    return;
  }

  const created = await UserModel.create({
    email,
    name,
    passwordHash: await hashPassword(password),
    tenantIds: [],
  });

  const ownedTenantId = createOwnedTenantId(String(created._id));
  created.tenantIds = [ownedTenantId];
  await created.save();

  const token = signAuthToken({
    sub: String(created._id),
    email: created.email,
    name: created.name,
    tenantIds: [ownedTenantId],
  });

  setAuthCookie(res, token);
  const csrfToken = generateCsrfToken();
  setCsrfCookie(res, csrfToken);

  res.status(201).json({
    csrfToken,
    user: {
      id: String(created._id),
      email: created.email,
      name: created.name,
      tenantIds: [ownedTenantId],
    },
  });
}

export async function signIn(req: Request, res: Response): Promise<void> {
  const parsed = signInRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request: email and password are required" });
    return;
  }

  const { email, password } = parsed.data;

  const user = await UserModel.findOne({ email }).select("+passwordHash");
  if (!user || typeof user.passwordHash !== "string" || ! await verifyPassword(password, user.passwordHash)) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const ownedTenantIds = normalizeTenantIds(user.tenantIds);
  if (ownedTenantIds.length === 0) {
    const fallbackTenantId = createOwnedTenantId(String(user._id));
    user.tenantIds = [fallbackTenantId];
    await user.save();
  }

  const tenantIds = normalizeTenantIds(user.tenantIds);

  const token = signAuthToken({
    sub: String(user._id),
    email: user.email,
    name: user.name,
    tenantIds,
  });

  setAuthCookie(res, token);
  const csrfToken = generateCsrfToken();
  setCsrfCookie(res, csrfToken);

  res.status(200).json({
    csrfToken,
    user: {
      id: String(user._id),
      email: user.email,
      name: user.name,
      tenantIds,
    },
  });
}

export function signOut(_req: Request, res: Response): void {
  clearAuthCookie(res);
  clearCsrfCookie(res);
  res.status(204).send();
}

export function getCurrentUser(req: Request, res: Response): void {
  const principal = req.user as
    | { id: string; email: string; name?: string; tenantIds?: string[] }
    | undefined;

  if (!principal) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const csrfToken = generateCsrfToken();
  setCsrfCookie(res, csrfToken);

  res.status(200).json({
    csrfToken,
    user: {
      id: principal.id,
      email: principal.email,
      name: principal.name,
      tenantIds: principal.tenantIds ?? [],
    },
  });
}
