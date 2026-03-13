/**
 * @module backend/controllers/health.controller
 */

import type { Request, Response } from "express";
import * as shared from "@byteroute/shared";
import { mongoReadyState as infraMongoReadyState } from "../infrastructure/persistence/mongoose.js";

const mongoReadyState =
  (shared as { mongoReadyState?: typeof infraMongoReadyState })
    .mongoReadyState ?? infraMongoReadyState;

/**
 * Healths check.
 * @param _req - The req input.
 * @param res - The res input.
 */

export function healthCheck(_req: Request, res: Response): void {
  res.json({ ok: true, mongo: { readyState: mongoReadyState() } });
}
