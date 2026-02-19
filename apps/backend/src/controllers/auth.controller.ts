import type { Request, Response } from "express";
import { UserModel } from "@byteroute/shared";
import { signAuthToken, signAuthTokenWithTtl } from "../auth/passport.js";
import { getPrincipal } from "../auth/principal.js";
import { hashPassword, verifyPassword } from "../services/password.js";
import { signInRequestSchema, signUpRequestSchema } from "../types/auth.js";
import {
  setAuthCookie,
  clearAuthCookie,
  setCsrfCookie,
  clearCsrfCookie,
} from "../utils/cookie.js";
import { generateCsrfToken } from "../utils/csrf.js";
import { normalizeTenantIds } from "../utils/tenant.js";

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

  const token = signAuthToken({
    sub: String(created._id),
    email: created.email,
    name: created.name,
    tenantIds: [],
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
      tenantIds: [],
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
  const principal = getPrincipal(req);

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

export function createClientToken(req: Request, res: Response): void {
  const principal = getPrincipal(req);

  if (!principal) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const tenantIds = normalizeTenantIds(principal.tenantIds);
  if (tenantIds.length === 0) {
    res.status(403).json({ error: "Forbidden: no authorized tenants" });
    return;
  }

  const ttl = process.env.AUTH_CLIENT_TOKEN_TTL ?? "12h";
  const token = signAuthTokenWithTtl(
    {
      sub: principal.id,
      email: principal.email,
      name: principal.name,
      tenantIds,
    },
    ttl
  );

  res.status(200).json({ token, expiresIn: ttl });
}
