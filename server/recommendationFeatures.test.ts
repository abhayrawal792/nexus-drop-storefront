import { describe, expect, it } from "vitest";
import { rankWishlistRecommendations } from "./recommendationFeatures";

describe("wishlist-aware recommendation ranking", () => {
  it("prioritizes same-category and excludes the current and saved products", () => {
    const result = rankWishlistRecommendations(
      { id: "current", category_id: "bags", price: 2000 },
      [{ id: "saved", category_id: "bags", price: 1800 }],
      [
        { id: "saved", category_id: "bags", price: 1800 },
        { id: "same", category_id: "bags", price: 2100 },
        { id: "other", category_id: "watches", price: 1000 },
        { id: "current", category_id: "bags", price: 2000 },
      ],
      2,
    );
    expect(result.map(item => item.id)).toEqual(["same", "other"]);
  });
});
