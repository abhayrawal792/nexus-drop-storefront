export function buildAnalyticsCsv(analytics: any) {
  const escapeCsv = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const restock = analytics.restock ?? {};
  const rows: unknown[][] = [
    ["Metric", "Value"],
    ["Conversion rate", `${analytics.conversionRate}%`],
    ["Total orders", analytics.totalOrders],
    ["Completed orders", analytics.completedOrders],
    ["Total wishlist saves", analytics.totalWishlistSaves],
    ["Alert signups", restock.totalAlertSignups ?? 0],
    ["Sent alerts", restock.sentAlerts ?? 0],
    ["Cancelled alerts", restock.cancelledAlerts ?? 0],
    ["Converted alerts", restock.convertedAlerts ?? 0],
    ["Restock attribution window", `${restock.attributionDays ?? 7} days`],
    ["Restock conversion rate", `${restock.conversionRate ?? 0}%`],
    [],
    ["Month", "Orders", "Completed orders", "Conversion rate", "Wishlist saves", "Alert signups", "Sent alerts", "Cancelled alerts", "Converted alerts", "Restock conversion rate"],
    ...analytics.monthly.map((row: any, index: number) => {
      const restockRow = restock.monthly?.[index] ?? {};
      return [row.month, row.orders, row.completedOrders, `${row.conversionRate}%`, row.wishlistSaves, restockRow.alertSignups ?? 0, restockRow.sentAlerts ?? 0, restockRow.cancelledAlerts ?? 0, restockRow.convertedAlerts ?? 0, `${restockRow.conversionRate ?? 0}%`];
    }),
  ];
  return rows.map(row => row.map(escapeCsv).join(",")).join("\n");
}

export function buildRestockFailureCsv(failures: Array<{ productName: string; categoryName?: string | null; email: string; errorType: string; error: string; failedAt: string }>) {
  const escapeCsv = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const rows = [["Product", "Category", "Recipient", "Error type", "Provider error", "Failed at"], ...failures.map(failure => [failure.productName, failure.categoryName ?? "", failure.email, failure.errorType, failure.error, failure.failedAt])];
  return rows.map(row => row.map(escapeCsv).join(",")).join("\n");
}
