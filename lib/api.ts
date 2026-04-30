/**
 * API client — all backend calls go through NEXT_PUBLIC_API_URL.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface FetchOptions extends RequestInit {
  adminSecret?: string;
}

export async function apiFetch<T = unknown>(path: string, options: FetchOptions = {}): Promise<T> {
  const { adminSecret, headers: customHeaders, ...rest } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(customHeaders as Record<string, string>),
  };

  if (adminSecret) {
    headers["Authorization"] = `Bearer ${adminSecret}`;
  }

  const res = await fetch(`${API_URL}${path}`, { headers, ...rest });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `API ${res.status}`);
  }

  return res.json();
}

/* ─── Typed helpers ─────────────────────── */

export interface SessionData {
  id: string;
  tableId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  orders: OrderData[];
  payments: PaymentData[];
}

export interface OrderData {
  id: string;
  sessionId: string;
  status: string;
  isTakeaway: boolean;
  createdAt: string;
  items: OrderItemData[];
}

export interface OrderItemData {
  id: string;
  name: string;
  price: number;
  quantity: number;
  type: "DINE_IN" | "TAKEAWAY";
}

export interface PaymentData {
  id: string;
  sessionId: string;
  orderId?: string | null;
  method: string;
  amount: number;
  status: string;
  createdAt: string;
}

/** Fetch or create session for a table */
export function fetchSession(tableId: string) {
  return apiFetch<SessionData>(`/api/table/${tableId}`);
}

/** Place an order */
export function placeOrder(sessionId: string, items: { name: string; price: number; quantity: number; type?: string }[], isTakeaway: boolean = false) {
  return apiFetch<OrderData>("/api/order", {
    method: "POST",
    body: JSON.stringify({ sessionId, items, isTakeaway }),
  });
}

/** Create a payment */
export function createPayment(sessionId: string, method: "UPI" | "CASH", amount: number, orderId?: string) {
  return apiFetch<PaymentData>("/api/payment", {
    method: "POST",
    body: JSON.stringify({ sessionId, method, amount, orderId }),
  });
}

/** Admin: Fetch all sessions */
export function adminFetchSessions(secret: string) {
  return apiFetch<SessionData[]>("/api/admin/sessions", { adminSecret: secret });
}

/** Admin: Close a session */
export function adminCloseSession(sessionId: string, secret: string) {
  return apiFetch<SessionData>(`/api/admin/sessions/${sessionId}/close`, {
    method: "PATCH",
    adminSecret: secret,
  });
}

/** Admin: Confirm a payment */
export function adminConfirmPayment(paymentId: string, secret: string) {
  return apiFetch<PaymentData>(`/api/payment/${paymentId}/confirm`, {
    method: "PATCH",
    adminSecret: secret,
  });
}

/** Admin: Update order status */
export function adminUpdateOrder(orderId: string, status: string, secret: string) {
  return apiFetch<OrderData>(`/api/order/${orderId}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
    adminSecret: secret,
  });
}

/** Admin: Add manual order */
export function adminAddOrder(sessionId: string, items: { name: string; price: number; quantity: number; type?: string }[], secret: string, isTakeaway: boolean = false) {
  return apiFetch<OrderData>(`/api/admin/sessions/${sessionId}/order`, {
    method: "POST",
    body: JSON.stringify({ items, isTakeaway }),
    adminSecret: secret,
  });
}
