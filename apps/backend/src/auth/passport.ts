/**
 * @module backend/auth/passport
 */

export { ensurePassportAuthInitialized } from "../infrastructure/auth/passport.js";

export {
  extractBearerTokenFromAuthorization,
  verifyToken as verifyAuthToken,
  signToken as signAuthToken,
} from "../infrastructure/auth/jwt.js";

import { signToken, verifyToken } from "../infrastructure/auth/jwt.js";
import type { AuthTokenClaims } from "../infrastructure/auth/jwt.js";

/**
 * Signs auth token with ttl.
 * @param claims - The claims input.
 * @param ttl - The ttl input.
 * @returns The auth token with ttl result.
 */

export function signAuthTokenWithTtl(
  claims: AuthTokenClaims,
  ttl: string,
): string {
  return signToken(claims, ttl);
}

/**
 * Verifies bearer token.
 * @param providedToken - The provided token input.
 * @returns The bearer token result.
 */

export function verifyBearerToken(providedToken: string | undefined): boolean {
  return verifyToken(providedToken) !== undefined;
}
