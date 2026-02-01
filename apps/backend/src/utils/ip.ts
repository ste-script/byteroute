import { isIP } from "node:net";

export function normalizeIp(input: string | undefined | null): string | undefined {
  if (!input) {
    return undefined;
  }

  let ip = input.trim();
  if (!ip) {
    return undefined;
  }

  // X-Forwarded-For may include multiple values; caller should pass the first.
  // Strip port if present (IPv4: "1.2.3.4:1234").
  const colonIndex = ip.lastIndexOf(":");
  const dotIndex = ip.lastIndexOf(".");
  if (colonIndex > -1 && dotIndex > -1 && colonIndex > dotIndex) {
    ip = ip.slice(0, colonIndex);
  }

  // IPv6 bracketed: "[::1]:1234"
  if (ip.startsWith("[") && ip.includes("]")) {
    ip = ip.slice(1, ip.indexOf("]"));
  }

  // IPv4-mapped IPv6: "::ffff:1.2.3.4"
  if (ip.startsWith("::ffff:")) {
    ip = ip.slice("::ffff:".length);
  }

  return isIP(ip) ? ip : undefined;
}

export function firstForwardedFor(header: unknown): string | undefined {
  if (typeof header !== "string") {
    return undefined;
  }
  const first = header.split(",")[0]?.trim();
  return normalizeIp(first);
}

export function isPrivateIpv4(ip: string): boolean {
  // Assumes ip is a valid IPv4 dotted-quad.
  const parts = ip.split(".").map((p) => Number(p));
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return false;
  }

  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true; // loopback
  if (a === 169 && b === 254) return true; // link-local
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  return false;
}

export function isPrivateIp(ip: string): boolean {
  // For now focus on IPv4; IPv6 private ranges can be added if needed.
  return ip.includes(".") ? isPrivateIpv4(ip) : false;
}
