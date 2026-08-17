export type AnalyticsOrder = { created_at: string; order_status: string };
export type AnalyticsWishlistSave = { created_at: string; product_id?: string; products?: { id: string; name: string; price: number | string; images?: string[] } | Array<{ id: string; name: string; price: number | string; images?: string[] }> | null };
export type AnalyticsRestockRequest = { created_at: string; requested_at?: string; sent_at?: string | null; status: string; product_id: string; profile_id?: string | null; products?: { id: string; name: string; price: number | string; images?: string[]; category_id?: string; categories?: { id: string; name: string; slug: string } | Array<{ id: string; name: string; slug: string }> | null } | Array<{ id: string; name: string; price: number | string; images?: string[]; category_id?: string; categories?: { id: string; name: string; slug: string } | Array<{ id: string; name: string; slug: string }> | null }> | null };
export type AnalyticsOrderItem = { product_id: string; orders?: { user_id?: string | null; created_at: string; order_status: string } | Array<{ user_id?: string | null; created_at: string; order_status: string }> | null };
export type RestockFailureType = "provider" | "invalid_recipient" | "temporary" | "unknown";

export function classifyRestockFailure(error: string): RestockFailureType {
  const normalized = error.toLowerCase();
  if (normalized.includes("invalid") || normalized.includes("recipient") || normalized.includes("mailbox") || normalized.includes("422") || normalized.includes("400")) return "invalid_recipient";
  if (normalized.includes("timeout") || normalized.includes("429") || normalized.includes("500") || normalized.includes("502") || normalized.includes("503")) return "temporary";
  if (normalized.includes("bounce") || normalized.includes("undelivered") || normalized.includes("resend")) return "provider";
  return "unknown";
}

export function filterAnalyticsByDateRange<T extends { created_at: string }>(rows: T[], from?: string, to?: string) {
  const fromMs = from ? new Date(`${from}T00:00:00.000Z`).getTime() : Number.NEGATIVE_INFINITY;
  const toMs = to ? new Date(`${to}T23:59:59.999Z`).getTime() : Number.POSITIVE_INFINITY;
  return rows.filter(row => { const time = new Date(row.created_at).getTime(); return time >= fromMs && time <= toMs; });
}

function monthKey(dateString: string) {
  const date = new Date(dateString);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function lastSixMonths(now = new Date()) {
  const result: string[] = [];
  const cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  for (let index = 5; index >= 0; index -= 1) {
    const month = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() - index, 1));
    result.push(`${month.getUTCFullYear()}-${String(month.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return result;
}

function relatedOrder(item: AnalyticsOrderItem) {
  return Array.isArray(item.orders) ? item.orders[0] : item.orders;
}

function productFor(request: AnalyticsRestockRequest) {
  return Array.isArray(request.products) ? request.products[0] : request.products;
}

function requestConverted(request: AnalyticsRestockRequest, orderItems: AnalyticsOrderItem[], attributionDays: number) {
  if (request.status !== "sent" || !request.sent_at || !request.profile_id) return false;
  const sentAt = new Date(request.sent_at).getTime();
  return orderItems.some(item => {
    if (item.product_id !== request.product_id) return false;
    const order = relatedOrder(item);
    const orderTime = new Date(order?.created_at ?? "").getTime();
    return Boolean(order && order.user_id === request.profile_id && order.order_status !== "cancelled" && orderTime >= sentAt && orderTime <= sentAt + attributionDays * 24 * 60 * 60 * 1000);
  });
}

export function buildRestockAttributionComparison(requests: AnalyticsRestockRequest[], orderItems: AnalyticsOrderItem[]) {
  return [1, 7, 14, 30].map(days => { const sent = requests.filter(request => request.status === "sent"); const converted = sent.filter(request => requestConverted(request, orderItems, days)).length; return { days, label: `${days} day${days === 1 ? "" : "s"}`, sentAlerts: sent.length, convertedAlerts: converted, conversionRate: sent.length ? Number(((converted / sent.length) * 100).toFixed(1)) : 0 }; });
}

export function buildRestockAnalytics(requests: AnalyticsRestockRequest[], orderItems: AnalyticsOrderItem[], now = new Date(), attributionDays = 7) {
  const months = lastSixMonths(now);
  const monthly = months.map(month => {
    const rows = requests.filter(request => monthKey(request.created_at) === month);
    const sent = rows.filter(request => request.status === "sent");
    const converted = sent.filter(request => requestConverted(request, orderItems, attributionDays)).length;
    return { month, label: new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }), alertSignups: rows.length, sentAlerts: sent.length, cancelledAlerts: rows.filter(request => request.status === "cancelled").length, convertedAlerts: converted, conversionRate: sent.length ? Number(((converted / sent.length) * 100).toFixed(1)) : 0 };
  });
  const sentAlerts = requests.filter(request => request.status === "sent");
  const convertedAlerts = sentAlerts.filter(request => requestConverted(request, orderItems, attributionDays)).length;
  const productMap = new Map<string, { id: string; name: string; signups: number; sent: number; converted: number }>();
  requests.forEach(request => { const product = productFor(request); const current = productMap.get(request.product_id) ?? { id: request.product_id, name: product?.name ?? "Unknown product", signups: 0, sent: 0, converted: 0 }; current.signups += 1; if (request.status === "sent") current.sent += 1; if (requestConverted(request, orderItems, attributionDays)) current.converted += 1; productMap.set(request.product_id, current); });
  return { monthly, attributionDays, totalAlertSignups: requests.length, sentAlerts: sentAlerts.length, cancelledAlerts: requests.filter(request => request.status === "cancelled").length, convertedAlerts, conversionRate: sentAlerts.length ? Number(((convertedAlerts / sentAlerts.length) * 100).toFixed(1)) : 0, topRestockProducts: Array.from(productMap.values()).sort((a, b) => b.signups - a.signups || b.converted - a.converted || a.name.localeCompare(b.name)).slice(0, 8) };
}

export function buildAdminAnalytics(orders: AnalyticsOrder[], wishlistSaves: AnalyticsWishlistSave[], now = new Date()) {
  const months = lastSixMonths(now);
  const monthly = months.map(month => {
    const monthOrders = orders.filter(order => monthKey(order.created_at) === month);
    const completed = monthOrders.filter(order => ["confirmed", "shipped", "delivered"].includes(order.order_status)).length;
    return { month, label: new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }), orders: monthOrders.length, completedOrders: completed, conversionRate: monthOrders.length ? Number(((completed / monthOrders.length) * 100).toFixed(1)) : 0, wishlistSaves: wishlistSaves.filter(save => monthKey(save.created_at) === month).length };
  });
  const totalOrders = orders.length;
  const completedOrders = orders.filter(order => ["confirmed", "shipped", "delivered"].includes(order.order_status)).length;
  const savedProducts = new Map<string, { id: string; name: string; price: number; imageUrl: string; saves: number }>();
  wishlistSaves.forEach(save => { const product = Array.isArray(save.products) ? save.products[0] : save.products; if (!product) return; const current = savedProducts.get(product.id) ?? { id: product.id, name: product.name, price: Number(product.price), imageUrl: product.images?.[0] ?? "", saves: 0 }; current.saves += 1; savedProducts.set(product.id, current); });
  return { monthly, topSavedProducts: Array.from(savedProducts.values()).sort((a, b) => b.saves - a.saves || a.name.localeCompare(b.name)).slice(0, 5), totalOrders, completedOrders, conversionRate: totalOrders ? Number(((completedOrders / totalOrders) * 100).toFixed(1)) : 0, totalWishlistSaves: wishlistSaves.length };
}
