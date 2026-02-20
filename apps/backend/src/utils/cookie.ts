import type { Response } from "express";
import { CSRF_COOKIE_NAME } from "./csrf.js";

export const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME ?? "byteroute_auth";

export const cookieIsSecure =
  process.env.AUTH_COOKIE_SECURE === "true" ||
  (process.env.AUTH_COOKIE_SECURE !== "false" && process.env.NODE_ENV === "production");

const authCookieOptions = {
  httpOnly: true,
  secure: cookieIsSecure,
  sameSite: "lax" as const,
  path: "/",
};

const csrfCookieOptions = {
  httpOnly: false,
  secure: cookieIsSecure,
  sameSite: "lax" as const,
  path: "/",
};

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE_NAME, token, authCookieOptions);
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE_NAME, authCookieOptions);
}

export function setCsrfCookie(res: Response, token: string): void {
  res.cookie(CSRF_COOKIE_NAME, token, csrfCookieOptions);
}

export function clearCsrfCookie(res: Response): void {
  res.clearCookie(CSRF_COOKIE_NAME, csrfCookieOptions);
}

export function parseCookieHeader(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) {
    return {};
  }

  const parsed: Record<string, string> = {};
  const entries = cookieHeader.split(";");

  for (const entry of entries) {
    const [rawKey, ...rawValue] = entry.split("=");
    const key = rawKey?.trim();
    if (!key) {
      continue;
    }

    const value = rawValue.join("=").trim();
    parsed[key] = decodeURIComponent(value);
  }

  return parsed;
}

export function getCookieValue(cookieHeader: string | undefined, name: string): string | undefined {
  return parseCookieHeader(cookieHeader)[name];
}
