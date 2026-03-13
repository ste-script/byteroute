/**
 * @module backend/middleware/error.middleware
 */

import type { NextFunction, Request, Response } from "express";

/**
 * Errors handler.
 * @param err - The err input.
 * @param _req - The req input.
 * @param res - The res input.
 * @param _next - The next input.
 */

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const status =
    typeof (err as Record<string, unknown>)?.status === "number"
      ? ((err as Record<string, unknown>).status as number)
      : 500;

  const message = err instanceof Error ? err.message : "Internal server error";

  if (status >= 500) {
    console.error("[ErrorHandler]", err);
  }

  res.status(status).json({ error: message });
}
