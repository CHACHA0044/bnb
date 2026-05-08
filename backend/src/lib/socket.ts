import { Server as SocketIOServer } from "socket.io";

export interface SharedCartItem {
  id: string; // generated client side: e.g. `${item.id}-${item.forPacking}-${item.variant}`
  name: string;
  price: number;
  quantity: number;
  forPacking: boolean;
  variant?: string;
  addedBy: string; // clientId
  addedByName: string; // "User X"
}

export interface TableCart {
  items: SharedCartItem[];
  users: { clientId: string; friendlyName: string }[];
  isLocked: boolean;
  lockedBy: string | null;
}

const activeCarts: Record<string, TableCart> = {};

let io: SocketIOServer | null = null;

export function getActiveCart(tableId: string): TableCart {
  if (!activeCarts[tableId]) {
    activeCarts[tableId] = { items: [], users: [], isLocked: false, lockedBy: null };
  }
  return activeCarts[tableId];
}

export function clearActiveCart(tableId: string) {
  if (activeCarts[tableId]) {
    activeCarts[tableId].items = [];
    activeCarts[tableId].isLocked = false;
    activeCarts[tableId].lockedBy = null;
  }
}

export function initSocketEvents(instance: SocketIOServer): void {
  io = instance;

  io.on("connection", (socket) => {
    console.log(`[WS] Client connected: ${socket.id}`);

    // CART LOGIC
    socket.on("join_table", ({ tableId, clientId }: { tableId: string, clientId: string }) => {
      if (!tableId || !clientId) return;
      socket.join(`table:${tableId}`);
      
      const cart = getActiveCart(tableId);
      
      // Assign friendly name if new
      let user = cart.users.find(u => u.clientId === clientId);
      if (!user) {
        const nextNum = cart.users.length + 1;
        user = { clientId, friendlyName: nextNum <= 3 ? `User ${nextNum}` : "Viewer" };
        cart.users.push(user);
      }
      
      console.log(`[WS] ${user.friendlyName} (${clientId}) joined table:${tableId}`);
      
      // Send current cart
      socket.emit("cart_sync", cart);
    });

    socket.on("cart_update", ({ tableId, clientId, items }: { tableId: string, clientId: string, items: SharedCartItem[] }) => {
      const cart = getActiveCart(tableId);
      if (cart.isLocked && cart.lockedBy !== clientId) return; // Prevent updates if locked by someone else
      cart.items = items;
      io?.to(`table:${tableId}`).emit("cart_sync", cart);
    });

    socket.on("cart_notify", ({ tableId, message }: { tableId: string, message: string }) => {
      // Broadcast toast to others in the table
      socket.to(`table:${tableId}`).emit("cart_toast", message);
    });

    socket.on("cart_lock", ({ tableId, clientId }: { tableId: string, clientId: string }) => {
      const cart = getActiveCart(tableId);
      cart.isLocked = true;
      cart.lockedBy = clientId;
      io?.to(`table:${tableId}`).emit("cart_sync", cart);
      socket.to(`table:${tableId}`).emit("cart_toast", "Someone is placing the order...");
    });

    socket.on("cart_unlock", ({ tableId }: { tableId: string }) => {
      const cart = getActiveCart(tableId);
      cart.isLocked = false;
      cart.lockedBy = null;
      io?.to(`table:${tableId}`).emit("cart_sync", cart);
    });

    // Session logic (existing)
    socket.on("join_session", (sessionId: string) => {
      socket.join(`session:${sessionId}`);
      console.log(`[WS] ${socket.id} joined session:${sessionId}`);
    });

    socket.on("join_admin", () => {
      socket.join("admin");
      console.log(`[WS] ${socket.id} joined admin`);
    });

    socket.on("send_review_request", ({ sessionId }: { sessionId: string }) => {
      io?.to(`session:${sessionId}`).emit("review_requested", {
        message: "We'd love to hear your feedback! Please rate the items you've enjoyed."
      });
      console.log(`[WS] Review request sent to session:${sessionId}`);
    });

    socket.on("disconnect", () => {
      console.log(`[WS] Client disconnected: ${socket.id}`);
    });
  });
}

export function getIO(): SocketIOServer {
  if (!io) throw new Error("Socket.IO not initialized");
  return io;
}
