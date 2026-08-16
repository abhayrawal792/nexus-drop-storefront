import { describe, expect, it } from "vitest";
import { calculateOrderTotals } from "../shared/commerce";

describe("Nexus Drop order totals", () => {
  it("charges Rs. 150 delivery at or below Rs. 3000", () => {
    expect(calculateOrderTotals(3000, 0)).toEqual({
      subtotal: 3000,
      discountAmount: 0,
      deliveryCharge: 150,
      totalAmount: 3150,
    });
  });

  it("waives delivery when the subtotal exceeds Rs. 3000", () => {
    expect(calculateOrderTotals(3001, 0)).toEqual({
      subtotal: 3001,
      discountAmount: 0,
      deliveryCharge: 0,
      totalAmount: 3001,
    });
  });

  it("caps NEXUS30-style discounts at 30 percent", () => {
    expect(calculateOrderTotals(1000, 45)).toEqual({
      subtotal: 1000,
      discountAmount: 300,
      deliveryCharge: 150,
      totalAmount: 850,
    });
  });
});
