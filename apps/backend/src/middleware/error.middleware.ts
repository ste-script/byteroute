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
  // Keep the 4-arg Express error-middleware signature while satisfying lint.
  void _next;

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
