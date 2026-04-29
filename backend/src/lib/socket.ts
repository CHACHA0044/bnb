import { Server as SocketIOServer } from "socket.io";

/**
 * Holds the Socket.IO server instance.
 * Set by index.ts after server creation, used by route handlers to emit events.
 */
let io: SocketIOServer | null = null;

export function setIO(instance: SocketIOServer): void {
  io = instance;
}

export function getIO(): SocketIOServer {
  if (!io) throw new Error("Socket.IO not initialized");
  return io;
}
