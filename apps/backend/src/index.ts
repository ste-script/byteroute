import "reflect-metadata";
import express from "express";
import { createServer } from "node:http";
import { Server as SocketIOServer } from "socket.io";
import { connectMongo, disconnectMongo, mongoReadyState, UserModel } from "@byteroute/shared";

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: true }
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, mongo: { readyState: mongoReadyState() } });
});

io.on("connection", (socket) => {
  socket.emit("hello", { ok: true });
});

const port = Number(process.env.PORT ?? 3000);

async function start(): Promise<void> {
  await connectMongo();
  await UserModel.init();

  server.listen(port, () => {
    console.log(`@byteroute/backend listening on :${port}`);
  });
}

async function shutdown(signal: string): Promise<void> {
  console.log(`Shutting down (${signal})...`);

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
