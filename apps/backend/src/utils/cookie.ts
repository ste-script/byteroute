/**
 * @module backend/utils/cookie
 */

import type { Response } from "express";
import { CSRF_COOKIE_NAME } from "./csrf.js";

export const AUTH_COOKIE_NAME =
  process.env.AUTH_COOKIE_NAME ?? "byteroute_auth";

export const cookieIsSecure =
  process.env.AUTH_COOKIE_SECURE === "true" ||
  (process.env.AUTH_COOKIE_SECURE !== "false" &&
    process.env.NODE_ENV === "production");

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

/**
 * Sets auth cookie.
 * @param res - The res input.
 * @param token - The token input.
 */

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE_NAME, token, authCookieOptions);
}

/**
 * Clears auth cookie.
 * @param res - The res input.
 */

export function clearAuthCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE_NAME, authCookieOptions);
}

/**
 * Sets CSRF cookie.
 * @param res - The res input.
 * @param token - The token input.
 */

export function setCsrfCookie(res: Response, token: string): void {
  res.cookie(CSRF_COOKIE_NAME, token, csrfCookieOptions);
}

/**
 * Clears CSRF cookie.
 * @param res - The res input.
 */

export function clearCsrfCookie(res: Response): void {
  res.clearCookie(CSRF_COOKIE_NAME, csrfCookieOptions);
}

/**
 * Parses cookie header.
 * @param cookieHeader - The cookie header input.
 * @returns The cookie header result.
 */

export function parseCookieHeader(
  cookieHeader: string | undefined,
): Record<string, string> {
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

/**
 * Gets cookie value.
 * @param cookieHeader - The cookie header input.
 * @param name - The name input.
 * @returns The cookie value.
 */

export function getCookieValue(
  cookieHeader: string | undefined,
  name: string,
): string | undefined {
  return parseCookieHeader(cookieHeader)[name];
}
