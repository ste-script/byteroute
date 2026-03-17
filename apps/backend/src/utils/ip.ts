/**
 * @module backend/utils/ip
 */

import { isIP } from "node:net";
import ipLib from "ip";

/**
 * Normalizes IP.
 * @param input - The input input.
 * @returns The IP result.
 */

export function normalizeIp(
  input: string | undefined | null,
): string | undefined {
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

/**
 * Firsts forwarded for.
 * @param header - The header input.
 * @returns The forwarded for result.
 */

export function firstForwardedFor(header: unknown): string | undefined {
  if (typeof header !== "string") {
    return undefined;
  }
  const first = header.split(",")[0]?.trim();
  return normalizeIp(first);
}

/**
 * Resolves reporter IP from request-derived candidates.
 * @param input - Candidate IP sources from the HTTP request.
 * @returns The most reliable reporter IP.
 */

export function resolveReporterIp(input: {
  reqIp?: string;
  reqIps?: string[];
  xForwardedFor?: unknown;
  xRealIp?: unknown;
  remoteAddress?: string | null;
}): string | undefined {
  const fromReqIps = Array.isArray(input.reqIps) ? input.reqIps : [];

  const fromXForwardedFor =
    typeof input.xForwardedFor === "string"
      ? input.xForwardedFor.split(",").map((entry) => entry.trim())
      : [];

  const fromXRealIp =
    typeof input.xRealIp === "string" ? [input.xRealIp.trim()] : [];

  const rawCandidates = [
    ...fromReqIps,
    ...fromXForwardedFor,
    ...fromXRealIp,
    input.reqIp,
    input.remoteAddress ?? undefined,
  ];

  const normalizedCandidates = rawCandidates
    .map((candidate) => normalizeIp(candidate))
    .filter((candidate): candidate is string => Boolean(candidate));

  const publicCandidate = normalizedCandidates.find(
    (candidate) => !isPrivateIp(candidate),
  );

  return publicCandidate ?? normalizedCandidates[0];
}

/**
 * Checks whether private ipv4 is satisfied.
 * @param ip - The IP input.
 * @returns True when private ipv4 is satisfied.
 */

export function isPrivateIpv4(ip: string): boolean {
  return ipLib.isPrivate(ip);
}

/**
 * Checks whether private IP is satisfied.
 * @param ip - The IP input.
 * @returns True when private IP is satisfied.
 */

export function isPrivateIp(ip: string): boolean {
  // For now focus on IPv4; IPv6 private ranges can be added if needed.
  return ip.includes(".") ? isPrivateIpv4(ip) : false;
}
