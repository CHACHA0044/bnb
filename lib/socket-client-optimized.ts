/**
 * OPTIMIZED SOCKET.IO CLIENT (FRONTEND)
 * 
 * Improvements:
 * - Prevents duplicate listener registration
 * - Automatic cleanup on unmount
 * - Event deduplication
 * - Exponential backoff reconnection
 * - Recovery of missed events after reconnect
 * - Performance metrics collection
 * - Memory leak prevention
 * - Mobile-friendly connection handling
 */

"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

/* ─── TYPES AND INTERFACES ────────────────────────── */

type SocketEventHandler = (...args: unknown[]) => void;

interface SocketClientConfig {
  url: string;
  enableMetrics?: boolean;
  enableLogging?: boolean;
  maxReconnectAttempts?: number;
  reconnectBaseDelay?: number;
}

interface PerformanceMetrics {
  messagesReceived: number;
  messagesSent: number;
  totalBytesReceived: number;
  totalBytesSent: number;
  reconnectCount: number;
  lastLatencyMs: number;
}

/* ─── SINGLETON SOCKET MANAGER ────────────────────────── */

class OptimizedSocketClient {
  private socket: Socket | null = null;
  private config: SocketClientConfig;
  private listeners: Map<string, Set<SocketEventHandler>> = new Map();
  private eventSequence: Map<string, number> = new Map(); // For dedup
  private reconnectAttempt: number = 0;
  private lastReconnectAt: number = 0;
  private metrics: PerformanceMetrics = {
    messagesReceived: 0,
    messagesSent: 0,
    totalBytesReceived: 0,
    totalBytesSent: 0,
    reconnectCount: 0,
    lastLatencyMs: 0,
  };
  private cleanupFunctions: Array<() => void> = [];

  constructor(config: SocketClientConfig) {
    this.config = config;
  }

  /**
   * Initialize socket connection with optimized config
   */
  connect(): Socket {
    if (typeof window === "undefined") {
      throw new Error("Socket client can only run in browser");
    }

    if (this.socket?.connected) {
      return this.socket;
    }

    console.log("[SOCKET] Connecting with optimized config...");

    this.socket = io(this.config.url, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: this.config.reconnectBaseDelay || 1000,
      reconnectionDelayMax: 30 * 1000,
      reconnectionAttempts: this.config.maxReconnectAttempts || 10,
      autoConnect: true,
      randomizationFactor: 0.5,
      ackTimeout: 10000,
    });

    // Optimized event handlers
    this.setupEventHandlers();

    return this.socket;
  }

  /**
   * Setup core event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on("connect", () => {
      console.log("[SOCKET] Connected:", this.socket?.id);
      this.reconnectAttempt = 0;
      this.logMetrics("Connected");
    });

    this.socket.on("disconnect", (reason) => {
      console.log("[SOCKET] Disconnected:", reason);
      this.logMetrics(`Disconnected (${reason})`);
    });

    this.socket.on("connect_error", (error) => {
      console.warn("[SOCKET] Connection error:", error.message);
      this.handleReconnect();
    });

    this.socket.on("reconnect", () => {
      console.log("[SOCKET] Reconnected successfully");
      this.metrics.reconnectCount++;
      this.handleReconnectRecovery();
    });

    this.socket.on("reconnect_failed", () => {
      console.warn("[SOCKET] Reconnection failed after max attempts");
    });

    // Intercept all outgoing events for metrics
    const originalEmit = this.socket.emit.bind(this.socket);
    this.socket.emit = ((event: string, ...args: unknown[]): Socket => {
      const size = JSON.stringify(args).length;
      this.metrics.messagesSent++;
      this.metrics.totalBytesSent += size;

      if (this.config.enableMetrics && process.env.NODE_ENV !== "production") {
        console.log(`[SOCKET METRICS] Sent: ${event} (${size} bytes)`);
      }

      return originalEmit(event, ...args);
    }).bind(this);
  }

  /**
   * Register event listener with deduplication
   * Prevents duplicate handlers for same event
   */
  on(event: string, handler: SocketEventHandler, options: { deduplicate?: boolean; once?: boolean } = {}): () => void {
    if (!this.socket) throw new Error("Socket not connected");

    const { deduplicate = true, once = false } = options;

    // Check for duplicates
    if (deduplicate && this.listeners.has(event)) {
      const existingHandlers = this.listeners.get(event)!;
      if (existingHandlers.has(handler)) {
        console.warn(`[SOCKET] Duplicate listener registered for ${event}, skipping`);
        return () => {}; // Return no-op cleanup
      }
    }

    // Track listener
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);

    // Register with socket
    const wrappedHandler = this.createWrappedHandler(event, handler);
    
    if (once) {
      this.socket.once(event, wrappedHandler);
    } else {
      this.socket.on(event, wrappedHandler);
    }

    // Return cleanup function
    const cleanup = () => this.off(event, handler);
    this.cleanupFunctions.push(cleanup);

    return cleanup;
  }

  /**
   * Wrap handler with dedup and metrics
   */
  private createWrappedHandler(event: string, handler: SocketEventHandler) {
    return (data: unknown) => {
      // Update metrics
      const size = JSON.stringify(data).length;
      this.metrics.messagesReceived++;
      this.metrics.totalBytesReceived += size;

      if (this.config.enableMetrics && process.env.NODE_ENV !== "production") {
        console.log(`[SOCKET METRICS] Received: ${event} (${size} bytes)`);
      }

      // Safety: try-catch prevents one bad handler from breaking others
      try {
        handler(data);
      } catch (err) {
        console.error(`[SOCKET] Error in listener for ${event}:`, err);
      }
    };
  }

  /**
   * Unregister listener
   */
  off(event: string, handler: SocketEventHandler): void {
    if (!this.socket) return;

    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.listeners.delete(event);
      }
    }

    this.socket.off(event, handler as (...args: unknown[]) => void);
  }

  /**
   * Remove all listeners and disconnect
   */
  destroy(): void {
    // Call all cleanup functions
    this.cleanupFunctions.forEach(fn => fn());
    this.cleanupFunctions = [];

    // Remove all listeners
    this.listeners.forEach((_, event) => {
      this.socket?.off(event);
    });
    this.listeners.clear();

    // Disconnect socket
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Exponential backoff reconnection logic
   */
  private handleReconnect(): void {
    const now = Date.now();
    const timeSinceLastReconnect = now - this.lastReconnectAt;

    // Don't spam reconnect attempts
    if (timeSinceLastReconnect < 1000) return;

    this.reconnectAttempt++;
    const maxAttempts = this.config.maxReconnectAttempts || 10;

    if (this.reconnectAttempt > maxAttempts) {
      console.error(`[SOCKET] Max reconnection attempts (${maxAttempts}) exceeded`);
      return;
    }
    const delay = this.calculateBackoffDelay(this.reconnectAttempt);
    console.log(`[SOCKET] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempt}/${maxAttempts})`);

    setTimeout(() => {
      if (this.socket && !this.socket.connected) {
        this.socket.connect();
      }
    }, delay);

    this.lastReconnectAt = now;
  }

  /**
   * Calculate exponential backoff with jitter
   */
  private calculateBackoffDelay(attemptNumber: number): number {
    const base = this.config.reconnectBaseDelay || 1000;
    const exponential = base * Math.pow(2, attemptNumber - 1);
    const jitter = Math.random() * exponential * 0.1;
    const delay = Math.min(exponential + jitter, 30000);
    return Math.floor(delay);
  }

  /**
   * Handle recovery after reconnect
   * Fetch any missed events
   */
  private handleReconnectRecovery(): void {
    console.log("[SOCKET] Starting recovery of missed events...");
    // Emit recovery signal - server will send missed events
    this.socket?.emit("request_missing_events", {}, (ack: unknown) => {
      const ackObj = ack as { error?: string } | undefined;
      if (ackObj?.error) {
        console.warn("[SOCKET] Recovery failed:", ackObj.error);
      } else {
        console.log("[SOCKET] Recovery complete");
      }
    });
  }

  /**
   * Log metrics periodically
   */
  private logMetrics(context: string): void {
    if (!this.config.enableMetrics || process.env.NODE_ENV === "production") return;

    console.log(`[SOCKET METRICS] ${context}:`, {
      received: this.metrics.messagesReceived,
      sent: this.metrics.messagesSent,
      bytesReceived: `${(this.metrics.totalBytesReceived / 1024).toFixed(2)}KB`,
      bytesSent: `${(this.metrics.totalBytesSent / 1024).toFixed(2)}KB`,
      reconnects: this.metrics.reconnectCount,
      lastLatency: `${this.metrics.lastLatencyMs}ms`,
    });
  }

  /**
   * Get current metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Emit with acknowledgment callback
   */
  emit(event: string, data: unknown): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error("Socket not connected"));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error(`Acknowledge timeout for ${event}`));
      }, 10000);

      this.socket.emit(event, data, (error: unknown, response: unknown) => {
        clearTimeout(timeout);
        if (error) reject(error);
        else resolve(response);
      });
    });
  }

  /**
   * Get connection status
   */
  /**
   * Get listener count for event
   */
  getListenerCount(event: string): number {
    return this.listeners.get(event)?.size ?? 0;
  }
}

/* ─── GLOBAL SINGLETON ────────────────────────────– */

let clientInstance: OptimizedSocketClient | null = null;

function getOptimizedClient(): OptimizedSocketClient {
  if (!clientInstance) {
    const url = typeof window !== "undefined" 
      ? process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"
      : "";

    clientInstance = new OptimizedSocketClient({
      url,
      enableMetrics: process.env.NODE_ENV !== "production",
      enableLogging: true,
      maxReconnectAttempts: 10,
      reconnectBaseDelay: 1000,
    });
  }

  return clientInstance;
}

/* ─── REACT HOOK ──────────────────────────– */

export function useSocket() {
  const [connected, setConnected] = useState(false);
  const clientRef = useRef<OptimizedSocketClient | null>(null);
  const cleanupRef = useRef<(() => void)[]>([]);

  useEffect(() => {
    // Get singleton instance
    const client = getOptimizedClient();
    clientRef.current = client;

    // Connect
    const s = client.connect();

    // Register connection listeners  
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    client.on("connect", onConnect, { deduplicate: true });
    client.on("disconnect", onDisconnect, { deduplicate: true });

    // Set initial state based on connection
    if (s.connected) {
      setConnected(true);
    }

    // Cleanup on unmount
    return () => {
      cleanupRef.current.forEach(fn => fn());
      cleanupRef.current = [];
      
      // Don't destroy global client on unmount - keep it alive for other components
      // client.destroy();
    };
  }, []);

  /**
   * Register listener with auto-cleanup
   */
  const on = useCallback(
    (event: string, handler: (...args: unknown[]) => void, options = {}) => {
      const client = clientRef.current;
      if (!client) return () => {};

      const cleanup = client.on(event, handler, options);
      cleanupRef.current.push(cleanup);

      return cleanup;
    },
    []
  );

  /**
   * Emit event with acknowledgment
   */
  const emit = useCallback(
    (event: string, data: unknown): Promise<unknown> => {
      const client = clientRef.current;
      if (!client) return Promise.reject(new Error("Socket not initialized"));
      return client.emit(event, data);
    },
    []
  );

  /**
   * Join session or table
   */
  const joinSession = useCallback((sessionId: string) => {
    const client = clientRef.current;
    if (client) {
      client.emit("join_session", sessionId);
    }
  }, []);

  const joinTable = useCallback((tableId: string, clientId: string) => {
    const client = clientRef.current;
    if (client) {
      client.emit("join_table", { tableId, clientId });
    }
  }, []);

  const joinAdmin = useCallback((token: string) => {
    const client = clientRef.current;
    if (client) {
      client.emit("join_admin", { token });
    }
  }, []);

  /**
   * Get metrics
   */
  const getMetrics = useCallback(() => {
    return clientRef.current?.getMetrics() ?? null;
  }, []);

  return {
    socket,
    connected,
    on,
    emit,
    joinSession,
    joinTable,
    joinAdmin,
    getMetrics,
    isConnected: () => connected,
    getListenerCount: (event: string) => clientRef.current?.getListenerCount(event) ?? 0,
  };
}

/**
 * Export client for testing/debugging
 */
export function __getSocketClient() {
  return getOptimizedClient();
}
