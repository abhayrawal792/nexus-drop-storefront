export type AnalyticsOrder = { created_at: string; order_status: string };
export type AnalyticsWishlistSave = { created_at: string };

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

export function buildAdminAnalytics(orders: AnalyticsOrder[], wishlistSaves: AnalyticsWishlistSave[], now = new Date()) {
  const months = lastSixMonths(now);
  const monthly = months.map(month => {
    const monthOrders = orders.filter(order => monthKey(order.created_at) === month);
    const completed = monthOrders.filter(order => ["confirmed", "shipped", "delivered"].includes(order.order_status)).length;
    return {
      month,
      label: new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }),
      orders: monthOrders.length,
      completedOrders: completed,
      conversionRate: monthOrders.length ? Number(((completed / monthOrders.length) * 100).toFixed(1)) : 0,
      wishlistSaves: wishlistSaves.filter(save => monthKey(save.created_at) === month).length,
    };
  });
  const totalOrders = orders.length;
  const completedOrders = orders.filter(order => ["confirmed", "shipped", "delivered"].includes(order.order_status)).length;
  return {
    monthly,
    totalOrders,
    completedOrders,
    conversionRate: totalOrders ? Number(((completedOrders / totalOrders) * 100).toFixed(1)) : 0,
    totalWishlistSaves: wishlistSaves.length,
  };
}
