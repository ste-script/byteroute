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
 * @module backend/middleware/socket-auth.middleware
 */

import type { ExtendedError } from "socket.io";
import type { Socket } from "socket.io";
import type { AppContext } from "../config/composition-root.js";
import { AuthService } from "../services/auth.service.js";
import {
  extractBearerTokenFromAuthorization,
  verifyAuthToken,
} from "../auth/passport.js";
import { hydratePrincipalFromDatabase } from "../auth/principal.js";
import {
  tryResolveTenantIdFromSocketHandshake,
  userHasTenantAccess,
} from "../utils/tenant.js";
import { firstHeaderValue } from "../utils/request.js";

type SocketHandshakeLike = {
  auth?: {
    token?: unknown;
    bearerToken?: unknown;
    authorization?: unknown;
  };
  headers?: Record<string, string | string[] | undefined>;
};

/**
 * Extracts bearer token from socket handshake.
 * @param handshake - The handshake input.
 * @returns The bearer token from socket handshake result.
 */

export function extractBearerTokenFromSocketHandshake(
  handshake: SocketHandshakeLike | undefined,
): string | undefined {
  const authToken =
    typeof handshake?.auth?.token === "string"
      ? handshake.auth.token.trim()
      : undefined;
  if (authToken) {
    return authToken;
  }

  const authBearerToken =
    typeof handshake?.auth?.bearerToken === "string"
      ? handshake.auth.bearerToken.trim()
      : undefined;
  if (authBearerToken) {
    return authBearerToken;
  }

  const authAuthorization =
    typeof handshake?.auth?.authorization === "string"
      ? extractBearerTokenFromAuthorization(handshake.auth.authorization)
      : undefined;
  if (authAuthorization) {
    return authAuthorization;
  }

  const headerAuthorization = extractBearerTokenFromAuthorization(
    firstHeaderValue(handshake?.headers?.authorization),
  );

  return headerAuthorization;
}

/**
 * Creates socket auth middleware.
 * @param ctx - The ctx input.
 */

export function createSocketAuthMiddleware(ctx: AppContext) {
  const authService = new AuthService(
    ctx.userRepository,
    ctx.tenantRepository,
    ctx.passwordService,
    ctx.jwt,
  );

  return function socketAuthMiddleware(
    socket: Socket,
    next: (err?: ExtendedError | undefined) => void,
  ): void {
    void (async () => {
      try {
        const providedToken = extractBearerTokenFromSocketHandshake(
          socket.handshake,
        );
        const principal = verifyAuthToken(providedToken);

        if (!principal) {
          next(new Error("Unauthorized"));
          return;
        }

        const hydratedPrincipal = await authService.refreshPrincipal(principal);
        if (!hydratedPrincipal) {
          next(new Error("Unauthorized"));
          return;
        }

        const tenantId = tryResolveTenantIdFromSocketHandshake(
          socket.handshake,
        );
        if (!tenantId) {
          next(new Error("Unauthorized"));
          return;
        }
        if (!userHasTenantAccess(hydratedPrincipal.tenantIds, tenantId)) {
          next(new Error("Forbidden: no access to tenant"));
          return;
        }

        (socket.data as Record<string, unknown>).principal = hydratedPrincipal;
        next();
      } catch (error) {
        console.error("Socket authentication misconfigured:", error);
        next(new Error("Authentication misconfigured"));
      }
    })();
  };
}

/**
 * Sockets auth middleware.
 * @param socket - The socket input.
 * @param next - The next input.
 */

export function socketAuthMiddleware(
  socket: Socket,
  next: (err?: ExtendedError | undefined) => void,
): void {
  void (async () => {
    try {
      const providedToken = extractBearerTokenFromSocketHandshake(
        socket.handshake,
      );
      const principal = verifyAuthToken(providedToken);

      if (!principal) {
        if (!process.env.JWT_SECRET) {
          throw new Error("JWT_SECRET is required");
        }
        next(new Error("Unauthorized"));
        return;
      }

      const hydratedPrincipal = await hydratePrincipalFromDatabase(principal);
      if (!hydratedPrincipal) {
        next(new Error("Unauthorized"));
        return;
      }

      const tenantId = tryResolveTenantIdFromSocketHandshake(socket.handshake);
      if (!tenantId) {
        next(new Error("Unauthorized"));
        return;
      }
      if (!userHasTenantAccess(hydratedPrincipal.tenantIds, tenantId)) {
        next(new Error("Forbidden: no access to tenant"));
        return;
      }

      (socket.data as Record<string, unknown>).principal = hydratedPrincipal;
      next();
    } catch (error) {
      console.error("Socket authentication misconfigured:", error);
      next(new Error("Authentication misconfigured"));
    }
  })();
}
