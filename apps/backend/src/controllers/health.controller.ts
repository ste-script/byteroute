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
