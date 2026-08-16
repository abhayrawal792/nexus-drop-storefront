import { describe, expect, it } from "vitest";
import { buildWishlistAlerts } from "./wishlistFeatures";

describe("wishlist alert rules", () => {
  const items = [{ id: "wish-1", user_id: "user-1" }];
  it("creates a price-drop alert only when the saved product gets cheaper", () => {
    expect(buildWishlistAlerts(items, "product-1", 1200, 999, 10, 10)).toMatchObject([{ alert_type: "price_drop", previous_value: 1200, current_value: 999 }]);
    expect(buildWishlistAlerts(items, "product-1", 999, 1200, 10, 10)).toEqual([]);
  });
  it("creates a low-stock alert when inventory crosses the five-item threshold", () => {
    expect(buildWishlistAlerts(items, "product-1", 1200, 1200, 8, 5)).toMatchObject([{ alert_type: "low_stock", previous_value: 8, current_value: 5 }]);
    expect(buildWishlistAlerts(items, "product-1", 1200, 1200, 4, 3)).toEqual([]);
  });
});
