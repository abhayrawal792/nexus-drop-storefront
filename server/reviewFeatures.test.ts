import { describe, expect, it } from "vitest";
import { normalizeReviewFilters } from "./reviewFeatures";

describe("review filter normalization", () => {
  it("preserves status and verified-purchase filters", () => {
    expect(normalizeReviewFilters({ status: "pending", verified: true })).toEqual({ status: "pending", verified: true });
  });
  it("omits unset filters", () => {
    expect(normalizeReviewFilters()).toEqual({});
  });
});
