import type { Request, Response } from "express";
import * as shared from "@byteroute/shared";
import { mongoReadyState as infraMongoReadyState } from "../infrastructure/persistence/mongoose.js";

const mongoReadyState =
  (shared as { mongoReadyState?: typeof infraMongoReadyState }).mongoReadyState ?? infraMongoReadyState;

export function healthCheck(_req: Request, res: Response): void {
  res.json({ ok: true, mongo: { readyState: mongoReadyState() } });
}
