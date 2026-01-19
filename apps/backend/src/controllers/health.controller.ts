import type { Request, Response } from "express";
import { mongoReadyState } from "@byteroute/shared";

export function healthCheck(_req: Request, res: Response): void {
  res.json({ ok: true, mongo: { readyState: mongoReadyState() } });
}
