import type { ExtendedError } from "socket.io";
import type { Socket } from "socket.io";
import {
  extractBearerTokenFromAuthorization,
  verifyAuthToken,
} from "../auth/passport.js";
import { hydratePrincipalFromDatabase } from "../auth/principal.js";
import { AUTH_COOKIE_NAME, getCookieValue } from "../utils/cookie.js";
import { resolveTenantContextFromSocketHandshake, userHasTenantAccess } from "../utils/tenant.js";

type SocketHandshakeLike = {
  auth?: {
    token?: unknown;
    bearerToken?: unknown;
    authorization?: unknown;
  };
  headers?: Record<string, string | string[] | undefined>;
};

function normalizeHeaderValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

export function extractBearerTokenFromSocketHandshake(
  handshake: SocketHandshakeLike | undefined
): string | undefined {
  const authToken = typeof handshake?.auth?.token === "string" ? handshake.auth.token.trim() : undefined;
  if (authToken) {
    return authToken;
  }

  const authBearerToken =
    typeof handshake?.auth?.bearerToken === "string" ? handshake.auth.bearerToken.trim() : undefined;
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
    normalizeHeaderValue(handshake?.headers?.authorization)
  );

  if (headerAuthorization) {
    return headerAuthorization;
  }

  const cookieToken = getCookieValue(
    normalizeHeaderValue(handshake?.headers?.cookie),
    AUTH_COOKIE_NAME
  );

  return cookieToken;
}

export function socketAuthMiddleware(
  socket: Socket,
  next: (err?: ExtendedError | undefined) => void
): void {
  void (async () => {
    try {
      const providedToken = extractBearerTokenFromSocketHandshake(socket.handshake);
      const principal = verifyAuthToken(providedToken);

      if (!principal) {
        next(new Error("Unauthorized"));
        return;
      }

      const hydratedPrincipal = await hydratePrincipalFromDatabase(principal);
      if (!hydratedPrincipal) {
        next(new Error("Unauthorized"));
        return;
      }

      const { tenantId } = resolveTenantContextFromSocketHandshake(socket.handshake);
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
