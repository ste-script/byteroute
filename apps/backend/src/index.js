import express from "express";
import { createServer } from "node:http";
import { Server as SocketIOServer } from "socket.io";

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: true }
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

io.on("connection", (socket) => {
  socket.emit("hello", { ok: true });
});

const port = Number(process.env.PORT ?? 3000);
server.listen(port, () => {
  console.log(`@byteroute/backend listening on :${port}`);
});
