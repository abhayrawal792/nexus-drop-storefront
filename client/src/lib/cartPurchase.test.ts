import { describe, expect, it } from "vitest";
import { buildBuyNowCart } from "./cartPurchase";

describe("buildBuyNowCart", () => {
  const product = { id: "watch-1", stockQuantity: 3 };

  it("creates a direct-checkout basket with the requested item only", () => {
    expect(buildBuyNowCart(product, 2)).toEqual([{ product, quantity: 2 }]);
  });

  it("keeps the quantity within the available stock", () => {
    expect(buildBuyNowCart(product, 9)[0]?.quantity).toBe(3);
    expect(buildBuyNowCart(product, 0)[0]?.quantity).toBe(1);
  });

  it("does not build a basket for an out-of-stock product", () => {
    expect(buildBuyNowCart({ id: "sold-out", stockQuantity: 0 })).toEqual([]);
  });
});
