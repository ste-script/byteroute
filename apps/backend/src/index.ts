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
 * @module backend/index
 */

import "reflect-metadata";
import express from "express";
import { createServer } from "node:http";
import passport from "passport";
import { Server as SocketIOServer } from "socket.io";
import {
  connectMongo,
  disconnectMongo,
} from "./infrastructure/persistence/mongoose.js";
import { ConnectionModel } from "./infrastructure/persistence/models/connection.model.js";
import {
  type ServerToClientEvents,
  type ClientToServerEvents,
  type InterServerEvents,
  type SocketData,
} from "@byteroute/shared";
import { UserModel } from "./infrastructure/persistence/models/user.model.js";
import {
  type TypedSocketServer,
  loadConnectionsFromDb,
  emitStatisticsUpdateAllTenants,
} from "./services/connections.js";
import { createRoutes } from "./routes/index.js";
import { createSocketController } from "./controllers/socket.controller.js";
import { ensurePassportAuthInitialized } from "./infrastructure/auth/passport.js";
import { createSocketAuthMiddleware } from "./middleware/socket-auth.middleware.js";
import { errorHandler } from "./middleware/error.middleware.js";
import { createAppContext } from "./config/composition-root.js";
import { compileDomainDslAtStartup } from "./infrastructure/dsl/domain-dsl.js";

const app = express();
const server = createServer(app);

// Prevent stalled requests (e.g. body-parser waiting on a bodyless GET with
// Content-Type: application/json) from holding keep-alive connections open
// indefinitely and blocking subsequent requests on the same connection.
server.requestTimeout = 30_000;
const io: TypedSocketServer = new SocketIOServer<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>(server, {
  cors: { origin: true, credentials: true },
});

app.use(express.json({ limit: "2mb" }));
ensurePassportAuthInitialized();
app.use(passport.initialize());
const ctx = createAppContext(io);
const socketController = createSocketController(ctx);
io.use(createSocketAuthMiddleware(ctx));
app.set("io", io);
app.set("trust proxy", true);
// Register routes
app.use(createRoutes(ctx));
app.use(errorHandler);

// Socket.IO connection handler
io.on("connection", (socket) => socketController.handleConnection(io, socket));

const port = Number(process.env.PORT ?? 4000);
let statsEmitTimer: NodeJS.Timeout | undefined;

/**
 * Starts the requested result.
 */

async function start(): Promise<void> {
  const compiledDsl = await compileDomainDslAtStartup();
  if (compiledDsl.sourcePath) {
    console.log(`[DSL] Loaded domain DSL from ${compiledDsl.sourcePath}`);
  } else {
    console.log("[DSL] No domain DSL file found. Using defaults.");
  }

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
  console.log(
    `Periodic statistics emission enabled (interval: ${statsEmitIntervalMs}ms)`,
  );

  server.listen(port, () => {
    console.log(`@byteroute/backend listening on :${port}`);
  });
}

/**
 * Shutdowns the requested result.
 * @param signal - The signal input.
 */

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
