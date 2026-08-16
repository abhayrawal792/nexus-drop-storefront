export function buildAnalyticsCsv(analytics: { conversionRate: number; totalOrders: number; completedOrders: number; totalWishlistSaves: number; monthly: Array<{ month: string; orders: number; completedOrders: number; conversionRate: number; wishlistSaves: number }> }) {
  const escapeCsv = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const rows: unknown[][] = [["Metric", "Value"], ["Conversion rate", `${analytics.conversionRate}%`], ["Total orders", analytics.totalOrders], ["Completed orders", analytics.completedOrders], ["Total wishlist saves", analytics.totalWishlistSaves], [], ["Month", "Orders", "Completed orders", "Conversion rate", "Wishlist saves"], ...analytics.monthly.map(row => [row.month, row.orders, row.completedOrders, `${row.conversionRate}%`, row.wishlistSaves])];
  return rows.map(row => row.map(escapeCsv).join(",")).join("\n");
}
