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

/**
 * Normalizes tenant claims.
 * @param tenantId - The tenant ID input.
 * @param tenantIds - The tenant ids input.
 * @returns The tenant claims result.
 */

function normalizeTenantClaims(
  tenantId: unknown,
  tenantIds: unknown,
): { tenantId?: string; tenantIds: string[] } {
  const primaryTenantId = typeof tenantId === "string" ? tenantId.trim() : "";
  const extraTenantIds = Array.isArray(tenantIds)
    ? tenantIds
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
    : [];

  const mergedTenantIds = [primaryTenantId, ...extraTenantIds].filter(
    (value) => value.length > 0,
  );
  const uniqueTenantIds = Array.from(new Set(mergedTenantIds));

  return {
    tenantId: uniqueTenantIds[0],
    tenantIds: uniqueTenantIds,
  };
}

/**
 * Gets JWT secret.
 * @returns The JWT secret.
 */

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is required");
  }
  return secret;
}

/**
 * Extracts bearer token from authorization.
 * @param authorizationHeader - The authorization header input.
 * @returns The bearer token from authorization result.
 */

export function extractBearerTokenFromAuthorization(
  authorizationHeader: string | undefined,
): string | undefined {
  if (!authorizationHeader) {
    return undefined;
  }

  const [scheme, token] = authorizationHeader.trim().split(/\s+/, 2);
  if (!scheme || !token || scheme.toLowerCase() !== "bearer") {
    return undefined;
  }

  return token;
}

/**
 * Claimses from payload.
 * @param payload - The payload input.
 * @returns The from payload result.
 */

function claimsFromPayload(
  payload: string | JwtPayload,
): AuthTokenClaims | undefined {
  if (typeof payload === "string") {
    return undefined;
  }

  const sub = typeof payload.sub === "string" ? payload.sub : undefined;
  const email = typeof payload.email === "string" ? payload.email : undefined;
  const name = typeof payload.name === "string" ? payload.name : undefined;
  const tenantClaims = normalizeTenantClaims(
    payload.tenantId,
    payload.tenantIds,
  );

  if (!sub || !email) {
    return undefined;
  }

  return {
    sub,
    email,
    name,
    tenantId: tenantClaims.tenantId,
    tenantIds: tenantClaims.tenantIds,
  };
}

/**
 * Signs token.
 * @param claims - The claims input.
 * @param ttl - The ttl input.
 * @returns The token result.
 */

export function signToken(
  claims: AuthTokenClaims,
  ttl = process.env.AUTH_TOKEN_TTL ?? "1d",
): string {
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
    options,
  );
}

/**
 * Verifies token.
 * @param token - The token input.
 * @returns The token result.
 */

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
