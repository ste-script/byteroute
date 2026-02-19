import "reflect-metadata";
import express from "express";
import { createServer } from "node:http";
import passport from "passport";
import { Server as SocketIOServer } from "socket.io";
import {
  connectMongo,
  disconnectMongo,
  ConnectionModel,
  UserModel,
  type ServerToClientEvents,
  type ClientToServerEvents,
  type InterServerEvents,
  type SocketData,
} from "@byteroute/shared";
import {
  type TypedSocketServer,
  loadConnectionsFromDb,
  emitStatisticsUpdateAllTenants,
} from "./services/connections.js";
import routes from "./routes/index.js";
import { handleConnection } from "./controllers/socket.controller.js";
import { ensurePassportAuthInitialized } from "./auth/passport.js";
import { socketAuthMiddleware } from "./middleware/socket-auth.middleware.js";

const app = express();
const server = createServer(app);
const io: TypedSocketServer = new SocketIOServer<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>(server, {
  cors: { origin: true, credentials: true }
});

app.use(express.json({ limit: "2mb" }));
ensurePassportAuthInitialized();
app.use(passport.initialize());
io.use(socketAuthMiddleware);
app.set("io", io);

// Register routes
app.use(routes);

// Socket.IO connection handler
io.on("connection", (socket) => handleConnection(io, socket));

const port = Number(process.env.PORT ?? 4000);
let statsEmitTimer: NodeJS.Timeout | undefined;

async function start(): Promise<void> {
  await connectMongo();
  await UserModel.init();
  await ConnectionModel.init();

  try {
    const limit = Number(process.env.CONNECTIONS_BOOTSTRAP_LIMIT ?? 500);
    const loaded = await loadConnectionsFromDb(limit);
    console.log(`Loaded ${loaded} connections from Mongo`);
  } catch (err) {
    console.warn("Failed to load connections from Mongo (continuing):", err);
  }

  // Emit statistics periodically to keep dashboard updated
  const statsEmitIntervalMs = Number(process.env.STATS_EMIT_INTERVAL ?? 30000); // 30 seconds default
  statsEmitTimer = setInterval(() => {
    emitStatisticsUpdateAllTenants(io);
  }, statsEmitIntervalMs);
  console.log(`Periodic statistics emission enabled (interval: ${statsEmitIntervalMs}ms)`);

  server.listen(port, () => {
    console.log(`@byteroute/backend listening on :${port}`);
  });
}

async function shutdown(signal: string): Promise<void> {
  console.log(`Shutting down (${signal})...`);

  // Stop periodic statistics emission
  if (statsEmitTimer) {
    clearInterval(statsEmitTimer);
  }

  io.close();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await disconnectMongo();
}

process.on("SIGINT", () => {
  void shutdown("SIGINT").finally(() => process.exit(0));
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM").finally(() => process.exit(0));
});

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
