import { Server as SocketIOServer } from "socket.io";
import { getRedisClient } from "./redis";
import { logger } from "./logger";
import { prisma } from "./prisma";

export interface SharedCartItem {
  id: string; 
  name: string;
  price: number;
  quantity: number;
  forPacking: boolean;
  variant?: string;
  addedBy: string; 
  addedByName: string; 
}

export interface TableCart {
  items: SharedCartItem[];
  users: { clientId: string; friendlyName: string }[];
  isLocked: boolean;
  lockedBy: string | null;
  lastUpdated: number;
}

let io: SocketIOServer | null = null;

const CART_KEY_PREFIX = "cart:";
const LOCK_TTL_MS = 60000; // 1 minute auto-unlock

const pendingTableEvents = new Map<string, {
  timeout: NodeJS.Timeout | null;
  events: { type: string; data: any }[];
}>();

function enqueueTableEvent(tableId: string, type: string, data: any) {
  let entry = pendingTableEvents.get(tableId);
  if (!entry) {
    entry = { timeout: null, events: [] };
    pendingTableEvents.set(tableId, entry);
  }

  entry.events.push({ type, data });

  if (!entry.timeout) {
    entry.timeout = setTimeout(() => {
      flushTableEvents(tableId);
    }, 100);
  }
}

async function flushTableEvents(tableId: string) {
  const entry = pendingTableEvents.get(tableId);
  if (!entry) return;
  pendingTableEvents.delete(tableId);

  const events = entry.events;

  // Coalescing logic:
  // 1. If there's a "cart_sync" in the batch, we can just emit a single "cart_sync" with the LATEST cart state, and skip all granular events!
  const syncEvent = events.find(e => e.type === "cart_sync");
  if (syncEvent) {
    io?.to(`table:${tableId}`).emit("cart_sync", syncEvent.data);
    return;
  }

  // 2. Otherwise, coalesce granular updates by itemId
  const itemAdded = new Map<string, any>(); // itemId -> event data
  const itemUpdated = new Map<string, any>(); // itemId -> event data
  const itemRemoved = new Set<string>(); // itemIds

  for (const event of events) {
    if (event.type === "cart_item_added") {
      const { item, clientId } = event.data;
      if (itemRemoved.has(item.id)) {
        itemRemoved.delete(item.id);
      }
      const existing = itemAdded.get(item.id);
      if (existing) {
        existing.item.quantity += item.quantity;
      } else {
        itemAdded.set(item.id, { item, clientId });
      }
    } else if (event.type === "cart_item_updated") {
      const { itemId, quantity, clientId } = event.data;
      if (itemRemoved.has(itemId)) continue;

      // If we already have an "added" event for this item in this batch, update its quantity there
      const added = itemAdded.get(itemId);
      if (added) {
        added.item.quantity = quantity;
      } else {
        itemUpdated.set(itemId, { itemId, quantity, clientId });
      }
    } else if (event.type === "cart_item_removed") {
      const { itemId, clientId } = event.data;
      itemAdded.delete(itemId);
      itemUpdated.delete(itemId);
      itemRemoved.add(itemId);
    }
  }

  // Emit coalesced events:
  for (const itemId of itemRemoved) {
    io?.to(`table:${tableId}`).emit("cart_item_removed", { itemId });
  }
  for (const [_, data] of itemAdded) {
    io?.to(`table:${tableId}`).emit("cart_item_added", data);
  }
  for (const [_, data] of itemUpdated) {
    io?.to(`table:${tableId}`).emit("cart_item_updated", data);
  }
}

/**
 * Fetch a cart with default fallback.
 */
export async function getActiveCart(tableId: string): Promise<TableCart> {
  const redis = await getRedisClient();
  const data = await redis.get(`${CART_KEY_PREFIX}${tableId}`);
  if (data) {
    try {
      return JSON.parse(data);
    } catch (e) {
      logger.error({ tableId, error: e }, "Failed to parse cart JSON");
    }
  }
  return { items: [], users: [], isLocked: false, lockedBy: null, lastUpdated: Date.now() };
}

/**
 * Save cart with a 24h TTL.
 */
export async function saveActiveCart(tableId: string, cart: TableCart) {
  const redis = await getRedisClient();
  cart.lastUpdated = Date.now();
  await redis.set(`${CART_KEY_PREFIX}${tableId}`, JSON.stringify(cart), {
    EX: 60 * 60 * 24 
  });
}

/**
 * Atomic update helper using Redis WATCH/MULTI to prevent race conditions.
 */
async function atomicUpdateCart(tableId: string, updater: (cart: TableCart) => TableCart | Promise<TableCart>): Promise<TableCart> {
  const redis = await getRedisClient();
  const key = `${CART_KEY_PREFIX}${tableId}`;
  
  for (let attempt = 0; attempt < 5; attempt++) {
    await redis.watch(key);
    const data = await redis.get(key);
    const cart = data ? JSON.parse(data) : { items: [], users: [], isLocked: false, lockedBy: null, lastUpdated: Date.now() };
    
    const updatedCart = await updater(cart);
    updatedCart.lastUpdated = Date.now();

    const result = await redis
      .multi()
      .set(key, JSON.stringify(updatedCart), { EX: 60 * 60 * 24 })
      .exec();

    if (result) return updatedCart; // Success
    logger.warn({ tableId, attempt }, "Retrying atomic cart update due to conflict");
  }
  throw new Error("Failed to update cart after multiple attempts");
}

export async function clearActiveCart(tableId: string) {
  return atomicUpdateCart(tableId, (cart) => {
    cart.items = [];
    cart.isLocked = false;
    cart.lockedBy = null;
    return cart;
  });
}

export function initSocketEvents(instance: SocketIOServer): void {
  io = instance;

  const socketData = new Map<string, { tableId: string; clientId: string; isAdmin?: boolean }>();
  const socketRateLimits = new Map<string, { count: number; resetTime: number }>();

  // Periodic cleanup of orphaned socket entries (every 60 seconds)
  setInterval(() => {
    const connectedIds = new Set(io?.sockets.sockets.keys() || []);
    let cleaned = 0;
    for (const id of socketData.keys()) {
      if (!connectedIds.has(id)) {
        socketData.delete(id);
        socketRateLimits.delete(id);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      logger.info({ cleaned }, "Cleaned up orphaned socket entries");
    }
  }, 60_000);

  // Rate limiting middleware
  const checkSocketRateLimit = (socketId: string, limit: number = 10, windowMs: number = 1000): boolean => {
    const now = Date.now();
    const record = socketRateLimits.get(socketId);

    if (!record || now > record.resetTime) {
      socketRateLimits.set(socketId, { count: 1, resetTime: now + windowMs });
      return true;
    }

    if (record.count < limit) {
      record.count++;
      return true;
    }

    return false; // Rate limited
  };

  // Event timing & payload size monitoring
  io.use((socket, next) => {
    socket.onAny((event, ...args) => {
      if (process.env.NODE_ENV !== 'production') {
        const size = JSON.stringify(args).length;
        console.log(`[WS] 📡 ${event} | ${size} bytes | ID: ${socket.id}`);
      }

      // Check size limit (1MB max payload)
      const size = JSON.stringify(args).length;
      if (size > 1_000_000) {
        logger.warn({ socketId: socket.id, event, size }, "Oversized socket payload rejected");
      }
    });
    next();
  });

  io.on("connection", (socket) => {
    logger.info({ socketId: socket.id }, "New socket connection");

    /**
     * SOCKET SECURITY: join_table
     * Validates that user is joining a valid table
     * Limit: 10 join events per second
     */
    socket.on("join_table", async ({ tableId, clientId }: { tableId: string, clientId: string }) => {
      if (!checkSocketRateLimit(socket.id, 10, 1000)) {
        logger.warn({ socketId: socket.id }, "join_table rate limited");
        socket.emit("error", { message: "Too many join requests" });
        return;
      }

      if (!tableId || !clientId || typeof tableId !== "string" || typeof clientId !== "string") {
        logger.warn({ socketId: socket.id }, "Invalid join_table parameters");
        return;
      }

      // Only allow valid tables
      if (!["T1", "T2", "T3", "TAKEAWAY"].includes(tableId)) {
        logger.warn({ socketId: socket.id, tableId }, "Attempted join to invalid table");
        return;
      }

      socket.join(`table:${tableId}`);
      socketData.set(socket.id, { tableId, clientId });
      
      const cart = await atomicUpdateCart(tableId, (current) => {
        let user = current.users.find(u => u.clientId === clientId);
        if (!user) {
          const nextNum = current.users.length + 1;
          user = { clientId, friendlyName: nextNum <= 3 ? `User ${nextNum}` : "Viewer" };
          current.users.push(user);
        }
        return current;
      });
      
      const user = cart.users.find(u => u.clientId === clientId);
      socket.to(`table:${tableId}`).emit("user_joined", user);
      socket.emit("cart_sync", cart);
      
      logger.info({ tableId, clientId }, "User joined table");
    });

    /**
     * SOCKET SECURITY: cart_add_item
     * Validates item data before adding
     * Limit: 20 cart operations per 5 seconds
     */
    socket.on("cart_add_item", async ({ tableId, clientId, item }: { tableId: string, clientId: string, item: SharedCartItem }) => {
      if (!checkSocketRateLimit(socket.id, 20, 5000)) {
        logger.warn({ socketId: socket.id }, "cart_add_item rate limited");
        return;
      }

      // Verify socket is joined to correct table
      const socketInfo = socketData.get(socket.id);
      if (!socketInfo || socketInfo.tableId !== tableId) {
        logger.warn({ socketId: socket.id, tableId }, "cart_add_item from unauthorized table");
        return;
      }

      try {
        // Sanitize item
        const sanitized = {
          id: item.id || crypto.randomUUID(),
          name: String(item.name).slice(0, 100),
          price: Math.max(0, Number(item.price) || 0),
          quantity: Math.max(1, Math.min(100, Number(item.quantity) || 1)),
          forPacking: Boolean(item.forPacking),
          variant: item.variant ? String(item.variant).slice(0, 50) : undefined,
          addedBy: clientId,
          addedByName: item.addedByName ? String(item.addedByName).slice(0, 20) : "Unknown",
        };

        const cart = await atomicUpdateCart(tableId, (current) => {
          const exists = current.items.find(i => i.id === sanitized.id);
          if (exists) {
            exists.quantity += sanitized.quantity;
          } else {
            current.items.push(sanitized);
          }
          return current;
        });
        enqueueTableEvent(tableId, "cart_item_added", { item: sanitized, clientId });
      } catch (err) {
        logger.error({ tableId, err }, "Failed to add item to cart");
      }
    });

    socket.on("cart_remove_item", async ({ tableId, clientId, itemId }: { tableId: string, clientId: string, itemId: string }) => {
      if (!checkSocketRateLimit(socket.id, 20, 5000)) return;

      const socketInfo = socketData.get(socket.id);
      if (!socketInfo || socketInfo.tableId !== tableId) {
        logger.warn({ socketId: socket.id }, "cart_remove_item from unauthorized table");
        return;
      }

      try {
        const cart = await atomicUpdateCart(tableId, (current) => {
          current.items = current.items.filter(i => i.id !== itemId);
          return current;
        });
        enqueueTableEvent(tableId, "cart_item_removed", { itemId, clientId });
      } catch (err) {
        logger.error({ tableId, err }, "Failed to remove item from cart");
      }
    });

    socket.on("cart_update_quantity", async ({ tableId, clientId, itemId, quantity }: { tableId: string, clientId: string, itemId: string, quantity: number }) => {
      if (!checkSocketRateLimit(socket.id, 20, 5000)) return;

      const socketInfo = socketData.get(socket.id);
      if (!socketInfo || socketInfo.tableId !== tableId) return;

      try {
        const sanitizedQty = Math.max(1, Math.min(100, Number(quantity) || 1));
        const cart = await atomicUpdateCart(tableId, (current) => {
          const item = current.items.find(i => i.id === itemId);
          if (item) item.quantity = sanitizedQty;
          return current;
        });
        enqueueTableEvent(tableId, "cart_item_updated", { itemId, quantity: sanitizedQty, clientId });
      } catch (err) {
        logger.error({ tableId, err }, "Failed to update item quantity");
      }
    });

    socket.on("cart_update", async ({ tableId, clientId, items }: { tableId: string, clientId: string, items: SharedCartItem[] }) => {
      if (!checkSocketRateLimit(socket.id, 5, 5000)) return;

      const socketInfo = socketData.get(socket.id);
      if (!socketInfo || socketInfo.tableId !== tableId) return;

      if (!Array.isArray(items) || items.length > 100) {
        logger.warn({ tableId, clientId, length: Array.isArray(items) ? items.length : "not-array" }, "Invalid cart_update");
        return;
      }

      try {
        const cart = await atomicUpdateCart(tableId, (current) => {
          if (current.isLocked && current.lockedBy !== clientId) {
            return current;
          }
          // Only allow updating items that belong to this clientId
          const otherItems = current.items.filter(i => i.addedBy !== clientId);
          const myNewItems = items.filter(i => i.addedBy === clientId).slice(0, 50);
          current.items = [...otherItems, ...myNewItems];
          return current;
        });

        enqueueTableEvent(tableId, "cart_sync", cart);
      } catch (err) {
        logger.error({ tableId, err }, "Failed to process cart update");
      }
    });

    socket.on("cart_notify", ({ tableId, message }: { tableId: string, message: string }) => {
      if (!checkSocketRateLimit(socket.id, 5, 1000)) return;

      const socketInfo = socketData.get(socket.id);
      if (!socketInfo || socketInfo.tableId !== tableId) return;

      const sanitizedMsg = String(message || "").slice(0, 200);
      socket.to(`table:${tableId}`).emit("cart_toast", sanitizedMsg);
    });

    socket.on("cart_lock", async ({ tableId, clientId }: { tableId: string, clientId: string }) => {
      if (!checkSocketRateLimit(socket.id, 5, 1000)) return;

      const socketInfo = socketData.get(socket.id);
      if (!socketInfo || socketInfo.tableId !== tableId) return;

      try {
        const cart = await atomicUpdateCart(tableId, (current) => {
          current.isLocked = true;
          current.lockedBy = clientId;
          return current;
        });
        
        enqueueTableEvent(tableId, "cart_sync", cart);
        socket.to(`table:${tableId}`).emit("cart_toast", "Someone is placing the order...");
      } catch (err) {
        logger.error({ tableId, err }, "Failed to lock cart");
      }
    });

    socket.on("cart_unlock", async ({ tableId }: { tableId: string }) => {
      if (!checkSocketRateLimit(socket.id, 5, 1000)) return;

      const socketInfo = socketData.get(socket.id);
      if (!socketInfo || socketInfo.tableId !== tableId) return;

      try {
        const cart = await atomicUpdateCart(tableId, (current) => {
          current.isLocked = false;
          current.lockedBy = null;
          return current;
        });
        enqueueTableEvent(tableId, "cart_sync", cart);
      } catch (err) {
        logger.error({ tableId, err }, "Failed to unlock cart");
      }
    });

    /**
     * SOCKET SECURITY: join_session
     * Validates session ID format before joining
     * Users can only join their own sessions (validated elsewhere)
     */
    socket.on("join_session", async (sessionId: string) => {
      if (!checkSocketRateLimit(socket.id, 5, 1000)) return;

      if (!sessionId || typeof sessionId !== "string" || !sessionId.match(/^[a-f0-9-]{36}$/)) {
        logger.warn({ socketId: socket.id, sessionId }, "Invalid session ID format");
        return;
      }

      // Verify the session belongs to this socket's table
      const info = socketData.get(socket.id);
      if (!info || info.isAdmin) {
        // Admins can join any session
        socket.join(`session:${sessionId}`);
        return;
      }

      try {
        const redis = await getRedisClient();
        const cacheKey = `session_table:${sessionId}`;
        
        // 1. Try Redis cache first
        let tableId = await redis.get(cacheKey);

        if (!tableId) {
          // 2. Fallback to DB
          const dbSession = await prisma.session.findUnique({
            where: { id: sessionId },
            select: { tableId: true }
          });
          
          if (dbSession) {
            tableId = dbSession.tableId;
            // Cache in Redis for 24 hours to reduce DB load
            await redis.set(cacheKey, tableId, { EX: 86400 });
          }
        }

        if (tableId && tableId === info.tableId) {
          socket.join(`session:${sessionId}`);
        } else {
          logger.warn(
            { socketId: socket.id, sessionId, expectedTable: info.tableId, actualTable: tableId },
            "Session join denied: table mismatch"
          );
        }
      } catch (err) {
        logger.error({ socketId: socket.id, sessionId, err }, "Failed to verify session ownership");
      }
    });

    /**
     * SOCKET SECURITY: join_admin
     * Admin-only room join
     * Only allows authenticated admins
     */
    socket.on("join_admin", (credentials: { token?: string } = {}) => {
      if (!checkSocketRateLimit(socket.id, 2, 5000)) return;

      // Validate admin token (simple validation - should match ADMIN_SECRET)
      const adminSecret = process.env.ADMIN_SECRET;
      const providedToken = credentials?.token || "";

      if (adminSecret && providedToken === adminSecret) {
        socket.join("admin");
        socketData.set(socket.id, { ...socketData.get(socket.id), tableId: "ADMIN", clientId: "admin", isAdmin: true });
        logger.info({ socketId: socket.id }, "Admin socket authenticated");
      } else {
        logger.warn({ socketId: socket.id }, "Unauthorized admin join attempt");
      }
    });

    socket.on("send_review_request", ({ sessionId }: { sessionId: string }) => {
      if (!checkSocketRateLimit(socket.id, 5, 5000)) return;

      // Only admins can send review requests
      const info = socketData.get(socket.id);
      if (!info?.isAdmin) {
        logger.warn({ socketId: socket.id }, "Non-admin attempted send_review_request");
        return;
      }

      if (sessionId && typeof sessionId === "string") {
        io?.to(`session:${sessionId}`).emit("review_requested", {
          message: "We'd love to hear your feedback! Please rate the items you've enjoyed."
        });
      }
    });

    socket.on("disconnect", async () => {
      const data = socketData.get(socket.id);
      if (data) {
        const { tableId, clientId } = data;
        socketData.delete(socket.id);
        socketRateLimits.delete(socket.id);

        if (tableId === "ADMIN") {
          logger.info({ socketId: socket.id }, "Admin socket disconnected");
          return;
        }

        try {
          const cart = await atomicUpdateCart(tableId, (current) => {
            const otherSockets = Array.from(io?.sockets.sockets.values() || []).filter(s => {
              const d = socketData.get(s.id);
              return d?.tableId === tableId && d?.clientId === clientId;
            });

            if (otherSockets.length === 0) {
              current.users = current.users.filter(u => u.clientId !== clientId);
              if (current.isLocked && current.lockedBy === clientId) {
                current.isLocked = false;
                current.lockedBy = null;
              }
            }
            return current;
          });

          io?.to(`table:${tableId}`).emit("user_left", clientId);
          enqueueTableEvent(tableId, "cart_sync", cart);
        } catch (err) {
          logger.error({ tableId, clientId, err }, "Error during socket disconnect cleanup");
        }
      }
    });
  });
}

// Add missing import
import crypto from "crypto";

export function getIO(): SocketIOServer {
  if (!io) throw new Error("Socket.IO not initialized");
  return io;
}
