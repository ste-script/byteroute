import type { NextFunction, Request, Response } from "express";

/**
 * Global Express error-handling middleware.
 * Catches any error thrown (or passed to `next(err)`) from route handlers.
 * Express 5 automatically forwards async rejections here.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  const status = typeof (err as Record<string, unknown>)?.status === "number"
    ? (err as Record<string, unknown>).status as number
    : 500;

  const message =
    err instanceof Error ? err.message : "Internal server error";

  if (status >= 500) {
    console.error("[ErrorHandler]", err);
  }

  res.status(status).json({ error: message });
}
