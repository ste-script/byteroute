import type { Socket } from "socket.io";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
} from "@byteroute/shared";
import {
  type TypedSocketServer,
  getConnections,
  emitStatisticsUpdate,
  emitTrafficFlows,
} from "../services/connections.js";

export type TypedSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

export function handleConnection(io: TypedSocketServer, socket: TypedSocket): void {
  console.log(`Client connected: ${socket.id}`);

  // Initialize socket data
  socket.data.subscribedRooms = [];

  // Send initial data to client
  const connections = getConnections();
  socket.emit("connections:batch", connections);
  emitStatisticsUpdate(io);
  emitTrafficFlows(io);

  // Register event handlers
  socket.on("subscribe", (data) => handleSubscribe(socket, data));
  socket.on("unsubscribe", (data) => handleUnsubscribe(socket, data));
  socket.on("disconnect", (reason) => handleDisconnect(socket, reason));
}

function handleSubscribe(socket: TypedSocket, { rooms }: { rooms: string[] }): void {
  for (const room of rooms) {
    void socket.join(room);
    socket.data.subscribedRooms?.push(room);
  }
  console.log(`Client ${socket.id} subscribed to: ${rooms.join(", ")}`);
}

function handleUnsubscribe(socket: TypedSocket, { rooms }: { rooms: string[] }): void {
  for (const room of rooms) {
    void socket.leave(room);
    if (socket.data.subscribedRooms) {
      socket.data.subscribedRooms = socket.data.subscribedRooms.filter(r => r !== room);
    }
  }
  console.log(`Client ${socket.id} unsubscribed from: ${rooms.join(", ")}`);
}

function handleDisconnect(socket: TypedSocket, reason: string): void {
  console.log(`Client disconnected: ${socket.id} (${reason})`);
}
