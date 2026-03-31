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
 * @module backend/middleware/csrf.middleware
 */

import type { NextFunction, Request, Response } from "express";
import { AUTH_COOKIE_NAME, getCookieValue } from "../utils/cookie.js";
import { CSRF_COOKIE_NAME } from "../utils/csrf.js";
import { firstHeaderValue } from "../utils/request.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
/**
 * Requires CSRF for cookie auth.
 * @param req - The req input.
 * @param res - The res input.
 * @param next - The next input.
 */

export function requireCsrfForCookieAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
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
