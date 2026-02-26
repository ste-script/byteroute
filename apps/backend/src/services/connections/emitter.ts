import type { ServerToClientEvents } from "@byteroute/shared";
import {
  ensureTenantId,
  getTenantRoom,
  getTenantScopedRoom,
  type TenantFeatureRoom,
} from "../../utils/tenant.js";
import type { TypedSocketServer } from "./types.js";

const EVENT_ROOMS: Partial<Record<keyof ServerToClientEvents, TenantFeatureRoom>> = {
  "connection:new": "connections",
  "connection:update": "connections",
  "connection:remove": "connections",
  "connections:batch": "connections",
  "statistics:update": "statistics",
  "traffic:flows": "flows",
};

export function emitToTenant(
  io: TypedSocketServer,
  tenantId: string,
  event: keyof ServerToClientEvents,
  payload: unknown
): void {
  const resolvedTenantId = ensureTenantId(tenantId);
  const featureRoom = EVENT_ROOMS[event];
  const room = featureRoom ? getTenantScopedRoom(resolvedTenantId, featureRoom) : getTenantRoom(resolvedTenantId);
  const target = (io as unknown as { to?: (roomName: string) => { emit: (eventName: string, data: unknown) => void } }).to;

  if (typeof target === "function") {
    target.call(io, room).emit(event, payload);
    return;
  }

  (io as unknown as { emit: (eventName: string, data: unknown) => void }).emit(event, payload);
}
