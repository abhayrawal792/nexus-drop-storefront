export type AnalyticsQuickRange = "last7" | "this-month";

export function getAnalyticsQuickRange(range: AnalyticsQuickRange, now = new Date()) {
  const to = now.toISOString().slice(0, 10);
  const fromDate = range === "last7" ? new Date(now.getTime() - 6 * 86400000) : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  return { from: fromDate.toISOString().slice(0, 10), to };
}
