"use client";

import { useEffect, useCallback, useState } from "react";
import { io, Socket } from "socket.io-client";

const getApiUrl = () => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
  if (typeof window !== "undefined") {
    const { hostname } = window.location;
    if (hostname !== "localhost" && envUrl.includes("localhost")) {
      return envUrl.replace("localhost", hostname);
    }
  }
  return envUrl;
};
const API_URL = getApiUrl();

// Singleton socket instance
let sharedSocket: Socket | null = null;

const getSocket = () => {
  if (typeof window === "undefined") return null;
  if (!sharedSocket) {
    console.log("[WS] Initializing shared socket instance...");
    sharedSocket = io(API_URL, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      autoConnect: true,
    });

    sharedSocket.on("connect", () => console.log("[WS] Connected:", sharedSocket?.id));
    sharedSocket.on("disconnect", (reason) => console.log("[WS] Disconnected:", reason));
    sharedSocket.on("connect_error", (err) => console.warn("[WS] Connection error:", err.message));
  }
  return sharedSocket;
};

export function useSocket() {
  const [connected, setConnected] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const s = getSocket();
    if (!s) return;

    setSocket(s);
    setConnected(s.connected);

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);

    return () => {
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
    };
  }, []);

  const joinSession = useCallback((sessionId: string) => {
    const s = getSocket();
    s?.emit("join_session", sessionId);
  }, []);

  const joinAdmin = useCallback((token: string) => {
    const s = getSocket();
    s?.emit("join_admin", { token });
  }, []);

  const on = useCallback((event: string, handler: (...args: any[]) => void) => {
    const s = getSocket();
    if (!s) return () => {};
    s.on(event, handler);
    return () => { s.off(event, handler); };
  }, []);

  const emit = useCallback((event: string, data: any): Promise<any> => {
    const s = getSocket();
    if (!s) return Promise.reject(new Error("Socket not initialized"));
    return new Promise((resolve) => {
      s.emit(event, data, resolve);
    });
  }, []);

  return { socket: socket || getSocket(), connected, joinSession, joinAdmin, on, emit };
}
