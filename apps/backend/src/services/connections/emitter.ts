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
 * @module backend/services/connections/emitter
 */

import type { ServerToClientEvents } from "@byteroute/shared";
import {
  ensureTenantId,
  getTenantRoom,
  getTenantScopedRoom,
  type TenantFeatureRoom,
} from "../../utils/tenant.js";
import type { TypedSocketServer } from "./types.js";

const EVENT_ROOMS: Partial<
  Record<keyof ServerToClientEvents, TenantFeatureRoom>
> = {
  "connection:new": "connections",
  "connection:update": "connections",
  "connection:remove": "connections",
  "connections:batch": "connections",
  "statistics:update": "statistics",
  "traffic:flows": "flows",
};

/**
 * Emits to tenant.
 * @param io - The IO input.
 * @param tenantId - The tenant ID input.
 * @param event - The event input.
 * @param payload - The payload input.
 */

export function emitToTenant(
  io: TypedSocketServer,
  tenantId: string,
  event: keyof ServerToClientEvents,
  payload: unknown,
): void {
  const resolvedTenantId = ensureTenantId(tenantId);
  const featureRoom = EVENT_ROOMS[event];
  const room = featureRoom
    ? getTenantScopedRoom(resolvedTenantId, featureRoom)
    : getTenantRoom(resolvedTenantId);
  const target = (
    io as unknown as {
      to?: (roomName: string) => {
        emit: (eventName: string, data: unknown) => void;
      };
    }
  ).to;

  if (typeof target === "function") {
    target.call(io, room).emit(event, payload);
    return;
  }

  (io as unknown as { emit: (eventName: string, data: unknown) => void }).emit(
    event,
    payload,
  );
}
