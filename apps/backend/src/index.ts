import "reflect-metadata";
import express from "express";
import { createServer } from "node:http";
import { Server as SocketIOServer } from "socket.io";
import {
  connectMongo,
  disconnectMongo,
  UserModel,
  type ServerToClientEvents,
  type ClientToServerEvents,
  type InterServerEvents,
  type SocketData,
} from "@byteroute/shared";
import { type TypedSocketServer, startDemoMode, stopDemoMode } from "./services/connections.js";
import routes from "./routes/index.js";
import { handleConnection } from "./controllers/socket.controller.js";

const app = express();
const server = createServer(app);
const io: TypedSocketServer = new SocketIOServer<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>(server, {
  cors: { origin: true }
});

// Register routes
app.use(routes);

// Socket.IO connection handler
io.on("connection", (socket) => handleConnection(io, socket));

const port = Number(process.env.PORT ?? 4000);
const demoMode = process.env.DEMO_MODE !== "false"; // Enable demo mode by default
let demoTimer: NodeJS.Timeout | undefined;

async function start(): Promise<void> {
  await connectMongo();
  await UserModel.init();

  // Start demo mode if enabled
  if (demoMode) {
    const intervalMs = Number(process.env.DEMO_INTERVAL ?? 5000);
    demoTimer = startDemoMode(io, intervalMs);
    console.log(`Demo mode enabled (interval: ${intervalMs}ms)`);
  }

  server.listen(port, () => {
    console.log(`@byteroute/backend listening on :${port}`);
  });
}

async function shutdown(signal: string): Promise<void> {
  console.log(`Shutting down (${signal})...`);

  // Stop demo mode
  if (demoTimer) {
    stopDemoMode(demoTimer);
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
