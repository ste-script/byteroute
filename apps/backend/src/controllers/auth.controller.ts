/*

 * Copyright 2026 Stefano Babini
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @module backend/controllers/auth.controller
 */

import type { Request, Response } from "express";
import * as shared from "@byteroute/shared";
import type { AppContext } from "../config/composition-root.js";
import { UserModel as InfraUserModel } from "../infrastructure/persistence/models/user.model.js";
import { signAuthToken, signAuthTokenWithTtl } from "../auth/passport.js";
import { getPrincipal } from "../auth/principal.js";
import { hashPassword, verifyPassword } from "../services/password.js";
import { AuthService } from "../services/auth.service.js";
import {
  signInRequestSchema,
  signUpRequestSchema,
} from "../domain/identity/types.js";
import { normalizeTenantIds, sanitizeTenantId } from "../utils/tenant.js";
import {
  clearAuthCookie,
  clearCsrfCookie,
  setAuthCookie,
  setCsrfCookie,
} from "../utils/cookie.js";
import { generateCsrfToken } from "../utils/csrf.js";

const UserModel =
  (shared as { UserModel?: typeof InfraUserModel }).UserModel ?? InfraUserModel;

/**
 * Creates auth controller.
 * @param ctx - The ctx input.
 */

export function createAuthController(ctx: AppContext) {
  const authService = new AuthService(
    ctx.userRepository,
    ctx.tenantRepository,
    ctx.passwordService,
    ctx.jwt,
  );

  return {
    signUp: async (req: Request, res: Response): Promise<void> => {
      const parsed = signUpRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error:
            "Invalid request: name, email and password (min 8 chars) are required",
        });
        return;
      }

      const result = await authService.signUp(parsed.data);
      if (!result) {
        res.status(409).json({ error: "User already exists" });
        return;
      }

      setAuthCookie(res, result.token);
      setCsrfCookie(res, generateCsrfToken());
      res.status(201).json(result);
    },

    signIn: async (req: Request, res: Response): Promise<void> => {
      const parsed = signInRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        res
          .status(400)
          .json({ error: "Invalid request: email and password are required" });
        return;
      }

      const result = await authService.signIn(parsed.data);
      if (!result) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }

      setAuthCookie(res, result.token);
      setCsrfCookie(res, generateCsrfToken());
      res.status(200).json(result);
    },

    signOut: (_req: Request, res: Response): void => {
      clearAuthCookie(res);
      clearCsrfCookie(res);
      res.status(204).send();
    },

    currentUser: (req: Request, res: Response): void => {
      const principal = req.user as
        | {
            id: string;
            email: string;
            name?: string;
            tenantIds: string[];
          }
        | undefined;

      if (!principal) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      res.status(200).json({
        user: {
          id: principal.id,
          email: principal.email,
          name: principal.name,
          tenantIds: principal.tenantIds ?? [],
        },
      });
    },

    clientToken: async (req: Request, res: Response): Promise<void> => {
      const principal = req.user as
        | {
            id: string;
            email: string;
            name?: string;
            tenantIds: string[];
            scopes: string[];
          }
        | undefined;

      if (!principal) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const requestedTenantId = sanitizeTenantId(
        (req.body as { tenantId?: unknown } | undefined)?.tenantId,
      );
      const result = await authService.createClientToken(
        principal,
        requestedTenantId,
      );
      if (!result) {
        res.status(403).json({
          error: requestedTenantId
            ? "Forbidden: no access to tenant"
            : "Forbidden: no authorized tenants",
        });
        return;
      }

      res.status(200).json(result);
    },
  };
}

/**
 * Signs up.
 * @param req - The req input.
 * @param res - The res input.
 */

export async function signUp(req: Request, res: Response): Promise<void> {
  const parsed = signUpRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error:
        "Invalid request: name, email and password (min 8 chars) are required",
    });
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
  setCsrfCookie(res, generateCsrfToken());
  res.status(201).json({
    token,
    user: {
      id: String(created._id),
      email: created.email,
      name: created.name,
      tenantIds: [],
    },
  });
}

/**
 * Signs in.
 * @param req - The req input.
 * @param res - The res input.
 */

export async function signIn(req: Request, res: Response): Promise<void> {
  const parsed = signInRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "Invalid request: email and password are required" });
    return;
  }

  const { email, password } = parsed.data;

  const user = await UserModel.findOne({ email }).select("+passwordHash");
  if (
    !user ||
    typeof user.passwordHash !== "string" ||
    !(await verifyPassword(password, user.passwordHash))
  ) {
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
  setCsrfCookie(res, generateCsrfToken());
  res.status(200).json({
    token,
    user: {
      id: String(user._id),
      email: user.email,
      name: user.name,
      tenantIds,
    },
  });
}

/**
 * Signs out.
 * @param _req - The req input.
 * @param res - The res input.
 */

export function signOut(_req: Request, res: Response): void {
  clearAuthCookie(res);
  clearCsrfCookie(res);
  res.status(204).send();
}

/**
 * Gets current user.
 * @param req - The req input.
 * @param res - The res input.
 */

export function getCurrentUser(req: Request, res: Response): void {
  const principal = getPrincipal(req);

  if (!principal) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  res.status(200).json({
    user: {
      id: principal.id,
      email: principal.email,
      name: principal.name,
      tenantIds: principal.tenantIds ?? [],
    },
  });
}

/**
 * Creates client token.
 * @param req - The req input.
 * @param res - The res input.
 */

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

  const requestedTenantId = sanitizeTenantId(
    (req.body as { tenantId?: unknown } | undefined)?.tenantId,
  );
  if (requestedTenantId && !tenantIds.includes(requestedTenantId)) {
    res.status(403).json({ error: "Forbidden: no access to tenant" });
    return;
  }

  const orderedTenantIds = requestedTenantId
    ? [
        requestedTenantId,
        ...tenantIds.filter((tenantId) => tenantId !== requestedTenantId),
      ]
    : tenantIds;

  const ttl = process.env.AUTH_CLIENT_TOKEN_TTL ?? "12h";
  const token = signAuthTokenWithTtl(
    {
      sub: principal.id,
      email: principal.email,
      name: principal.name,
      tenantId: orderedTenantIds[0],
      tenantIds: orderedTenantIds,
    },
    ttl,
  );

  res.status(200).json({ token, expiresIn: ttl });
}
