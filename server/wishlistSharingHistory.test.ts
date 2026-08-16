import { afterEach, describe, expect, it, vi } from "vitest";

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));
vi.mock("./supabase", () => ({ supabase: { from: mockFrom } }));

import { createWishlistShare, getSharedWishlist, isWishlistShareAccessible, moderateReview } from "./commerce";

afterEach(() => mockFrom.mockReset());

describe("wishlist sharing and moderation history", () => {
  it("creates a share token and reads the public wishlist through it", async () => {
    const shareInsert = vi.fn().mockReturnValue({ select: () => ({ single: async () => ({ data: { token: "share-token-123" }, error: null }) }) });
    const shareSelect = vi.fn().mockReturnValue({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { user_id: "profile-1" }, error: null }) }) }) });
    const wishlistSelect = vi.fn().mockReturnValue({ eq: () => ({ order: async () => ({ data: [{ created_at: "2026-08-16T00:00:00Z", products: { id: "product-1", name: "Sling Bag", slug: "sling-bag", description: "Compact carry.", price: 1899, original_price: 2499, discount_percent: 24, category_id: "cat-1", stock_quantity: 6, images: [], is_featured: false, is_active: true, created_at: "2026-08-16T00:00:00Z", categories: { name: "Bags", slug: "bags" }, reviews: [] } }], error: null }) }) });
    mockFrom.mockImplementation((table: string) => {
      if (table === "profiles") return { upsert: () => ({ select: () => ({ single: async () => ({ data: { id: "profile-1" }, error: null }) }) }) };
      if (table === "wishlist_shares") return { insert: shareInsert, select: shareSelect };
      if (table === "wishlist_items") return { select: wishlistSelect };
      throw new Error(`Unexpected table: ${table}`);
    });
    await expect(createWishlistShare(7, "Customer")).resolves.toEqual({ token: "share-token-123" });
    await expect(getSharedWishlist("share-token-123")).resolves.toMatchObject([{ name: "Sling Bag" }]);
    expect(shareInsert).toHaveBeenCalledWith(expect.objectContaining({ user_id: "profile-1", token: expect.any(String) }));
  });

  it("distinguishes active, expired, and revoked share links", () => {
    const now = Date.parse("2026-08-16T00:00:00Z");
    expect(isWishlistShareAccessible({ expires_at: "2026-08-17T00:00:00Z" }, now)).toBe(true);
    expect(isWishlistShareAccessible({ expires_at: "2026-08-15T00:00:00Z" }, now)).toBe(false);
    expect(isWishlistShareAccessible({ revoked_at: "2026-08-17T00:00:00Z" }, now)).toBe(false);
  });

  it("writes a moderation-history row when an admin changes status", async () => {
    const historyInsert = vi.fn().mockResolvedValue({ error: null });
    const updateEq = vi.fn().mockResolvedValue({ error: null });
    const reviewSelect = vi.fn().mockReturnValue({ eq: () => ({ maybeSingle: async () => ({ data: { moderation_status: "pending" }, error: null }) }) });
    mockFrom.mockImplementation((table: string) => {
      if (table === "profiles") return { upsert: () => ({ select: () => ({ single: async () => ({ data: { id: "admin-1" }, error: null }) }) }) };
      if (table === "reviews") return { select: reviewSelect, update: () => ({ eq: updateEq }) };
      if (table === "review_moderation_history") return { insert: historyInsert };
      throw new Error(`Unexpected table: ${table}`);
    });
    await expect(moderateReview({ reviewId: "review-1", status: "approved", adminUserId: 7, adminName: "Admin" })).resolves.toEqual({ success: true });
    expect(historyInsert).toHaveBeenCalledWith({ review_id: "review-1", moderator_id: "admin-1", from_status: "pending", to_status: "approved", note: null });
  });
});
