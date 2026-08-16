import { afterEach, describe, expect, it, vi } from "vitest";

const { mockFrom, mockStorageFrom } = vi.hoisted(() => ({ mockFrom: vi.fn(), mockStorageFrom: vi.fn() }));

vi.mock("./supabase", () => ({ supabase: { from: mockFrom, storage: { from: mockStorageFrom } } }));

import { createOrder, createReview, getAdminStats, getPaymentProofUrl, listAdminProducts, listCoupons, listProducts, saveCoupon, saveProduct, updateOrder, uploadProductImage, validateCoupon } from "./commerce";

const sampleProduct = {
  id: "a2d52c01-d76d-4b35-b6f7-e6b14a584b7a", name: "Cuban Chain", slug: "cuban-chain", description: "A polished chain for daily rotation.", price: 999,
  original_price: 1499, discount_percent: 33, category_id: "69c51095-e488-417a-9a6f-99d7d8007c59", stock_quantity: 8, images: [], is_featured: true, is_active: true,
  created_at: "2026-08-16T00:00:00.000Z", categories: { name: "Jewelry", slug: "jewelry" }, reviews: [{ rating: 4 }, { rating: 5 }],
};

afterEach(() => { mockFrom.mockReset(); mockStorageFrom.mockReset(); });

describe("commerce catalog server logic", () => {
  it("resolves a collection slug and constrains products by its category identifier", async () => {
    const productBuilder: any = { eq: vi.fn(), order: vi.fn() };
    productBuilder.eq.mockReturnValue(productBuilder);
    productBuilder.order.mockResolvedValue({ data: [sampleProduct], error: null });
    mockFrom.mockImplementation((table: string) => {
      if (table === "categories") return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: sampleProduct.category_id }, error: null }) }) }) };
      return { select: () => productBuilder };
    });

    const result = await listProducts({ category: "jewelry", sort: "newest" });

    expect(productBuilder.eq).toHaveBeenCalledWith("is_active", true);
    expect(productBuilder.eq).toHaveBeenCalledWith("category_id", sampleProduct.category_id);
    expect(result).toMatchObject([{ name: "Cuban Chain", categorySlug: "jewelry", averageRating: 4.5, reviewCount: 2 }]);
  });

  it("returns an empty collection when its slug is not found", async () => {
    mockFrom.mockReturnValue({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) });
    await expect(listProducts({ category: "unknown" })).resolves.toEqual([]);
  });
});

describe("coupon server logic", () => {
  it("caps a valid coupon at the 30 percent store limit", async () => {
    mockFrom.mockReturnValue({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { code: "NEXUS30", is_active: true, expiry_date: null, max_uses: null, current_uses: 0, min_spend: 0, discount_percent: 45 }, error: null }) }) }) });
    await expect(validateCoupon("nexus30", 2000)).resolves.toMatchObject({ valid: true, discountPercent: 30 });
  });

  it("rejects inactive promotions", async () => {
    mockFrom.mockReturnValue({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { code: "NEXUS30", is_active: false, expiry_date: null, max_uses: null, current_uses: 0, min_spend: 0, discount_percent: 30 }, error: null }) }) }) });
    await expect(validateCoupon("NEXUS30", 2000)).resolves.toMatchObject({ valid: false, discountPercent: 0 });
  });
});

describe("review and checkout server logic", () => {
  it("creates a profile-backed authenticated review", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "profiles") return { upsert: () => ({ select: () => ({ single: async () => ({ data: { id: "profile-1", role: "customer" }, error: null }) }) }) };
      if (table === "reviews") return { insert: async () => ({ error: null }) };
      throw new Error(`Unexpected table: ${table}`);
    });

    await expect(createReview({ productId: sampleProduct.id, userId: 7, userName: "Customer", rating: 5, comment: "Excellent finishing and easy to wear." })).resolves.toEqual({ success: true });
  });

  it("creates an order with calculated delivery and decreases available stock", async () => {
    let productsCall = 0;
    const orderProduct = { id: sampleProduct.id, name: sampleProduct.name, price: 999, stock_quantity: 4, is_active: true };
    const stockUpdates: Array<{ quantity: number }> = [];
    mockFrom.mockImplementation((table: string) => {
      if (table === "products") {
        productsCall += 1;
        if (productsCall === 1) return { select: () => ({ in: () => ({ eq: async () => ({ data: [orderProduct], error: null }) }) }) };
        return { update: (payload: { stock_quantity: number }) => ({ eq: async () => { stockUpdates.push({ quantity: payload.stock_quantity }); return { error: null }; } }) };
      }
      if (table === "orders") return { insert: () => ({ select: () => ({ single: async () => ({ data: { id: "order-1" }, error: null }) }) }) };
      if (table === "order_items") return { insert: async () => ({ error: null }) };
      throw new Error(`Unexpected table: ${table}`);
    });

    const result = await createOrder({ customerName: "Test Customer", customerPhone: "9800000000", deliveryAddress: "Ward 1, Nepalgunj", city: "Nepalgunj", paymentMethod: "COD", items: [{ productId: sampleProduct.id, quantity: 2 }] });

    expect(result).toMatchObject({ id: "order-1", subtotal: 1998, deliveryCharge: 150, totalAmount: 2148, orderStatus: "pending" });
    expect(stockUpdates).toEqual([{ quantity: 2 }]);
  });
});

describe("admin management server logic", () => {
  it("calculates operations statistics and lists catalog items", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "orders") return { select: () => ({ then: undefined, data: undefined }), };
      if (table === "products") return { select: () => ({ order: async () => ({ data: [sampleProduct], error: null }) }) };
      throw new Error(`Unexpected table: ${table}`);
    });
    const orderSelect = { data: [{ total_amount: 1200, order_status: "delivered" }, { total_amount: 999, order_status: "pending" }], error: null };
    const inventorySelect = { data: [{ stock_quantity: 3, is_active: true }, { stock_quantity: 15, is_active: true }, { stock_quantity: 1, is_active: false }], error: null };
    mockFrom.mockImplementationOnce(() => ({ select: async () => orderSelect })).mockImplementationOnce(() => ({ select: async () => inventorySelect }));
    await expect(getAdminStats()).resolves.toMatchObject({ revenue: 1200, totalOrders: 2, pendingDeliveries: 1, activeInventory: 2, lowStock: 1 });
    mockFrom.mockImplementation(() => ({ select: () => ({ order: async () => ({ data: [sampleProduct], error: null }) }) }));
    await expect(listAdminProducts()).resolves.toMatchObject([{ name: "Cuban Chain", reviewCount: 2 }]);
  });

  it("saves product and coupon updates using normalized admin payloads", async () => {
    const calls: unknown[] = [];
    mockFrom.mockImplementation((table: string) => ({
      update: (payload: unknown) => { calls.push([table, payload]); return { eq: async () => ({ error: null }) }; },
      insert: (payload: unknown) => { calls.push([table, payload]); return Promise.resolve({ error: null }); },
    }));
    await expect(saveProduct({ id: sampleProduct.id, name: "Updated Chain", slug: "updated-chain", description: "Updated chain detail copy.", price: 900, originalPrice: 1200, categoryId: sampleProduct.category_id, stockQuantity: 6, images: [], isFeatured: true, isActive: true })).resolves.toEqual({ success: true });
    await expect(saveCoupon({ code: " nexus20 ", discountPercent: 20, minSpend: 1000, isActive: true })).resolves.toEqual({ success: true });
    expect(calls).toContainEqual(["products", expect.objectContaining({ discount_percent: 25, stock_quantity: 6 })]);
    expect(calls).toContainEqual(["coupons", expect.objectContaining({ code: "NEXUS20", discount_percent: 20 })]);
  });

  it("updates order state and safely retrieves payment proof URLs", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "orders") return { update: () => ({ eq: async () => ({ error: null }) }), select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { payment_proof_url: "proofs/receipt.png" }, error: null }) }) }) };
      throw new Error(`Unexpected table: ${table}`);
    });
    mockStorageFrom.mockReturnValue({ createSignedUrl: async () => ({ data: { signedUrl: "https://example.test/receipt" }, error: null }) });
    await expect(updateOrder({ id: "order-1", orderStatus: "confirmed", paymentStatus: "verified" })).resolves.toEqual({ success: true });
    await expect(getPaymentProofUrl("order-1")).resolves.toBe("https://example.test/receipt");
  });

  it("lists coupons and uploads a product image to managed storage", async () => {
    mockFrom.mockReturnValue({ select: () => ({ order: async () => ({ data: [{ code: "NEXUS30" }], error: null }) }) });
    mockStorageFrom.mockReturnValue({ upload: async () => ({ error: null }), getPublicUrl: () => ({ data: { publicUrl: "https://example.test/product.png" } }) });
    await expect(listCoupons()).resolves.toEqual([{ code: "NEXUS30" }]);
    await expect(uploadProductImage({ fileName: "chain.png", bytes: Buffer.from("image"), contentType: "image/png" })).resolves.toMatchObject({ publicUrl: "https://example.test/product.png" });
  });
});
