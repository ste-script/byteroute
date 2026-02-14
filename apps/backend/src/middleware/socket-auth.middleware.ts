import type { ExtendedError } from "socket.io";
import type { Socket } from "socket.io";
import {
  extractBearerTokenFromAuthorization,
  verifyBearerToken,
} from "../auth/passport.js";
import { AUTH_COOKIE_NAME, getCookieValue } from "../utils/cookie.js";

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
  try {
    const providedToken = extractBearerTokenFromSocketHandshake(socket.handshake);

    if (!verifyBearerToken(providedToken)) {
      next(new Error("Unauthorized"));
      return;
    }

    next();
  } catch (error) {
    console.error("Socket authentication misconfigured:", error);
    next(new Error("Authentication misconfigured"));
  }
}
