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
 * @module backend/infrastructure/realtime/socket-emitter
 */

import type { ServerToClientEvents } from "@byteroute/shared";
import type { TypedSocketServer } from "../../services/connections/types.js";
import {
  ensureTenantId,
  getTenantRoom,
  getTenantScopedRoom,
  type TenantFeatureRoom,
} from "../../utils/tenant.js";

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
 * Represents a socket emitter.
 */

export class SocketEmitter {
  /**
   * Creates a socket emitter.
   * @param io - The IO input.
   */

  constructor(private readonly io: TypedSocketServer) {}

  /**
   * Emits to tenant.
   * @param event - The event input.
   * @param tenantId - The tenant ID input.
   * @param payload - The payload input.
   */

  emitToTenant(
    event: keyof ServerToClientEvents,
    tenantId: string,
    payload: unknown,
  ): void {
    const resolvedTenantId = ensureTenantId(tenantId);
    const featureRoom = EVENT_ROOMS[event];
    const room = featureRoom
      ? getTenantScopedRoom(resolvedTenantId, featureRoom)
      : getTenantRoom(resolvedTenantId);
    this.io.to(room).emit(event, payload as never);
  }
}
