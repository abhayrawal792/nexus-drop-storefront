import { describe, expect, it } from "vitest";
import { sortWishlistItems } from "./wishlistSort";

describe("wishlist sorting", () => {
  const items = [
    { id: "older", price: 2400, addedAt: "2026-01-01T00:00:00Z" },
    { id: "newer", price: 1200, addedAt: "2026-02-01T00:00:00Z" },
  ];

  it("sorts by price in both directions", () => {
    expect(sortWishlistItems(items, "price-low").map(item => item.id)).toEqual(["newer", "older"]);
    expect(sortWishlistItems(items, "price-high").map(item => item.id)).toEqual(["older", "newer"]);
  });

  it("sorts by newest and oldest added timestamps", () => {
    expect(sortWishlistItems(items, "newest").map(item => item.id)).toEqual(["newer", "older"]);
    expect(sortWishlistItems(items, "oldest").map(item => item.id)).toEqual(["older", "newer"]);
  });
});
