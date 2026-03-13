/**
 * @module backend/infrastructure/auth/jwt
 */

import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";
import type { Principal } from "../../domain/identity/types.js";

export type AuthTokenClaims = {
  sub: string;
  email: string;
  name?: string;
  tenantIds: string[];
  tenantId?: string;
};

function normalizeTenantClaims(tenantId: unknown, tenantIds: unknown): { tenantId?: string; tenantIds: string[] } {
  const primaryTenantId = typeof tenantId === "string" ? tenantId.trim() : "";
  const extraTenantIds = Array.isArray(tenantIds)
    ? tenantIds.filter((value): value is string => typeof value === "string").map((value) => value.trim())
    : [];

  const mergedTenantIds = [primaryTenantId, ...extraTenantIds].filter((value) => value.length > 0);
  const uniqueTenantIds = Array.from(new Set(mergedTenantIds));

  return {
    tenantId: uniqueTenantIds[0],
    tenantIds: uniqueTenantIds,
  };
}

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is required");
  }
  return secret;
}

export function extractBearerTokenFromAuthorization(authorizationHeader: string | undefined): string | undefined {
  if (!authorizationHeader) {
    return undefined;
  }

  const [scheme, token] = authorizationHeader.trim().split(/\s+/, 2);
  if (!scheme || !token || scheme.toLowerCase() !== "bearer") {
    return undefined;
  }

  return token;
}

function claimsFromPayload(payload: string | JwtPayload): AuthTokenClaims | undefined {
  if (typeof payload === "string") {
    return undefined;
  }

  const sub = typeof payload.sub === "string" ? payload.sub : undefined;
  const email = typeof payload.email === "string" ? payload.email : undefined;
  const name = typeof payload.name === "string" ? payload.name : undefined;
  const tenantClaims = normalizeTenantClaims(payload.tenantId, payload.tenantIds);

  if (!sub || !email) {
    return undefined;
  }

  return { sub, email, name, tenantId: tenantClaims.tenantId, tenantIds: tenantClaims.tenantIds };
}

export function signToken(claims: AuthTokenClaims, ttl = process.env.AUTH_TOKEN_TTL ?? "1d"): string {
  const options: SignOptions = {
    expiresIn: ttl as SignOptions["expiresIn"],
  };

  const tenantClaims = normalizeTenantClaims(claims.tenantId, claims.tenantIds);

  return jwt.sign(
    {
      ...claims,
      tenantId: tenantClaims.tenantId,
      tenantIds: tenantClaims.tenantIds,
    },
    getJwtSecret(),
    options
  );
}

export function verifyToken(token: string | undefined): Principal | undefined {
  if (!token) {
    return undefined;
  }

  try {
    const payload = jwt.verify(token, getJwtSecret());
    const claims = claimsFromPayload(payload);
    if (!claims) {
      return undefined;
    }

    return {
      id: claims.sub,
      email: claims.email,
      name: claims.name,
      tenantIds: claims.tenantIds,
      scopes: ["api"],
    };
  } catch {
    return undefined;
  }
}
