import type { ServerToClientEvents } from "@byteroute/shared";
import type { TypedSocketServer } from "../../services/connections/types.js";
import {
  ensureTenantId,
  getTenantRoom,
  getTenantScopedRoom,
  type TenantFeatureRoom,
} from "../../utils/tenant.js";

const EVENT_ROOMS: Partial<Record<keyof ServerToClientEvents, TenantFeatureRoom>> = {
  "connection:new": "connections",
  "connection:update": "connections",
  "connection:remove": "connections",
  "connections:batch": "connections",
  "statistics:update": "statistics",
  "traffic:flows": "flows",
};

export class SocketEmitter {
  constructor(private readonly io: TypedSocketServer) {}

  emitToTenant(event: keyof ServerToClientEvents, tenantId: string, payload: unknown): void {
    const resolvedTenantId = ensureTenantId(tenantId);
    const featureRoom = EVENT_ROOMS[event];
    const room = featureRoom ? getTenantScopedRoom(resolvedTenantId, featureRoom) : getTenantRoom(resolvedTenantId);
    this.io.to(room).emit(event, payload as never);
  }
}
