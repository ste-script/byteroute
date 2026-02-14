export const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME ?? "byteroute_auth";

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
