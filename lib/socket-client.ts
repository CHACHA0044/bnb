"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { io, Socket } from "socket.io-client";

const getApiUrl = () => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
  if (typeof window !== "undefined") {
    const { hostname } = window.location;
    if (hostname !== "localhost" && envUrl.includes("localhost")) {
      return envUrl.replace("localhost", hostname);
    }
  }
  return envUrl;
};
const API_URL = getApiUrl();

/**
 * React hook for Socket.IO connection with automatic reconnect
 * and polling fallback.
 */
export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const s = io(API_URL, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    s.on("connect", () => {
      console.log("[WS] Connected:", s.id);
      setConnected(true);
    });

    s.on("disconnect", () => {
      console.log("[WS] Disconnected");
      setConnected(false);
    });

    s.on("connect_error", (err) => {
      console.warn("[WS] Connection error:", err.message);
    });

    setSocket(s);

    return () => {
      s.disconnect();
      setSocket(null);
    };
  }, []);

  const joinSession = useCallback((sessionId: string) => {
    socket?.emit("join_session", sessionId);
  }, [socket]);

  const joinAdmin = useCallback(() => {
    socket?.emit("join_admin");
  }, [socket]);

  const on = useCallback((event: string, handler: (...args: unknown[]) => void) => {
    if (!socket) return () => {};
    socket.on(event, handler);
    return () => { socket.off(event, handler); };
  }, [socket]);

  return { socket, connected, joinSession, joinAdmin, on };
}
