import { describe, expect, it } from "vitest";
import { buildAdminAnalytics } from "./analyticsFeatures";

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
});
