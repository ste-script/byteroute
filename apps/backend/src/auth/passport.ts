import passport from "passport";
import { Strategy as BearerStrategy } from "passport-http-bearer";
import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";

type AuthenticatedPrincipal = {
  id: string;
  email: string;
  name?: string;
  tenantIds: string[];
  scopes: string[];
};

type AuthTokenClaims = {
  sub: string;
  email: string;
  name?: string;
  tenantIds: string[];
};

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is required");
  }
  return secret;
}

function parseAuthorizationHeader(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const [scheme, token] = value.trim().split(/\s+/, 2);
  if (!scheme || !token) {
    return undefined;
  }

  if (scheme.toLowerCase() !== "bearer") {
    return undefined;
  }

  return token;
}

export function verifyBearerToken(providedToken: string | undefined): boolean {
  return verifyAuthToken(providedToken) !== undefined;
}

export function extractBearerTokenFromAuthorization(
  authorizationHeader: string | undefined
): string | undefined {
  return parseAuthorizationHeader(authorizationHeader);
}

export function ensurePassportAuthInitialized(): void {
  getJwtSecret();

  passport.unuse("bearer");
  passport.use(
    "bearer",
    new BearerStrategy((providedToken, done) => {
      const principal = verifyAuthToken(providedToken);
      if (!principal) {
        done(null, false);
        return;
      }

      done(null, principal);
    })
  );
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

  if (!sub || !email || tenantIds.length === 0) {
    return undefined;
  }

  return {
    sub,
    email,
    name,
    tenantIds,
  };
}

export function signAuthToken(claims: AuthTokenClaims): string {
  return signAuthTokenWithTtl(claims, process.env.AUTH_TOKEN_TTL ?? "1d");
}

export function signAuthTokenWithTtl(claims: AuthTokenClaims, ttl: string): string {
  const options: SignOptions = {
    expiresIn: ttl as SignOptions["expiresIn"],
  };

  return jwt.sign(claims, getJwtSecret(), options);
}

export function verifyAuthToken(token: string | undefined): AuthenticatedPrincipal | undefined {
  if (!token) {
    return undefined;
  }

  const secret = getJwtSecret();

  try {
    const payload = jwt.verify(token, secret);
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
