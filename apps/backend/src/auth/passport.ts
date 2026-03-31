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
