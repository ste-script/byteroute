import type { NextFunction, Request, Response } from "express";
import { AUTH_COOKIE_NAME, getCookieValue } from "../utils/cookie.js";
import { CSRF_COOKIE_NAME } from "../utils/csrf.js";
import { firstHeaderValue } from "../utils/request.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
export function requireCsrfForCookieAuth(req: Request, res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method.toUpperCase())) {
    next();
    return;
  }

  const authorization = firstHeaderValue(req.headers.authorization);
  if (authorization) {
    next();
    return;
  }

  const cookieHeader = firstHeaderValue(req.headers.cookie);
  const hasAuthCookie = Boolean(getCookieValue(cookieHeader, AUTH_COOKIE_NAME));

  if (!hasAuthCookie) {
    next();
    return;
  }

  const csrfCookie = getCookieValue(cookieHeader, CSRF_COOKIE_NAME);
  const csrfHeader = firstHeaderValue(req.headers["x-csrf-token"]);

  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    res.status(403).json({ error: "CSRF token validation failed" });
    return;
  }

  next();
}
