import { describe, expect, it } from "vitest";
import { buildAnalyticsCsv } from "../client/src/lib/analyticsExport";
import { buildAdminAnalytics, filterAnalyticsByDateRange } from "./analyticsFeatures";

describe("admin analytics aggregation", () => {
  it("calculates six-month order conversion and wishlist saves from real timestamps", () => {
    const result = buildAdminAnalytics(
      [
        { created_at: "2026-08-02T00:00:00Z", order_status: "delivered" },
        { created_at: "2026-08-03T00:00:00Z", order_status: "cancelled" },
      ],
      [{ created_at: "2026-08-04T00:00:00Z" }, { created_at: "2026-08-05T00:00:00Z" }],
      new Date("2026-08-16T00:00:00Z"),
    );
    expect(result.totalOrders).toBe(2);
    expect(result.completedOrders).toBe(1);
    expect(result.conversionRate).toBe(50);
    expect(result.totalWishlistSaves).toBe(2);
    expect(result.monthly.at(-1)).toMatchObject({ month: "2026-08", orders: 2, completedOrders: 1, wishlistSaves: 2, conversionRate: 50 });
  });

  it("includes both date boundaries in a requested analytics range", () => {
    const rows = [{ created_at: "2026-08-01T00:00:00Z", id: "first" }, { created_at: "2026-08-15T12:00:00Z", id: "middle" }, { created_at: "2026-08-31T23:59:59Z", id: "last" }];
    expect(filterAnalyticsByDateRange(rows, "2026-08-01", "2026-08-31").map(row => row.id)).toEqual(["first", "middle", "last"]);
  });

  it("exports summary metrics and monthly rows as escaped CSV", () => {
    const csv = buildAnalyticsCsv({ conversionRate: 50, totalOrders: 2, completedOrders: 1, totalWishlistSaves: 2, monthly: [{ month: "2026-08", orders: 2, completedOrders: 1, conversionRate: 50, wishlistSaves: 2 }] });
    expect(csv).toContain('"Conversion rate","50%"');
    expect(csv).toContain('"Month","Orders","Completed orders","Conversion rate","Wishlist saves"');
    expect(csv).toContain('"2026-08","2","1","50%","2"');
  });
});
