import { randomBytes } from "node:crypto";

export const CSRF_COOKIE_NAME = process.env.CSRF_COOKIE_NAME ?? "byteroute_csrf";

export function generateCsrfToken(): string {
  return randomBytes(32).toString("hex");
}
