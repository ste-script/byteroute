import type { ServerToClientEvents } from "@byteroute/shared";
import { getTenantRoom } from "../../utils/tenant.js";
import type { TypedSocketServer } from "./types.js";

export function emitToTenant(
  io: TypedSocketServer,
  tenantId: string,
  event: keyof ServerToClientEvents,
  payload: unknown
): void {
  const room = getTenantRoom(tenantId);
  const target = (io as unknown as { to?: (roomName: string) => { emit: (eventName: string, data: unknown) => void } }).to;

  if (typeof target === "function") {
    target.call(io, room).emit(event, payload);
    return;
  }

  (io as unknown as { emit: (eventName: string, data: unknown) => void }).emit(event, payload);
}
