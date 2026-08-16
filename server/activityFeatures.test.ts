import { describe, expect, it } from "vitest";
import { filterProductActivity, type ProductActivityEntry } from "./activityFeatures";

const entries: ProductActivityEntry[] = [
  { id: "1", action: "created", productId: "p1", productName: "Chain", changes: {}, createdAt: new Date("2026-08-10T10:00:00Z"), adminName: "Abhay Rawal", productSlug: "chain" },
  { id: "2", action: "updated", productId: "p2", productName: "Watch", changes: {}, createdAt: new Date("2026-08-12T10:00:00Z"), adminName: "Nexus Admin", productSlug: "watch" },
  { id: "3", action: "updated", productId: "p3", productName: "Bag", changes: {}, createdAt: new Date("2026-08-14T10:00:00Z"), adminName: "Abhay Rawal", productSlug: "bag" },
];

describe("filterProductActivity", () => {
  it("filters by administrator and action", () => {
    expect(filterProductActivity(entries, { administrator: "abhay", action: "updated" }).map(entry => entry.id)).toEqual(["3"]);
  });

  it("uses inclusive date boundaries and respects the limit", () => {
    expect(filterProductActivity(entries, { from: "2026-08-10", to: "2026-08-14", limit: 2 }).map(entry => entry.id)).toEqual(["1", "2"]);
  });
});
