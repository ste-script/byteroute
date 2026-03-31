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
 * @module backend/middleware/auth.middleware
 */

import type { NextFunction, Request, Response } from "express";
import passport from "passport";
import type { AppContext } from "../config/composition-root.js";
import { ensurePassportAuthInitialized } from "../auth/passport.js";
import { hydratePrincipalFromDatabase } from "../auth/principal.js";
import { AuthService } from "../services/auth.service.js";
import { AUTH_COOKIE_NAME, getCookieValue } from "../utils/cookie.js";
import { firstHeaderValue } from "../utils/request.js";

/**
 * Attaches authorization from cookie.
 * @param req - The req input.
 */

function attachAuthorizationFromCookie(req: Request): void {
  const authorization = firstHeaderValue(req.headers.authorization);
  if (authorization) {
    return;
  }

  const cookieHeader = firstHeaderValue(req.headers.cookie);
  const authCookie = getCookieValue(cookieHeader, AUTH_COOKIE_NAME);

  if (!authCookie) {
    return;
  }

  req.headers.authorization = `Bearer ${authCookie}`;
}

/**
 * Creates auth middleware.
 * @param ctx - The ctx input.
 */

export function createAuthMiddleware(ctx: AppContext) {
  const authService = new AuthService(
    ctx.userRepository,
    ctx.tenantRepository,
    ctx.passwordService,
    ctx.jwt,
  );

  return function requireApiAuth(
    req: Request,
    res: Response,
    next: NextFunction,
  ): void {
    try {
      ensurePassportAuthInitialized();
      attachAuthorizationFromCookie(req);
    } catch (error) {
      console.error("Failed to initialize auth:", error);
      res.status(500).json({ error: "Authentication misconfigured" });
      return;
    }

    passport.authenticate(
      "bearer",
      { session: false },
      async (error: unknown, user: Express.User | false) => {
        if (error) {
          console.error("Authentication error:", error);
          res.status(500).json({ error: "Authentication failed" });
          return;
        }

        if (!user) {
          res.status(401).json({ error: "Unauthorized" });
          return;
        }

        try {
          const refreshed = await authService.refreshPrincipal(user as never);
          if (!refreshed) {
            res.status(401).json({ error: "Unauthorized" });
            return;
          }

          req.user = refreshed;
          next();
        } catch (dbError) {
          console.error("Authentication DB lookup failed:", dbError);
          res.status(500).json({ error: "Authentication failed" });
        }
      },
    )(req, res, next);
  };
}

/**
 * Requires API auth.
 * @param req - The req input.
 * @param res - The res input.
 * @param next - The next input.
 */

export function requireApiAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  try {
    ensurePassportAuthInitialized();
    attachAuthorizationFromCookie(req);
  } catch (error) {
    console.error("Failed to initialize auth:", error);
    res.status(500).json({ error: "Authentication misconfigured" });
    return;
  }

  passport.authenticate(
    "bearer",
    { session: false },
    async (error: unknown, user: Express.User | false) => {
      if (error) {
        console.error("Authentication error:", error);
        res.status(500).json({ error: "Authentication failed" });
        return;
      }

      if (!user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      try {
        const hydratedUser = await hydratePrincipalFromDatabase(user);
        if (!hydratedUser) {
          res.status(401).json({ error: "Unauthorized" });
          return;
        }

        req.user = hydratedUser;
        next();
      } catch (dbError) {
        console.error("Authentication DB lookup failed:", dbError);
        res.status(500).json({ error: "Authentication failed" });
      }
    },
  )(req, res, next);
}
