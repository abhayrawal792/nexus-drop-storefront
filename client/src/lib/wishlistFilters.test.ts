import { describe, expect, it } from "vitest";
import { filterWishlistItems } from "./wishlistFilters";

describe("wishlist filters", () => {
  const items = [
    { id: "a", price: 1200, stockQuantity: 8 },
    { id: "b", price: 2400, stockQuantity: 3 },
    { id: "c", price: 3600, stockQuantity: 0 },
  ];

  it("filters by price range", () => {
    expect(filterWishlistItems(items, "1500", "3000", "all").map(item => item.id)).toEqual(["b"]);
  });

  it("filters in-stock, low-stock, and out-of-stock states", () => {
    expect(filterWishlistItems(items, "", "", "in-stock").map(item => item.id)).toEqual(["a"]);
    expect(filterWishlistItems(items, "", "", "low-stock").map(item => item.id)).toEqual(["b"]);
    expect(filterWishlistItems(items, "", "", "out-of-stock").map(item => item.id)).toEqual(["c"]);
  });
});
