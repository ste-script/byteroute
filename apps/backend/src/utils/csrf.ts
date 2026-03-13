/**
 * @module backend/utils/csrf
 */

import { randomBytes } from "node:crypto";

export const CSRF_COOKIE_NAME =
  process.env.CSRF_COOKIE_NAME ?? "byteroute_csrf";

/**
 * Generates CSRF token.
 * @returns The CSRF token result.
 */

export function generateCsrfToken(): string {
  return randomBytes(32).toString("hex");
}
