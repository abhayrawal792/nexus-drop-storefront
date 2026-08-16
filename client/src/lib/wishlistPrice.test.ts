import { describe, expect, it } from "vitest";
import { hasWishlistPriceDrop } from "./wishlistPrice";

describe("wishlist price-drop badge", () => {
  it("shows only when the current price is below the persisted add-time price", () => {
    expect(hasWishlistPriceDrop(900, 1200)).toBe(true);
    expect(hasWishlistPriceDrop(1200, 1200)).toBe(false);
    expect(hasWishlistPriceDrop(1300, 1200)).toBe(false);
    expect(hasWishlistPriceDrop(900, null)).toBe(false);
  });
});
