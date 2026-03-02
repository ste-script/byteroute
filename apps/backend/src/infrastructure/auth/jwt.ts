import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";
import type { Principal } from "../../domain/identity/types.js";

export type AuthTokenClaims = {
  sub: string;
  email: string;
  name?: string;
  tenantIds: string[];
};

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
  const tenantIds = Array.isArray(payload.tenantIds)
    ? payload.tenantIds.filter((value): value is string => typeof value === "string")
    : [];

  if (!sub || !email) {
    return undefined;
  }

  return { sub, email, name, tenantIds };
}

export function signToken(claims: AuthTokenClaims, ttl = process.env.AUTH_TOKEN_TTL ?? "1d"): string {
  const options: SignOptions = {
    expiresIn: ttl as SignOptions["expiresIn"],
  };

  return jwt.sign(claims, getJwtSecret(), options);
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
