/**
 * @module backend/infrastructure/auth/passport
 */

import passport from "passport";
import { Strategy as BearerStrategy } from "passport-http-bearer";
import { getJwtSecret, verifyToken } from "./jwt.js";

export function ensurePassportAuthInitialized(): void {
  getJwtSecret();

  passport.unuse("bearer");
  passport.use(
    "bearer",
    new BearerStrategy((providedToken, done) => {
      const principal = verifyToken(providedToken);
      if (!principal) {
        done(null, false);
        return;
      }

      done(null, principal);
    })
  );
}
