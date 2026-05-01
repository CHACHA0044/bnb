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
  paymentReminder: boolean;
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
  isServed: boolean;
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
export function placeOrder(sessionId: string, items: { name: string; price: number; quantity: number; type?: string }[], isTakeaway: boolean = false, tableId?: string) {
  return apiFetch<OrderData>("/api/order", {
    method: "POST",
    body: JSON.stringify({ sessionId, items, isTakeaway, tableId }),
  });
}

/** Create a payment */
export function createPayment(sessionId: string, method: "UPI" | "CASH", amount: number, orderId?: string) {
  return apiFetch<PaymentData>("/api/payment", {
    method: "POST",
    body: JSON.stringify({ sessionId, method, amount, orderId }),
  });
}

/** Admin: Verify secret */
export function adminVerifySecret(secret: string) {
  return apiFetch<{ success: boolean }>("/api/admin/verify", { adminSecret: secret });
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

export function adminDeletePayment(paymentId: string, secret: string) {
  return apiFetch(`/api/payment/${paymentId}`, {
    method: "DELETE",
    adminSecret: secret,
  });
}

export function adminToggleReminder(sessionId: string, reminder: boolean, secret: string) {
  return apiFetch(`/api/table/session/${sessionId}/reminder`, {
    method: "PATCH",
    body: JSON.stringify({ reminder }),
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
export function adminAddOrder(sessionId: string | null, items: { name: string; price: number; quantity: number; type?: string }[], secret: string, isTakeaway: boolean = false, tableId?: string) {
  const path = sessionId ? `/api/admin/sessions/${sessionId}/order` : "/api/admin/orders/new";
  return apiFetch<OrderData>(path, {
    method: "POST",
    body: JSON.stringify({ items, isTakeaway, tableId }),
    adminSecret: secret,
  });
}

/** Admin: Record a confirmed payment directly */
export function adminRecordPayment(sessionId: string, amount: number, method: string, secret: string) {
  return apiFetch("/api/admin/payments/record", {
    method: "POST",
    body: JSON.stringify({ sessionId, amount, method }),
    adminSecret: secret,
  });
}

/* ─── Menu Management ────────────────────────── */

/** Fetch public menu */
export function fetchMenu() {
  return apiFetch<{ categories: string[]; items: any[] }>("/api/menu");
}

export interface OrderMenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  image?: string;
  descriptionEn?: string;
  outOfStock?: boolean;
  outOfStockVariants?: string[];
  variants?: string[];
  variantPrices?: Record<string, number>;
  rating?: number;
}

/** Admin: Fetch full menu for editing */
export function adminFetchFullMenu(secret: string) {
  return apiFetch<{ categories: { id: string; name: string; items: OrderMenuItem[] }[] }>("/api/menu/admin/full", { adminSecret: secret });
}

/** Admin: Create menu item */
export function adminCreateMenuItem(data: any, secret: string) {
  return apiFetch("/api/menu/admin/items", {
    method: "POST",
    body: JSON.stringify(data),
    adminSecret: secret,
  });
}

/** Admin: Update menu item */
export function adminUpdateMenuItem(id: string, data: any, secret: string) {
  return apiFetch(`/api/menu/admin/items/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
    adminSecret: secret,
  });
}

/** Admin: Delete menu item */
export function adminDeleteMenuItem(id: string, secret: string) {
  return apiFetch(`/api/menu/admin/items/${id}`, {
    method: "DELETE",
    adminSecret: secret,
  });
}

/** Admin: Toggle stock */
export function adminToggleStock(id: string, outOfStock: boolean, until: string | null, secret: string) {
  return apiFetch(`/api/menu/admin/items/${id}/stock`, {
    method: "PATCH",
    body: JSON.stringify({ outOfStock, until }),
    adminSecret: secret,
  });
}

/** Admin: Bulk stock update */
export function adminBulkUpdateStock(updates: { id: string; outOfStock: boolean }[], secret: string) {
  return apiFetch("/api/menu/admin/items/bulk-stock", {
    method: "PATCH",
    body: JSON.stringify({ updates }),
    adminSecret: secret,
  });
}

/** Admin: Create category */
export function adminCreateCategory(name: string, sortOrder: number, secret: string) {
  return apiFetch("/api/menu/admin/categories", {
    method: "POST",
    body: JSON.stringify({ name, sortOrder }),
    adminSecret: secret,
  });
}

/** Admin: Update category */
export function adminUpdateCategory(id: string, data: any, secret: string) {
  return apiFetch(`/api/menu/admin/categories/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
    adminSecret: secret,
  });
}

/** Admin: Delete category */
export function adminDeleteCategory(id: string, secret: string) {
  return apiFetch(`/api/menu/admin/categories/${id}`, {
    method: "DELETE",
    adminSecret: secret,
  });
}

/** Admin: Bulk discount */
export function adminBulkDiscount(categoryId: string, discount: { discountPct?: number, discountFlat?: number, clear?: boolean }, secret: string) {
  return apiFetch("/api/menu/admin/discount/bulk", {
    method: "POST",
    body: JSON.stringify({ categoryId, ...discount }),
    adminSecret: secret,
  });
}

/** Admin: Fetch versions */
export function adminFetchMenuVersions(secret: string) {
  return apiFetch<any[]>("/api/menu/admin/versions", { adminSecret: secret });
}

/** Admin: Rollback menu */
export function adminRollbackMenu(versionId: string, secret: string) {
  return apiFetch(`/api/menu/admin/versions/${versionId}/rollback`, {
    method: "POST",
    adminSecret: secret,
  });
}

/** Admin: Toggle item served status */
export function adminToggleItemServed(itemId: string, isServed: boolean, secret: string) {
  return apiFetch(`/api/order/item/${itemId}/served`, {
    method: "PATCH",
    body: JSON.stringify({ isServed }),
    adminSecret: secret,
  });
}

/** Admin: Bulk toggle items served status for an order */
export function adminToggleOrderItems(orderId: string, isServed: boolean, secret: string) {
  return apiFetch(`/api/order/${orderId}/items/served`, {
    method: "PATCH",
    body: JSON.stringify({ isServed }),
    adminSecret: secret,
  });
}

/** Submit rating for a menu item */
export function submitRating(itemId: string, rating: number) {
  return apiFetch("/api/menu/rate", {
    method: "POST",
    body: JSON.stringify({ itemId, rating }),
  });
}
