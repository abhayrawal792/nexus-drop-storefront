import { describe, expect, it } from "vitest";
import { normalizeReviewFilters } from "./reviewFeatures";

describe("review filter normalization", () => {
  it("preserves status and verified-purchase filters", () => {
    expect(normalizeReviewFilters({ status: "pending", verified: true })).toEqual({ status: "pending", verified: true });
  });
  it("omits unset filters", () => {
    expect(normalizeReviewFilters()).toEqual({});
  });
  it("normalizes moderation-history search and date bounds", () => {
    expect(normalizeReviewFilters({ search: "  sling bag ", from: "2026-08-01", to: "2026-08-16" })).toEqual({ search: "sling bag", from: "2026-08-01", to: "2026-08-16" });
  });
});
