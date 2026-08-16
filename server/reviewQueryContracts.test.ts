import { describe, expect, it } from "vitest";
import { adminReviewSelect, publicReviewSelect } from "./reviewQueryContracts";

describe("review query contracts", () => {
  it("uses the review author relationship explicitly for public reviews", () => {
    expect(publicReviewSelect).toContain("profiles!reviews_user_id_fkey(full_name)");
  });

  it("uses explicit author and moderator relationships for admin review history", () => {
    expect(adminReviewSelect).toContain("profiles!reviews_user_id_fkey(full_name)");
    expect(adminReviewSelect).toContain("profiles!review_moderation_history_moderator_id_fkey(full_name)");
  });
});
