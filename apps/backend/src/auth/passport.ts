export { ensurePassportAuthInitialized } from "../infrastructure/auth/passport.js";

export {
  extractBearerTokenFromAuthorization,
  verifyToken as verifyAuthToken,
  signToken as signAuthToken,
} from "../infrastructure/auth/jwt.js";

import { signToken, verifyToken } from "../infrastructure/auth/jwt.js";
import type { AuthTokenClaims } from "../infrastructure/auth/jwt.js";

export function signAuthTokenWithTtl(claims: AuthTokenClaims, ttl: string): string {
  return signToken(claims, ttl);
}

export function verifyBearerToken(providedToken: string | undefined): boolean {
  return verifyToken(providedToken) !== undefined;
}
