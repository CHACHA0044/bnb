/**
 * API client — all backend calls go through NEXT_PUBLIC_API_URL.
 * 
 * SECURITY:
 * - Adds CSRF token to state-changing requests
 * - Adds idempotency keys to prevent duplicate payment/order submissions
 * - Never sends sensitive data like price overrides to backend
 * - Validates all responses from backend
 */

import { v4 as uuidv4 } from "uuid";

const getApiUrl = () => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl) return envUrl;

  if (typeof window !== "undefined") {
    const { hostname, protocol } = window.location;
    if (hostname !== "localhost") {
      return `${protocol}//${hostname}:5001`;
    }
  }
  return "http://localhost:5001";
};

const API_URL = getApiUrl();
import { type OrderMenuItem } from "./menu";
export type { OrderMenuItem };

// CSRF token management
let csrfToken: string | null = null;
let currentSessionId: string | null = null;

export function getCSRFToken(): string {
  return csrfToken || "";
}

export function setCSRFToken(token: string, sessionId: string): void {
  csrfToken = token;
  currentSessionId = sessionId;
}

// Idempotency key generation
function generateIdempotencyKey(): string {
  return `${Date.now()}-${uuidv4()}`;
}

interface FetchOptions extends RequestInit {
  adminSecret?: string;
  skipCSRF?: boolean;
  skipIdempotency?: boolean;
}

export async function apiFetch<T = unknown>(path: string, options: FetchOptions = {}): Promise<T> {
  const { adminSecret, skipCSRF = false, skipIdempotency = false, headers: customHeaders, ...rest } = options;

  const headers: Record<string, string> = {
    ...(customHeaders as Record<string, string>),
  };

  if (!(rest.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (adminSecret) {
    headers["Authorization"] = `Bearer ${adminSecret}`;
  }

  // Add CSRF token for POST/PATCH/PUT/DELETE on payment/order routes
  if (!skipCSRF && ["POST", "PATCH", "PUT", "DELETE"].includes(rest.method || "GET")) {
    if ((path.includes("/payment") || path.includes("/order")) && csrfToken) {
      headers["x-csrf-token"] = csrfToken;
    }
  }

  // Add idempotency key for payment and order placement (idempotent operations)
  if (!skipIdempotency && (path === "/api/payment" || path === "/api/order")) {
    headers["idempotency-key"] = generateIdempotencyKey();
  }

  let res: Response | null = null;
  let errorToThrow: any = null;
  const attempts = 3;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      res = await fetch(`${API_URL}${path}`, { headers, ...rest });
      break;
    } catch (err) {
      errorToThrow = err;
      const isGet = !rest.method || rest.method.toUpperCase() === "GET";
      if (attempt === attempts || !isGet) {
        throw err;
      }
      // Wait 1 second before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  if (!res!.ok) {
    const body = await res!.json().catch(() => ({ error: res!.statusText }));
    throw new Error(body.error || `API ${res!.status}`);
  }

  return res!.json();
}

/* ─── Typed helpers ─────────────────────── */

export interface SessionData {
  id: string;
  sessionNumber?: number;
  tableId: string;
  status: string;
  paymentReminder: boolean;
  reviewRequested: boolean;
  locationVerified: boolean;
  deviceFingerprint?: string;
  createdAt: string;
  updatedAt: string;
  feedback?: string;
  orders: OrderData[];
  payments: PaymentData[];
}

export interface OrderData {
  id: string;
  sessionId: string;
  status: string;
  isTakeaway: boolean;
  packingCharges: number;
  createdAt: string;
  estimatedReadyTime?: string;
  instructions?: string;
  customerPhone?: string;
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

/* ─── Request Locking ─────────────────── */
const activeRequests = new Set<string>();

function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  if (activeRequests.has(key)) {
    throw new Error("Request already in progress");
  }
  activeRequests.add(key);
  return fn().finally(() => activeRequests.delete(key));
}

/** Fetch or create session for a table */
export async function fetchSession(tableId: string, sessionId?: string) {
  const query = sessionId ? `?sessionId=${sessionId}` : "";
  const data = await apiFetch<SessionData & { csrfToken?: string }>(`/api/table/${tableId}${query}`);
  if (data.csrfToken) {
    setCSRFToken(data.csrfToken, data.id);
  }
  return data;
}

/** Place an order
 * 
 * CRITICAL SECURITY:
 * - Frontend sends ONLY: sessionId, menuItemIds, quantities
 * - Frontend does NOT send: prices, totals, packing charges
 * - Backend calculates everything and returns breakdown
 */
export function placeOrder(
  sessionId: string, 
  items: { id: string; quantity: number }[], // id refers to menuItemId, NOT a local cart item
  isTakeaway: boolean = false, 
  tableId?: string, 
  instructions?: string, 
  customerPhone?: string
) {
  // Transform: convert frontend item format to backend format
  const backendItems = items.map(item => ({
    menuItemId: item.id,
    quantity: item.quantity,
  }));

  return withLock(`order-${sessionId}`, () => 
    apiFetch<{ order: OrderData, session: SessionData, breakdown: any }>("/api/order", {
      method: "POST",
      body: JSON.stringify({ 
        sessionId: sessionId || undefined, 
        items: backendItems, // ONLY menuItemId and quantity
        isTakeaway, 
        tableId, 
        instructions, 
        customerPhone 
      }),
    })
  );
}

/** Fetch public order configuration
 * 
 * SECURITY: NO longer returns UPI ID
 * UPI configuration is backend-only and not exposed to frontend
 */
export function fetchOrderConfig() {
  // This endpoint is deprecated for security reasons
  // UPI ID is never sent to frontend
  // If you need UPI config, it's generated server-side during payment
  return Promise.resolve({ upiId: "" }); // Return empty UPI ID
}

/** Create a payment
 * 
 * CRITICAL SECURITY:
 * - Frontend does NOT send amount
 * - Backend calculates amount from orders
 * - Frontend only sends: sessionId, method (UPI|CASH)
 */
export function createPayment(sessionId: string, method: "UPI" | "CASH", orderId?: string, customerPhone?: string) {
  // NOTE: amount is NOT sent by frontend
  // Backend will calculate the correct amount from session orders
  
  return withLock(`payment-${sessionId}`, () =>
    apiFetch<PaymentData>("/api/payment", {
      method: "POST",
      body: JSON.stringify({ 
        sessionId, 
        method,
        // NO amount field — backend calculates this
        orderId, 
        customerPhone 
      }),
    })
  );
}

/** Admin: Verify secret */
export function adminVerifySecret(secret: string) {
  return apiFetch<{ success: boolean }>("/api/admin/verify", { adminSecret: secret });
}

/** Admin: Create new session and order */
export function adminCreateSession(secret: string, data: { tableId: string; items: any[]; isTakeaway: boolean }) {
  return apiFetch<OrderData>("/api/admin/orders/new", {
    method: "POST",
    adminSecret: secret,
    body: JSON.stringify(data),
  });
}

/** Admin: Add manual order to existing session */
export function adminAddManualOrder(secret: string, sessionId: string, data: { items: any[]; isTakeaway: boolean }) {
  return apiFetch<OrderData>(`/api/admin/sessions/${sessionId}/order`, {
    method: "POST",
    adminSecret: secret,
    body: JSON.stringify(data),
  });
}

/** Admin: Record payment directly */
export function adminRecordPayment(secret: string, sessionId: string, method: "CASH" | "UPI", amount: number) {
  return apiFetch<PaymentData>("/api/admin/payments/record", {
    method: "POST",
    adminSecret: secret,
    body: JSON.stringify({ sessionId, method, amount }),
  });
}

/** Admin: Toggle item served status */
export function adminToggleItemServed(secret: string, itemId: string, isServed: boolean) {
  return apiFetch<OrderItemData>(`/api/order/item/${itemId}/served`, {
    method: "PATCH",
    adminSecret: secret,
    body: JSON.stringify({ isServed }),
  });
}

/** Admin: Bulk toggle order items served status */
export function adminToggleOrderItemsServed(secret: string, orderId: string, isServed: boolean) {
  return apiFetch<{ success: boolean; count: number }>(`/api/order/${orderId}/items/served`, {
    method: "PATCH",
    adminSecret: secret,
    body: JSON.stringify({ isServed }),
  });
}

/** Fetch all sessions for admin dashboard */
export function adminFetchSessions(secret: string, from?: string, to?: string) {
  let query = "";
  if (from) query += `?from=${from}`;
  if (to) query += (query ? "&" : "?") + `to=${to}`;
  return apiFetch<SessionData[]>(`/api/admin/sessions${query}`, { adminSecret: secret });
}

/** Admin: Close a session */
export function adminCloseSession(sessionId: string, secret: string) {
  return apiFetch<SessionData>(`/api/admin/sessions/${sessionId}/close`, {
    method: "PATCH",
    adminSecret: secret,
  });
}

/** Admin: Delete an order */
export function adminDeleteOrder(orderId: string, secret: string) {
  return apiFetch<{ success: boolean }>(`/api/order/${orderId}`, {
    method: "DELETE",
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

/** Admin: Delete/Reject a payment */
export function adminDeletePayment(paymentId: string, secret: string) {
  return apiFetch(`/api/payment/${paymentId}`, {
    method: "DELETE",
    adminSecret: secret,
  });
}

/** Admin: Toggle payment reminder */
export function adminToggleReminder(sessionId: string, reminder: boolean, secret: string) {
  return apiFetch(`/api/table/session/${sessionId}/reminder`, {
    method: "PATCH",
    body: JSON.stringify({ reminder }),
    adminSecret: secret,
  });
}

/** Admin: Toggle review request */
export function adminToggleReviewRequest(sessionId: string, requested: boolean, secret: string) {
  return apiFetch(`/api/table/session/${sessionId}/review-request`, {
    method: "PATCH",
    body: JSON.stringify({ requested }),
    adminSecret: secret,
  });
}

/** Public: Dismiss review request (from client side) */
export function dismissReviewRequest(sessionId: string) {
  return apiFetch(`/api/table/session/${sessionId}/review-dismiss`, {
    method: "PATCH",
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

/** Admin: Update preparation timer */
export function adminUpdateOrderTimer(orderId: string, minutes: number | null, secret: string) {
  return apiFetch<OrderData>(`/api/order/${orderId}/timer`, {
    method: "PATCH",
    body: JSON.stringify({ minutes }),
    adminSecret: secret,
  });
}

/** Admin: Legacy Add Manual Order (keeping for compat if needed, but redirects to newer version) */
export function adminAddOrder(sessionId: string | null, items: { name: string; price: number; quantity: number; type?: string }[], secret: string, isTakeaway: boolean = false, tableId?: string) {
  const path = sessionId ? `/api/admin/sessions/${sessionId}/order` : "/api/admin/orders/new";
  return apiFetch<OrderData>(path, {
    method: "POST",
    body: JSON.stringify({ items, isTakeaway, tableId }),
    adminSecret: secret,
  });
}

/* ─── Menu Management ────────────────────────── */

/** Fetch public menu */
export function fetchMenu() {
  // Removed aggressive cache busting ?t=... 
  // Let browser caching or SWR handle it
  return apiFetch<{ categories: string[]; items: any[] }>("/api/menu");
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

/** Admin: Upload and optimize image */
export function adminUploadImage(file: File, itemName: string, secret: string) {
  const formData = new FormData();
  formData.append("image", file);
  formData.append("itemName", itemName);

  return apiFetch<{ success: boolean; path: string; filename: string }>("/api/menu/admin/upload", {
    method: "POST",
    body: formData as any,
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

/** Submit rating for a menu item */
export function submitRating(itemId: string, rating: number, sessionId?: string, orderId?: string) {
  return apiFetch("/api/menu/rate", {
    method: "POST",
    body: JSON.stringify({ itemId, rating, sessionId, orderId }),
  });
}

export interface RestaurantStatusData {
  isOpen: boolean;
  closingAt: string | null;
}

/** Get restaurant status */
export function fetchRestaurantStatus() {
  return apiFetch<RestaurantStatusData>("/api/status");
}

/** Admin: Open restaurant */
export function adminOpenRestaurant(secret: string) {
  return apiFetch<RestaurantStatusData>("/api/status/admin/open", {
    method: "POST",
    adminSecret: secret,
  });
}

/** Admin: Start close countdown */
export function adminCloseRestaurant(secret: string) {
  return apiFetch<RestaurantStatusData>("/api/status/admin/close", {
    method: "POST",
    adminSecret: secret,
  });
}

/** Admin: Force close restaurant */
export function adminForceCloseRestaurant(secret: string) {
  return apiFetch<RestaurantStatusData>("/api/status/admin/force-close", {
    method: "POST",
    adminSecret: secret,
  });
}

/* ─── QR Token Management ────────────────────── */

/** Admin: Generate a QR token for a table/takeaway */
export function generateQrToken(tableId: string, secret: string) {
  return apiFetch<{ token: string; expiresAt: string; url: string }>("/api/qr/generate", {
    method: "POST",
    body: JSON.stringify({ tableId }),
    adminSecret: secret,
  });
}

/** Public: Validate a QR token */
export function validateQrToken(tableId: string, token: string) {
  return apiFetch<{ valid: boolean }>("/api/qr/validate", {
    method: "POST",
    body: JSON.stringify({ tableId, token }),
  });
}

/* ─── Location Verification ──────────────────── */

/** Public: Verify user location */
export function verifyLocation(latitude: number, longitude: number, sessionId?: string) {
  return apiFetch<{ verified: boolean; distance: number }>("/api/location/verify", {
    method: "POST",
    body: JSON.stringify({ latitude, longitude, sessionId }),
  });
}

/* ─── Reports ────────────────────────────────── */

/** Admin: Get daily report summary */
export function adminFetchReportSummary(date: string, secret: string, from?: string, to?: string) {
  let query = `?date=${date}`;
  if (from) query += `&from=${from}`;
  if (to) query += `&to=${to}`;
  return apiFetch<{ 
    date: string; 
    totalRevenue: number; 
    totalOrders: number; 
    totalItems: number; 
    upiRevenue: number; 
    cashRevenue: number;
    logs: Array<{
      id: string;
      tableId: string;
      type: string;
      itemSummary: string;
      foodTotal: number;
      packingTotal: number;
      amount: number;
      upiPaid: number | null;
      cashPaid: number | null;
      paymentStatus: string;
      createdAt: string;
      payTime?: string;
    }>;
  }>(
    `/api/admin/reports/summary${query}`, { adminSecret: secret }
  );
}

/** Admin: Regenerate daily report */
export function adminRegenerateReport(date: string, secret: string) {
  return apiFetch<{ success: boolean; date: string; filename: string }>(
    `/api/admin/reports/daily/regenerate?date=${date}`, { method: "POST", adminSecret: secret }
  );
}

/** Admin: Get analytics data */
export function adminFetchAnalyticsData(from: string, to: string, secret: string) {
  return apiFetch<{
    summary: {
      totalRevenue: number;
      totalOrders: number;
      totalItems: number;
      avgOrderValue: number;
      upiRevenue: number;
      cashRevenue: number;
      packingRevenue: number;
      dineInRevenue: number;
      takeawayRevenue: number;
    };
    dailyRevenue: Array<{
      date: string;
      revenue: number;
      upi: number;
      cash: number;
      orderCount: number;
    }>;
    hourlyPattern: Array<{
      hour: number;
      label: string;
      orderCount: number;
      revenue: number;
    }>;
    weekdayPattern: Array<{
      day: string;
      orderCount: number;
      revenue: number;
      avgOrder: number;
    }>;
    topItems: Array<{
      name: string;
      quantity: number;
      revenue: number;
    }>;
    tablePerformance: Array<{
      tableId: string;
      orderCount: number;
      revenue: number;
      avgOrder: number;
    }>;
    insights: Array<{
      type: string;
      icon: string;
      text: string;
    }>;
    empty?: boolean;
    message?: string;
  }>(`/api/admin/analytics?from=${from}&to=${to}`, { adminSecret: secret });
}

/** Admin: Fetch paginated order history snapshots */
export function adminFetchHistory(secret: string, page: number = 1, limit: number = 50, from?: string, to?: string) {
  let query = `?page=${page}&limit=${limit}`;
  if (from) query += `&from=${from}`;
  if (to) query += `&to=${to}`;
  return apiFetch<{
    history: any[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
  }>(`/api/admin/history${query}`, { adminSecret: secret });
}

/** Submit general feedback for a session */
export function submitFeedback(sessionId: string, feedback: string) {
  return apiFetch<{ success: boolean }>("/api/menu/feedback", {
    method: "POST",
    body: JSON.stringify({ sessionId, feedback }),
  });
}

