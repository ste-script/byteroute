import type { Server } from "socket.io";
import type {
  Connection,
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
} from "@byteroute/shared";
import { ConnectionModel } from "@byteroute/shared";
import {
  generateConnection,
  generateTrafficFlows,
  generateStatistics,
} from "../mock/connections.js";

export type TypedSocketServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

// In-memory store for connections
const connections: Map<string, Connection> = new Map();

// NOTE: This service is DB-backed for "real" mode.
// Mock connection generation only happens in demo mode (see startDemoMode).

export async function loadConnectionsFromDb(limit = 500): Promise<number> {
  const docs = await ConnectionModel.find(
    {},
    {
      _id: 0,
      id: 1,
      sourceIp: 1,
      destIp: 1,
      sourcePort: 1,
      destPort: 1,
      protocol: 1,
      status: 1,
      enriched: 1,
      country: 1,
      countryCode: 1,
      city: 1,
      latitude: 1,
      longitude: 1,
      asn: 1,
      asOrganization: 1,
      category: 1,
      bandwidth: 1,
      bytesIn: 1,
      bytesOut: 1,
      packetsIn: 1,
      packetsOut: 1,
      startTime: 1,
      lastActivity: 1,
      duration: 1,
    }
  )
    .sort({ lastActivity: -1 })
    .limit(limit)
    .lean();

  connections.clear();

  for (const doc of docs) {
    // Mongoose returns Date objects for Date fields; Connection allows Date|string.
    const connection = doc as unknown as Connection;
    connections.set(connection.id, connection);
  }

  return docs.length;
}

export function getConnections(): Connection[] {
  return Array.from(connections.values());
}

export function getConnection(id: string): Connection | undefined {
  return connections.get(id);
}

export function addConnection(io: TypedSocketServer, connection?: Partial<Connection>): Connection {
  const newConnection = generateConnection(connection);
  connections.set(newConnection.id, newConnection);

  // Emit to all connected clients
  io.emit("connection:new", newConnection);

  // Also emit updated statistics
  emitStatisticsUpdate(io);

  return newConnection;
}

export function upsertConnectionsLocal(io: TypedSocketServer, batch: Connection[]): void {
  for (const connection of batch) {
    const existing = connections.get(connection.id);
    connections.set(connection.id, connection);

    if (existing) {
      io.emit("connection:update", connection);
    } else {
      io.emit("connection:new", connection);
    }
  }
}

export function updateConnection(
  io: TypedSocketServer,
  id: string,
  updates: Partial<Connection>
): Connection | null {
  const existing = connections.get(id);
  if (!existing) {
    return null;
  }

  const updated: Connection = {
    ...existing,
    ...updates,
    id, // Ensure ID cannot be changed
    lastActivity: new Date().toISOString(),
  };

  connections.set(id, updated);

  // Emit to all connected clients
  io.emit("connection:update", updated);

  // Emit updated statistics if status changed
  if (updates.status && updates.status !== existing.status) {
    emitStatisticsUpdate(io);
  }

  return updated;
}

export function removeConnection(io: TypedSocketServer, id: string): boolean {
  const existed = connections.delete(id);

  if (existed) {
    // Emit to all connected clients
    io.emit("connection:remove", { id });

    // Emit updated statistics
    emitStatisticsUpdate(io);
  }

  return existed;
}

export function emitConnectionsBatch(io: TypedSocketServer): void {
  const allConnections = getConnections();
  io.emit("connections:batch", allConnections);
}

export function emitTrafficFlows(io: TypedSocketServer): void {
  const allConnections = getConnections();
  const flows = generateTrafficFlows(allConnections);
  io.emit("traffic:flows", flows);
}

export function emitStatisticsUpdate(io: TypedSocketServer): void {
  const allConnections = getConnections();
  const stats = generateStatistics(allConnections);
  io.emit("statistics:update", stats);
}

export function emitError(io: TypedSocketServer, message: string, code?: string): void {
  io.emit("error", { message, code });
}

// Simulate random connection events for demo purposes
export function startDemoMode(io: TypedSocketServer, intervalMs = 5000): NodeJS.Timeout {
  return setInterval(() => {
    const action = Math.random();

    if (action < 0.4) {
      // 40% chance: add new connection
      addConnection(io);
    } else if (action < 0.7) {
      // 30% chance: update random connection
      const allConnections = getConnections();
      if (allConnections.length > 0) {
        const randomConn = allConnections[Math.floor(Math.random() * allConnections.length)]!;
        const statuses: Connection["status"][] = ["active", "inactive"];
        updateConnection(io, randomConn.id, {
          status: statuses[Math.floor(Math.random() * statuses.length)],
          bandwidth: Math.floor(Math.random() * 100000),
          bytesIn: (randomConn.bytesIn ?? 0) + Math.floor(Math.random() * 10000),
          bytesOut: (randomConn.bytesOut ?? 0) + Math.floor(Math.random() * 10000),
        });
      }
    } else if (action < 0.85) {
      // 15% chance: remove connection (keep at least 10)
      const allConnections = getConnections();
      if (allConnections.length > 10) {
        const randomConn = allConnections[Math.floor(Math.random() * allConnections.length)]!;
        removeConnection(io, randomConn.id);
      }
    }
    // 15% chance: do nothing

    // Always emit traffic flows
    emitTrafficFlows(io);
  }, intervalMs);
}

export function stopDemoMode(timer: NodeJS.Timeout): void {
  clearInterval(timer);
}
