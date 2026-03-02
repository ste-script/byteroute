import type { Request, Response } from "express";
import { mongoReadyState } from "../infrastructure/persistence/mongoose.js";

export function healthCheck(_req: Request, res: Response): void {
  res.json({ ok: true, mongo: { readyState: mongoReadyState() } });
}
