import { afterEach, describe, expect, it, vi } from "vitest";

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));
vi.mock("./supabase", () => ({ supabase: { from: mockFrom } }));

import { addWishlist, moderateReview, removeWishlist } from "./commerce";

afterEach(() => mockFrom.mockReset());

describe("wishlist and review operations", () => {
  it("upserts a wishlist item against the authenticated profile", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockImplementation((table: string) => {
      if (table === "profiles") return { upsert: () => ({ select: () => ({ single: async () => ({ data: { id: "profile-1" }, error: null }) }) }) };
      if (table === "wishlist_items") return { upsert };
      throw new Error(`Unexpected table: ${table}`);
    });
    await expect(addWishlist(7, "a2d52c01-d76d-4b35-b6f7-e6b14a584b7a")).resolves.toEqual({ success: true });
    expect(upsert).toHaveBeenCalledWith({ user_id: "profile-1", product_id: "a2d52c01-d76d-4b35-b6f7-e6b14a584b7a" }, { onConflict: "user_id,product_id" });
  });

  it("removes only the authenticated profile's wishlist item", async () => {
    const eqProduct = vi.fn().mockResolvedValue({ error: null });
    const eqUser = vi.fn().mockReturnValue({ eq: eqProduct });
    mockFrom.mockImplementation((table: string) => {
      if (table === "profiles") return { upsert: () => ({ select: () => ({ single: async () => ({ data: { id: "profile-1" }, error: null }) }) }) };
      if (table === "wishlist_items") return { delete: () => ({ eq: eqUser }) };
      throw new Error(`Unexpected table: ${table}`);
    });
    await expect(removeWishlist(7, "a2d52c01-d76d-4b35-b6f7-e6b14a584b7a")).resolves.toEqual({ success: true });
    expect(eqUser).toHaveBeenCalledWith("user_id", "profile-1");
    expect(eqProduct).toHaveBeenCalledWith("product_id", "a2d52c01-d76d-4b35-b6f7-e6b14a584b7a");
  });

  it("records moderation status and moderator profile", async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq });
    mockFrom.mockImplementation((table: string) => {
      if (table === "profiles") return { upsert: () => ({ select: () => ({ single: async () => ({ data: { id: "admin-profile" }, error: null }) }) }) };
      if (table === "reviews") return { update };
      throw new Error(`Unexpected table: ${table}`);
    });
    await expect(moderateReview({ reviewId: "review-1", status: "approved", adminUserId: 7, adminName: "Admin" })).resolves.toEqual({ success: true });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ moderation_status: "approved", moderated_by: "admin-profile" }));
    expect(eq).toHaveBeenCalledWith("id", "review-1");
  });
});
