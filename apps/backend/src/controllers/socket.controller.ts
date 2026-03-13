/**
 * @module backend/controllers/socket.controller
 */

import type { Socket } from "socket.io";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
} from "@byteroute/shared";
import type { AppContext } from "../config/composition-root.js";
import { createAppContext } from "../config/composition-root.js";
import {
  type TypedSocketServer,
  getConnectionsForTenant,
  emitStatisticsUpdate,
  emitTrafficFlows,
} from "../services/connections.js";
import {
  ensureTenantId,
  getTenantScopedRoom,
  isTenantFeatureRoom,
  resolveTenantContextFromSocketHandshake,
} from "../utils/tenant.js";
import type { HydratedPrincipal } from "../auth/principal.js";

export type TypedSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

export function createSocketController(ctx: AppContext) {
  void ctx;
  return {
    handleConnection: (io: TypedSocketServer, socket: TypedSocket): void => {
      const { tenantId, tenantRoom } = resolveTenantContextFromSocketHandshake(socket.handshake);
      const principal = socket.data.principal as HydratedPrincipal | undefined;

      console.log(`Client connected: ${socket.id}`);

      socket.data.tenantId = tenantId;
      socket.data.subscribedRooms = [];
      void socket.join(tenantRoom);

      socket.emit("tenants:list", { tenants: principal?.tenantIds ?? [] });

      socket.on("subscribe", (data) => handleSubscribe(io, socket, data));
      socket.on("unsubscribe", (data) => handleUnsubscribe(socket, data));
      socket.on("disconnect", (reason) => handleDisconnect(socket, reason));
    },
  };
}

const defaultController = createSocketController(createAppContext());
export const handleConnection = defaultController.handleConnection;

function clampConnectionsLimit(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  const asInt = Math.floor(value);
  if (asInt <= 0) {
    return fallback;
  }

  // Hard cap to avoid accidental / abusive huge payloads.
  return Math.min(asInt, 500);
}

function handleSubscribe(
  io: TypedSocketServer,
  socket: TypedSocket,
  { rooms, connectionsLimit }: { rooms: string[]; connectionsLimit?: number }
): void {
  const tenantId = ensureTenantId(socket.data.tenantId);
  const subscribed: string[] = [];

  for (const roomName of rooms) {
    if (!isTenantFeatureRoom(roomName)) {
      continue;
    }

    const scopedRoom = getTenantScopedRoom(tenantId, roomName);
    void socket.join(scopedRoom);

    if (!socket.data.subscribedRooms?.includes(roomName)) {
      socket.data.subscribedRooms?.push(roomName);
    }

    subscribed.push(roomName);

    // Send room-specific initial snapshots only when requested.
    if (roomName === "connections") {
      const limit = clampConnectionsLimit(connectionsLimit, 10);
      socket.emit("connections:batch", getConnectionsForTenant(tenantId, limit));
    } else if (roomName === "statistics") {
      emitStatisticsUpdate(io, tenantId);
    } else if (roomName === "flows") {
      emitTrafficFlows(io, tenantId);
    }
  }

  if (subscribed.length > 0) {
    console.log(`Client ${socket.id} subscribed to: ${subscribed.join(", ")}`);
  }
}

function handleUnsubscribe(socket: TypedSocket, { rooms }: { rooms: string[] }): void {
  const tenantId = ensureTenantId(socket.data.tenantId);
  const unsubscribed: string[] = [];

  for (const roomName of rooms) {
    if (!isTenantFeatureRoom(roomName)) {
      continue;
    }

    const scopedRoom = getTenantScopedRoom(tenantId, roomName);
    void socket.leave(scopedRoom);
    unsubscribed.push(roomName);

    if (socket.data.subscribedRooms) {
      socket.data.subscribedRooms = socket.data.subscribedRooms.filter((r) => r !== roomName);
    }
  }

  if (unsubscribed.length > 0) {
    console.log(`Client ${socket.id} unsubscribed from: ${unsubscribed.join(", ")}`);
  }
}

function handleDisconnect(socket: TypedSocket, reason: string): void {
  console.log(`Client disconnected: ${socket.id} (${reason})`);
}
