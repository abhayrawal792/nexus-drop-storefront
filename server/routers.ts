import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { systemRouter } from "./_core/systemRouter";
import { addWishlist, createOrder, createReview, createWishlistShare, getAdminAnalytics, getAdminStats, getPaymentProofUrl, getProduct, getSharedWishlist, getUserOrders, listAdminOrders, listAdminProducts, listAdminReviews, listCategories, listCoupons, listProducts, listReviews, listWishlist, listWishlistAlerts, listWishlistShares, markWishlistAlertRead, moderateReview, removeWishlist, revokeWishlistShare, saveCoupon, saveProduct, updateWishlistShare, updateOrder, uploadPaymentProof, uploadProductImage, validateCoupon } from "./commerce";

const itemSchema = z.object({ productId: z.string().uuid(), quantity: z.number().int().min(1).max(10) });
const orderSchema = z.object({
  customerName: z.string().min(2).max(160), customerPhone: z.string().min(8).max(24), deliveryAddress: z.string().min(8).max(600), city: z.string().min(2).max(100),
  paymentMethod: z.enum(["COD", "eSewa", "Khalti", "FonePay", "BankTransfer"]), paymentProofUrl: z.string().max(500).optional(), couponCode: z.string().max(40).optional(), items: z.array(itemSchema).min(1).max(20),
});
const imageUploadSchema = z.object({ fileName: z.string().max(100), dataUrl: z.string().max(3_000_000) });

function readImageData(input: z.infer<typeof imageUploadSchema>) {
  const match = input.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match || !match[1].startsWith("image/")) throw new Error("Please upload a valid image.");
  return { contentType: match[1], bytes: Buffer.from(match[2], "base64") };
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(ctx.req), maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  store: router({
    categories: publicProcedure.query(() => listCategories()),
    catalog: publicProcedure.input(z.object({ category: z.string().optional(), search: z.string().optional(), minPrice: z.number().min(0).optional(), maxPrice: z.number().min(0).optional(), sort: z.enum(["newest", "price-low", "price-high"]).optional() })).query(({ input }) => listProducts(input)),
    product: publicProcedure.input(z.object({ slug: z.string().min(1) })).query(({ input }) => getProduct(input.slug)),
    reviews: publicProcedure.input(z.object({ productId: z.string().uuid() })).query(({ input }) => listReviews(input.productId)),
    wishlist: protectedProcedure.query(({ ctx }) => listWishlist(ctx.user.id)),
    addWishlist: protectedProcedure.input(z.object({ productId: z.string().uuid() })).mutation(({ input, ctx }) => addWishlist(ctx.user.id, input.productId)),
    removeWishlist: protectedProcedure.input(z.object({ productId: z.string().uuid() })).mutation(({ input, ctx }) => removeWishlist(ctx.user.id, input.productId)),
    wishlistAlerts: protectedProcedure.query(({ ctx }) => listWishlistAlerts(ctx.user.id, ctx.user.name)),
    markWishlistAlertRead: protectedProcedure.input(z.object({ alertId: z.string().uuid() })).mutation(({ input, ctx }) => markWishlistAlertRead(ctx.user.id, input.alertId, ctx.user.name)),
    createWishlistShare: protectedProcedure.input(z.object({ expiresAt: z.string().datetime().nullable().optional() }).optional()).mutation(({ input, ctx }) => createWishlistShare(ctx.user.id, ctx.user.name, input?.expiresAt ?? null)),
    wishlistShares: protectedProcedure.query(({ ctx }) => listWishlistShares(ctx.user.id, ctx.user.name)),
    updateWishlistShare: protectedProcedure.input(z.object({ shareId: z.string().uuid(), expiresAt: z.string().datetime().nullable() })).mutation(({ input, ctx }) => updateWishlistShare(ctx.user.id, input.shareId, input.expiresAt, ctx.user.name)),
    revokeWishlistShare: protectedProcedure.input(z.object({ shareId: z.string().uuid() })).mutation(({ input, ctx }) => revokeWishlistShare(ctx.user.id, input.shareId, ctx.user.name)),
    sharedWishlist: publicProcedure.input(z.object({ token: z.string().min(12).max(100) })).query(({ input }) => getSharedWishlist(input.token)),
    coupon: publicProcedure.input(z.object({ code: z.string().max(40), subtotal: z.number().min(0) })).query(({ input }) => validateCoupon(input.code, input.subtotal)),
    uploadReceipt: publicProcedure.input(imageUploadSchema).mutation(async ({ input, ctx }) => uploadPaymentProof({ fileName: input.fileName, ...readImageData(input), userId: ctx.user?.id })),
    checkout: publicProcedure.input(orderSchema).mutation(({ input, ctx }) => createOrder({ ...input, userId: ctx.user?.id, userName: ctx.user?.name })),
    submitReview: protectedProcedure.input(z.object({ productId: z.string().uuid(), rating: z.number().int().min(1).max(5), comment: z.string().min(4).max(800) })).mutation(({ input, ctx }) => createReview({ ...input, userId: ctx.user.id, userName: ctx.user.name, rating: input.rating, comment: input.comment })),
    accountOrders: protectedProcedure.query(({ ctx }) => getUserOrders(ctx.user.id, ctx.user.name)),
  }),
  admin: router({
    stats: adminProcedure.query(() => getAdminStats()),
    analytics: adminProcedure.query(() => getAdminAnalytics()),
    products: adminProcedure.query(() => listAdminProducts()),
    saveProduct: adminProcedure.input(z.object({ id: z.string().uuid().optional(), name: z.string().min(2).max(180), slug: z.string().min(2).max(180), description: z.string().min(10).max(1600), price: z.number().min(0), originalPrice: z.number().min(0).nullable().optional(), categoryId: z.string().uuid(), stockQuantity: z.number().int().min(0), images: z.array(z.string().url()).max(6), isFeatured: z.boolean(), isActive: z.boolean() })).mutation(({ input }) => saveProduct(input)),
    orders: adminProcedure.query(() => listAdminOrders()),
    updateOrder: adminProcedure.input(z.object({ id: z.string().uuid(), orderStatus: z.enum(["pending", "confirmed", "shipped", "delivered", "cancelled"]), paymentStatus: z.enum(["pending", "verified", "failed"]) })).mutation(({ input }) => updateOrder(input)),
    paymentProof: adminProcedure.input(z.object({ orderId: z.string().uuid() })).query(({ input }) => getPaymentProofUrl(input.orderId)),
    reviews: adminProcedure.input(z.object({ status: z.enum(["pending", "approved", "rejected"]).optional(), verified: z.boolean().optional(), search: z.string().max(120).optional(), from: z.string().date().optional(), to: z.string().date().optional() }).optional()).query(({ input }) => listAdminReviews(input ?? {})),
    moderateReview: adminProcedure.input(z.object({ reviewId: z.string().uuid(), status: z.enum(["pending", "approved", "rejected"]), note: z.string().max(500).optional() })).mutation(({ input, ctx }) => moderateReview({ ...input, adminUserId: ctx.user.id, adminName: ctx.user.name })),
    coupons: adminProcedure.query(() => listCoupons()),
    saveCoupon: adminProcedure.input(z.object({ id: z.string().uuid().optional(), code: z.string().min(3).max(40), discountPercent: z.number().int().min(1).max(30), minSpend: z.number().min(0), maxUses: z.number().int().positive().nullable().optional(), isActive: z.boolean(), expiryDate: z.date().nullable().optional() })).mutation(({ input }) => saveCoupon(input)),
    uploadProductImage: adminProcedure.input(imageUploadSchema).mutation(({ input }) => uploadProductImage({ fileName: input.fileName, ...readImageData(input) })),
  }),
});

export type AppRouter = typeof appRouter;
