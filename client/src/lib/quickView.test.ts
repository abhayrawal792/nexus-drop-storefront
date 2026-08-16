import { describe, expect, it } from "vitest";
import { getQuickViewPurchaseState } from "./quickView";

describe("quick view purchase state", () => {
  it("allows both purchase actions when stock is available", () => {
    expect(getQuickViewPurchaseState(4)).toEqual({ canPurchase: true, stockLabel: "4 in stock" });
  });

  it("disables purchase actions when stock is zero", () => {
    expect(getQuickViewPurchaseState(0)).toEqual({ canPurchase: false, stockLabel: "Currently sold out" });
  });
});
