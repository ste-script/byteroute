import type { NextFunction, Request, Response } from "express";
import passport from "passport";
import { ensurePassportAuthInitialized } from "../auth/passport.js";
import { AUTH_COOKIE_NAME, getCookieValue } from "../utils/cookie.js";

function firstHeaderValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

export function requireApiAuth(req: Request, res: Response, next: NextFunction): void {
  try {
    ensurePassportAuthInitialized();
  } catch (error) {
    console.error("Failed to initialize auth:", error);
    res.status(500).json({ error: "Authentication misconfigured" });
    return;
  }

  const authHeader = firstHeaderValue(req.headers.authorization);
  if (!authHeader) {
    const cookieToken = getCookieValue(firstHeaderValue(req.headers.cookie), AUTH_COOKIE_NAME);
    if (cookieToken) {
      req.headers.authorization = `Bearer ${cookieToken}`;
    }
  }

  passport.authenticate("bearer", { session: false }, (error: unknown, user: Express.User | false) => {
    if (error) {
      console.error("Authentication error:", error);
      res.status(500).json({ error: "Authentication failed" });
      return;
    }

    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    req.user = user;
    next();
  })(req, res, next);
}
