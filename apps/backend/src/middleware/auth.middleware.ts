import type { NextFunction, Request, Response } from "express";
import passport from "passport";
import { ensurePassportAuthInitialized } from "../auth/passport.js";
import { hydratePrincipalFromDatabase } from "../auth/principal.js";
export function requireApiAuth(req: Request, res: Response, next: NextFunction): void {
  try {
    ensurePassportAuthInitialized();
  } catch (error) {
    console.error("Failed to initialize auth:", error);
    res.status(500).json({ error: "Authentication misconfigured" });
    return;
  }

  passport.authenticate("bearer", { session: false }, async (error: unknown, user: Express.User | false) => {
    if (error) {
      console.error("Authentication error:", error);
      res.status(500).json({ error: "Authentication failed" });
      return;
    }

    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    try {
      const hydratedUser = await hydratePrincipalFromDatabase(user);
      if (!hydratedUser) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      req.user = hydratedUser;
      next();
    } catch (dbError) {
      console.error("Authentication DB lookup failed:", dbError);
      res.status(500).json({ error: "Authentication failed" });
    }
  })(req, res, next);
}
