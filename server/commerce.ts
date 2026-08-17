import { calculateOrderTotals } from "../shared/commerce";
import { createHash, randomBytes } from "node:crypto";
import { supabase } from "./supabase";
import { buildWishlistAlerts } from "./wishlistFeatures";
import { rankWishlistRecommendations } from "./recommendationFeatures";
import { normalizeReviewFilters } from "./reviewFeatures";
import { adminReviewSelect, publicReviewSelect } from "./reviewQueryContracts";
import { buildAdminAnalytics, filterAnalyticsByDateRange } from "./analyticsFeatures";
import { filterProductActivity, type ProductActivityEntry } from "./activityFeatures";

export type PaymentMethod = "COD" | "eSewa" | "Khalti" | "FonePay" | "BankTransfer";

export function normalizeRestockEmail(value: string) {
  const email = value.trim().toLowerCase();
  return /^\S+@\S+\.\S+$/.test(email) ? email : null;
}

export function isManageableRestockStatus(status: string) {
  return status === "pending" || status === "failed";
}
export type OrderStatus = "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
export type PaymentStatus = "pending" | "verified" | "failed";

type CatalogRow = {
  id: string; name: string; slug: string; description: string; price: number | string; original_price: number | string | null;
  discount_percent: number; category_id: string; stock_quantity: number; images: string[]; is_featured: boolean; is_active: boolean; created_at: string;
  categories: { name: string; slug: string } | null; reviews?: Array<{ rating: number; moderation_status?: string }> | null;
};

function toProduct(row: CatalogRow) {
  const approvedReviews = (row.reviews ?? []).filter(review => !review.moderation_status || review.moderation_status === "approved");
  const reviewCount = approvedReviews.length;
  const averageRating = reviewCount ? Number((approvedReviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount).toFixed(1)) : null;
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    price: Number(row.price),
    originalPrice: row.original_price === null ? null : Number(row.original_price),
    discountPercent: row.discount_percent,
    categoryId: row.category_id,
    stockQuantity: row.stock_quantity,
    images: row.images ?? [],
    isFeatured: row.is_featured,
    isActive: row.is_active,
    createdAt: new Date(row.created_at),
    categoryName: row.categories?.name ?? "Accessories",
    categorySlug: row.categories?.slug ?? "accessories",
    reviewCount,
    averageRating,
  };
}

async function ensureProfile(externalUserId: number, fullName?: string | null) {
  const payload = { external_user_id: String(externalUserId), ...(fullName ? { full_name: fullName } : {}) };
  const { data, error } = await supabase.from("profiles").upsert(payload, { onConflict: "external_user_id" }).select("id, role").single();
  if (error || !data) throw new Error(error?.message ?? "Unable to prepare your customer profile.");
  return data as { id: string; role: "customer" | "admin" };
}

export async function listCategories() {
  const { data, error } = await supabase.from("categories").select("id, name, slug").order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export function normalizeCatalogFilters(input: { minPrice?: number; maxPrice?: number }) {
  const minPrice = input.minPrice !== undefined && input.minPrice >= 0 ? input.minPrice : undefined;
  const maxPrice = input.maxPrice !== undefined && input.maxPrice >= 0 ? input.maxPrice : undefined;
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) return {};
  return { ...(minPrice === undefined ? {} : { minPrice }), ...(maxPrice === undefined ? {} : { maxPrice }) };
}

export async function listProducts(input: { category?: string; search?: string; minPrice?: number; maxPrice?: number; sort?: "newest" | "price-low" | "price-high" }) {
  const priceFilters = normalizeCatalogFilters(input);
  let query = supabase.from("products").select("*, categories(name, slug), reviews(rating, moderation_status)").eq("is_active", true);
  if (input.category) {
    const { data: category, error: categoryError } = await supabase.from("categories").select("id").eq("slug", input.category).maybeSingle();
    if (categoryError) throw new Error(categoryError.message);
    if (!category) return [];
    query = query.eq("category_id", category.id);
  }
  if (input.search?.trim()) query = query.or(`name.ilike.%${input.search.trim()}%,description.ilike.%${input.search.trim()}%`);
  if (priceFilters.minPrice !== undefined) query = query.gte("price", priceFilters.minPrice);
  if (priceFilters.maxPrice !== undefined) query = query.lte("price", priceFilters.maxPrice);
  if (input.sort === "price-low") query = query.order("price", { ascending: true });
  else if (input.sort === "price-high") query = query.order("price", { ascending: false });
  else query = query.order("created_at", { ascending: false });
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map(row => toProduct(row as CatalogRow));
}

export async function getProduct(slug: string) {
  const { data, error } = await supabase.from("products").select("*, categories(name, slug), reviews(rating, moderation_status)").eq("slug", slug).eq("is_active", true).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toProduct(data as CatalogRow) : null;
}

export async function listReviews(productId: string) {
  const { data, error } = await supabase.from("reviews").select(publicReviewSelect).eq("product_id", productId).eq("moderation_status", "approved").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((review: any) => ({ id: review.id, rating: review.rating, comment: review.comment, createdAt: new Date(review.created_at), author: review.profiles?.full_name ?? "Verified customer", verifiedPurchase: Boolean(review.verified_purchase) }));
}

async function hasCompletedPurchase(profileId: string, productId: string) {
  const { data: orders, error: orderError } = await supabase.from("orders").select("id").eq("user_id", profileId).in("order_status", ["confirmed", "shipped", "delivered"]);
  if (orderError) throw new Error(orderError.message);
  const orderIds = (orders ?? []).map(order => order.id);
  if (!orderIds.length) return false;
  const { data: items, error: itemError } = await supabase.from("order_items").select("id").eq("product_id", productId).in("order_id", orderIds).limit(1);
  if (itemError) throw new Error(itemError.message);
  return Boolean(items?.length);
}

export async function createReview(input: { productId: string; userId: number; userName?: string | null; rating: number; comment: string }) {
  const profile = await ensureProfile(input.userId, input.userName);
  const verifiedPurchase = await hasCompletedPurchase(profile.id, input.productId);
  const { error } = await supabase.from("reviews").insert({ product_id: input.productId, user_id: profile.id, rating: input.rating, comment: input.comment, verified_purchase: verifiedPurchase, moderation_status: "pending" });
  if (error) throw new Error(error.message);
  return { success: true, moderationStatus: "pending", verifiedPurchase };
}

export async function listWishlist(userId: number) {
  const profile = await ensureProfile(userId);
  const { data, error } = await supabase.from("wishlist_items").select("product_id, created_at, price_at_added, products(*, categories(name, slug), reviews(rating, moderation_status))").eq("user_id", profile.id).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).flatMap((row: any) => row.products ? [{ addedAt: new Date(row.created_at), priceAtAdded: row.price_at_added === null ? null : Number(row.price_at_added), ...toProduct(row.products as CatalogRow) }] : []);
}

export async function addWishlist(userId: number, productId: string) {
  const profile = await ensureProfile(userId);
  const { data: product, error: productError } = await supabase.from("products").select("price").eq("id", productId).maybeSingle();
  if (productError) throw new Error(productError.message);
  const { error } = await supabase.from("wishlist_items").upsert({ user_id: profile.id, product_id: productId, price_at_added: product ? Number(product.price) : null }, { onConflict: "user_id,product_id" });
  if (error) throw new Error(error.message);
  return { success: true };
}

export async function removeWishlist(userId: number, productId: string) {
  const profile = await ensureProfile(userId);
  const { error } = await supabase.from("wishlist_items").delete().eq("user_id", profile.id).eq("product_id", productId);
  if (error) throw new Error(error.message);
  return { success: true };
}

export async function listAdminReviews(input: { status?: "pending" | "approved" | "rejected"; verified?: boolean; search?: string; from?: string; to?: string } = {}) {
  const filters = normalizeReviewFilters(input);
  let query = supabase.from("reviews").select(adminReviewSelect).order("created_at", { ascending: false });
  if (filters.status) query = query.eq("moderation_status", filters.status);
  if (filters.verified !== undefined) query = query.eq("verified_purchase", filters.verified);
  if (filters.from) query = query.gte("created_at", filters.from);
  if (filters.to) query = query.lte("created_at", `${filters.to}T23:59:59.999Z`);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const fromMs = filters.from ? new Date(filters.from).getTime() : undefined;
  const toMs = filters.to ? new Date(`${filters.to}T23:59:59.999Z`).getTime() : undefined;
  const search = filters.search?.toLowerCase();
  return (data ?? []).flatMap((review: any) => {
    const history = (review.review_moderation_history ?? []).filter((entry: any) => {
      const time = new Date(entry.created_at).getTime();
      const dateMatch = (fromMs === undefined || time >= fromMs) && (toMs === undefined || time <= toMs);
      const historyText = [entry.note, entry.from_status, entry.to_status, entry.profiles?.full_name].filter(Boolean).join(" ").toLowerCase();
      const reviewText = [review.comment, review.products?.name, review.profiles?.full_name].filter(Boolean).join(" ").toLowerCase();
      return dateMatch && (!search || historyText.includes(search) || reviewText.includes(search));
    });
    if ((filters.from || filters.to || search) && history.length === 0) return [];
    return [{ ...review, review_moderation_history: history }];
  });
}

export async function moderateReview(input: { reviewId: string; status: "pending" | "approved" | "rejected"; adminUserId: number; adminName?: string | null; note?: string | null }) {
  const profile = await ensureProfile(input.adminUserId, input.adminName);
  let existing: { moderation_status?: string } | null = null;
  const reviewTable = supabase.from("reviews") as any;
  if (typeof reviewTable.select === "function") { const result = await reviewTable.select("moderation_status").eq("id", input.reviewId).maybeSingle(); if (result.error) throw new Error(result.error.message); existing = result.data; }
  const { error } = await supabase.from("reviews").update({ moderation_status: input.status, moderated_by: profile.id, moderated_at: new Date().toISOString() }).eq("id", input.reviewId);
  if (error) throw new Error(error.message);
  try { const historyTable = supabase.from("review_moderation_history") as any; if (typeof historyTable.insert === "function") { const { error: historyError } = await historyTable.insert({ review_id: input.reviewId, moderator_id: profile.id, from_status: existing?.moderation_status ?? null, to_status: input.status, note: input.note ?? null }); if (historyError) throw new Error(historyError.message); } } catch (error) { if (!(error instanceof Error && error.message.startsWith("Unexpected table:"))) throw error; }
  return { success: true };
}

export async function listWishlistAlerts(userId: number, userName?: string | null) {
  const profile = await ensureProfile(userId, userName);
  const { data, error } = await supabase.from("wishlist_alerts").select("id, alert_type, previous_value, current_value, is_read, created_at, products(id, name, slug, price, stock_quantity, images)").eq("user_id", profile.id).order("created_at", { ascending: false }).limit(50);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listCustomerRestockRequests(userId: number, email: string, userName?: string | null) {
  const normalizedEmail = normalizeRestockEmail(email);
  if (!normalizedEmail) throw new Error("A valid customer email is required.");
  await ensureProfile(userId, userName);
  const { data, error } = await supabase.from("restock_requests").select("id, email, status, requested_at, updated_at, products(id, name, slug, price, stock_quantity, images)").eq("email", normalizedEmail).in("status", ["pending", "failed"]).order("requested_at", { ascending: false }).limit(50);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: any) => ({ id: row.id, email: row.email, status: row.status, requestedAt: new Date(row.requested_at), updatedAt: new Date(row.updated_at), product: Array.isArray(row.products) ? row.products[0] : row.products }));
}

export async function cancelCustomerRestockRequest(userId: number, email: string, requestId: string, userName?: string | null) {
  const normalizedEmail = normalizeRestockEmail(email);
  if (!normalizedEmail) throw new Error("A valid customer email is required.");
  await ensureProfile(userId, userName);
  const { error } = await supabase.from("restock_requests").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", requestId).eq("email", normalizedEmail).in("status", ["pending", "failed"]);
  if (error) throw new Error(error.message);
  return { success: true };
}

export async function getCustomerEmailPreferences(userId: number, email: string, userName?: string | null) {
  const normalizedEmail = normalizeRestockEmail(email);
  if (!normalizedEmail) throw new Error("A valid customer email is required.");
  const profile = await ensureProfile(userId, userName);
  const { data, error } = await supabase.from("customer_email_preferences").upsert({ profile_id: profile.id, email: normalizedEmail }, { onConflict: "profile_id" }).select("email, alert_emails_enabled, updated_at").single();
  if (error || !data) throw new Error(error?.message ?? "Unable to load email preferences.");
  return { email: data.email, alertEmailsEnabled: Boolean(data.alert_emails_enabled), updatedAt: new Date(data.updated_at) };
}

export async function updateCustomerEmailPreferences(userId: number, email: string, alertEmailsEnabled: boolean, userName?: string | null) {
  const normalizedEmail = normalizeRestockEmail(email);
  if (!normalizedEmail) throw new Error("A valid customer email is required.");
  const profile = await ensureProfile(userId, userName);
  const { data, error } = await supabase.from("customer_email_preferences").upsert({ profile_id: profile.id, email: normalizedEmail, alert_emails_enabled: alertEmailsEnabled, updated_at: new Date().toISOString() }, { onConflict: "profile_id" }).select("email, alert_emails_enabled, updated_at").single();
  if (error || !data) throw new Error(error?.message ?? "Unable to update email preferences.");
  if (!alertEmailsEnabled) await supabase.from("restock_requests").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("email", normalizedEmail).eq("status", "pending");
  return { email: data.email, alertEmailsEnabled: Boolean(data.alert_emails_enabled), updatedAt: new Date(data.updated_at) };
}

export async function markWishlistAlertRead(userId: number, alertId: string, userName?: string | null) {
  const profile = await ensureProfile(userId, userName);
  const { error } = await supabase.from("wishlist_alerts").update({ is_read: true }).eq("id", alertId).eq("user_id", profile.id);
  if (error) throw new Error(error.message);
  return { success: true };
}

export async function createWishlistShare(userId: number, userName?: string | null, expiresAt?: string | null) {
  const profile = await ensureProfile(userId, userName);
  const token = randomBytes(18).toString("base64url");
  const { data, error } = await supabase.from("wishlist_shares").insert({ user_id: profile.id, token, expires_at: expiresAt ?? null }).select("token, expires_at").single();
  if (error || !data) throw new Error(error?.message ?? "Unable to create wishlist link.");
  return { token: data.token, expiresAt: data.expires_at };
}

export async function listWishlistShares(userId: number, userName?: string | null) {
  const profile = await ensureProfile(userId, userName);
  const { data, error } = await supabase.from("wishlist_shares").select("id, token, is_active, expires_at, revoked_at, created_at").eq("user_id", profile.id).order("created_at", { ascending: false }).limit(25);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function updateWishlistShare(userId: number, shareId: string, expiresAt: string | null, userName?: string | null) {
  const profile = await ensureProfile(userId, userName);
  const { error } = await supabase.from("wishlist_shares").update({ expires_at: expiresAt }).eq("id", shareId).eq("user_id", profile.id).eq("is_active", true);
  if (error) throw new Error(error.message);
  return { success: true };
}

export async function revokeWishlistShare(userId: number, shareId: string, userName?: string | null) {
  const profile = await ensureProfile(userId, userName);
  const { error } = await supabase.from("wishlist_shares").update({ is_active: false, revoked_at: new Date().toISOString() }).eq("id", shareId).eq("user_id", profile.id);
  if (error) throw new Error(error.message);
  return { success: true };
}

export function isWishlistShareAccessible(share: { revoked_at?: string | null; expires_at?: string | null } | null, now = Date.now()) {
  return Boolean(share && !share.revoked_at && (!share.expires_at || new Date(share.expires_at).getTime() > now));
}

export async function getSharedWishlist(token: string) {
  const { data: share, error: shareError } = await supabase.from("wishlist_shares").select("user_id, expires_at, revoked_at").eq("token", token).eq("is_active", true).maybeSingle();
  if (shareError) throw new Error(shareError.message);
  if (!share || !isWishlistShareAccessible(share)) return null;
  const { data, error } = await supabase.from("wishlist_items").select("created_at, products(id, name, slug, description, price, original_price, discount_percent, stock_quantity, images, is_featured, is_active, created_at, categories(name, slug), reviews(rating, moderation_status))").eq("user_id", share.user_id).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).flatMap((row: any) => row.products ? [{ addedAt: new Date(row.created_at), ...toProduct(row.products as CatalogRow) }] : []);
}

async function createWishlistAlerts(productId: string, previousPrice: number, nextPrice: number, previousStock: number, nextStock: number) {
  if (nextPrice >= previousPrice && !(previousStock > 5 && nextStock <= 5)) return;
  const { data: items, error } = await supabase.from("wishlist_items").select("id, user_id").eq("product_id", productId);
  if (error) throw new Error(error.message);
  const resolvedAlerts = buildWishlistAlerts(items ?? [], productId, previousPrice, nextPrice, previousStock, nextStock);
  if (resolvedAlerts.length) { const { error: insertError } = await supabase.from("wishlist_alerts").insert(resolvedAlerts); if (insertError) throw new Error(insertError.message); }
}

export async function validateCoupon(code: string, subtotal: number) {
  const normalized = code.trim().toUpperCase();
  const { data, error } = await supabase.from("coupons").select("*").eq("code", normalized).maybeSingle();
  if (error) throw new Error(error.message);
  const valid = Boolean(data && data.is_active && (!data.expiry_date || new Date(data.expiry_date) > new Date()) && (!data.max_uses || data.current_uses < data.max_uses) && subtotal >= Number(data.min_spend));
  return valid ? { valid: true, discountPercent: Math.min(30, Number(data!.discount_percent)), message: `${normalized} applied — ${Math.min(30, Number(data!.discount_percent))}% off.` } : { valid: false, discountPercent: 0, message: "That promotion is not available for the current basket." };
}

export async function uploadPaymentProof(input: { fileName: string; bytes: Buffer; contentType: string; userId?: number }) {
  const cleanName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-") || "receipt.png";
  const objectPath = `${input.userId ?? "guest"}/${Date.now()}-${cleanName}`;
  const { error } = await supabase.storage.from("payment-proofs").upload(objectPath, input.bytes, { contentType: input.contentType, upsert: false });
  if (error) throw new Error(error.message);
  return { path: objectPath };
}

export async function uploadProductImage(input: { fileName: string; bytes: Buffer; contentType: string }) {
  const cleanName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-") || "product.png";
  const objectPath = `${Date.now()}-${cleanName}`;
  const { error } = await supabase.storage.from("product-images").upload(objectPath, input.bytes, { contentType: input.contentType, upsert: false });
  if (error) throw new Error(error.message);
  return supabase.storage.from("product-images").getPublicUrl(objectPath).data;
}

export async function createOrder(input: {
  userId?: number; userName?: string | null; customerName: string; customerPhone: string; deliveryAddress: string; city: string;
  paymentMethod: PaymentMethod; paymentProofUrl?: string; couponCode?: string; items: Array<{ productId: string; quantity: number }>;
}) {
  const productIds = input.items.map(item => item.productId);
  const { data: catalog, error: catalogError } = await supabase.from("products").select("id, name, price, stock_quantity, is_active").in("id", productIds).eq("is_active", true);
  if (catalogError) throw new Error(catalogError.message);
  if (!catalog || catalog.length !== productIds.length) throw new Error("One or more products are no longer available.");
  const lines = input.items.map(item => {
    const product = catalog.find(candidate => candidate.id === item.productId)!;
    if (product.stock_quantity < item.quantity) throw new Error(`${product.name} no longer has enough stock.`);
    const unitPrice = Number(product.price);
    return { product, quantity: item.quantity, unitPrice, totalPrice: unitPrice * item.quantity };
  });
  const subtotal = lines.reduce((sum, line) => sum + line.totalPrice, 0);
  const coupon = input.couponCode ? await validateCoupon(input.couponCode, subtotal) : { valid: false, discountPercent: 0 };
  const totals = calculateOrderTotals(subtotal, coupon.valid ? coupon.discountPercent : 0);
  const profile = input.userId ? await ensureProfile(input.userId, input.userName) : null;
  const orderNumber = `NX-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
  const { data: order, error: orderError } = await supabase.from("orders").insert({
    user_id: profile?.id ?? null, order_number: orderNumber, customer_name: input.customerName, customer_phone: input.customerPhone,
    delivery_address: input.deliveryAddress, city: input.city, payment_method: input.paymentMethod, payment_status: "pending",
    delivery_charge: totals.deliveryCharge, subtotal: totals.subtotal, discount_amount: totals.discountAmount, total_amount: totals.totalAmount,
    order_status: "pending", payment_proof_url: input.paymentProofUrl ?? null,
  }).select("id").single();
  if (orderError || !order) throw new Error(orderError?.message ?? "Unable to create your order.");
  const { error: itemsError } = await supabase.from("order_items").insert(lines.map(line => ({ order_id: order.id, product_id: line.product.id, quantity: line.quantity, unit_price: line.unitPrice, total_price: line.totalPrice })));
  if (itemsError) throw new Error(itemsError.message);
  await Promise.all(lines.map(async line => { const nextStock = line.product.stock_quantity - line.quantity; const { error: stockError } = await supabase.from("products").update({ stock_quantity: nextStock }).eq("id", line.product.id); if (stockError) throw new Error(stockError.message); await createWishlistAlerts(line.product.id, Number(line.product.price), Number(line.product.price), line.product.stock_quantity, nextStock); }));
  if (coupon.valid && input.couponCode) {
    const { data: activeCoupon } = await supabase.from("coupons").select("id, current_uses").eq("code", input.couponCode.trim().toUpperCase()).maybeSingle();
    if (activeCoupon) await supabase.from("coupons").update({ current_uses: activeCoupon.current_uses + 1 }).eq("id", activeCoupon.id);
  }
  return { id: order.id, orderNumber, ...totals, orderStatus: "pending" as const };
}

export async function getUserOrders(userId: number, userName?: string | null) {
  const profile = await ensureProfile(userId, userName);
  const { data, error } = await supabase.from("orders").select("*").eq("user_id", profile.id).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(order => ({ ...order, createdAt: new Date(order.created_at) }));
}

export async function getAdminStats() {
  const [{ data: orders, error: ordersError }, { data: products, error: productsError }] = await Promise.all([
    supabase.from("orders").select("total_amount, order_status"),
    supabase.from("products").select("stock_quantity, is_active"),
  ]);
  if (ordersError || productsError) throw new Error(ordersError?.message ?? productsError?.message);
  const allOrders = orders ?? [];
  const catalog = products ?? [];
  return {
    revenue: allOrders.filter(order => order.order_status === "delivered").reduce((sum, order) => sum + Number(order.total_amount), 0),
    totalOrders: allOrders.length,
    pendingDeliveries: allOrders.filter(order => ["pending", "confirmed", "shipped"].includes(order.order_status)).length,
    activeInventory: catalog.filter(product => product.is_active).length,
    lowStock: catalog.filter(product => product.is_active && product.stock_quantity < 10).length,
  };
}

export async function getProductRecommendations(userId: number, productId: string) {
  const profile = await ensureProfile(userId);
  const [{ data: current, error: currentError }, { data: wishlistRows, error: wishlistError }, { data: catalog, error: catalogError }] = await Promise.all([
    supabase.from("products").select("id, price, category_id").eq("id", productId).maybeSingle(),
    supabase.from("wishlist_items").select("product_id, products(id, price, category_id)").eq("user_id", profile.id).limit(30),
    supabase.from("products").select("id, name, slug, description, price, original_price, discount_percent, category_id, stock_quantity, images, is_featured, is_active, created_at, categories(name, slug), reviews(rating, moderation_status)").eq("is_active", true).neq("id", productId).limit(100),
  ]);
  if (currentError || wishlistError || catalogError) throw new Error(currentError?.message ?? wishlistError?.message ?? catalogError?.message);
  if (!current) return [];
  const wishlistProducts = (wishlistRows ?? []).map((row: any) => Array.isArray(row.products) ? row.products[0] : row.products).filter(Boolean);
  const ranked = rankWishlistRecommendations(current, wishlistProducts, catalog ?? [], 4);
  return ranked.map((row: any) => toProduct({ ...row, categories: Array.isArray(row.categories) ? row.categories[0] : row.categories } as CatalogRow));
}

export async function getAdminAnalytics(input: { from?: string; to?: string } = {}) {
  const [{ data: orders, error: ordersError }, { data: wishlistSaves, error: wishlistError }] = await Promise.all([
    supabase.from("orders").select("created_at, order_status").order("created_at", { ascending: false }).limit(5000),
    supabase.from("wishlist_items").select("created_at, product_id, products(id, name, price, images)").order("created_at", { ascending: false }).limit(5000),
  ]);
  if (ordersError || wishlistError) throw new Error(ordersError?.message ?? wishlistError?.message);
  const filteredOrders = filterAnalyticsByDateRange(orders ?? [], input.from, input.to);
  const filteredWishlistSaves = filterAnalyticsByDateRange(wishlistSaves ?? [], input.from, input.to);
  return buildAdminAnalytics(filteredOrders, filteredWishlistSaves, input.to ? new Date(`${input.to}T23:59:59.999Z`) : new Date());
}

export async function listAdminOrders() {
  const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listAdminProducts() {
  const { data, error } = await supabase.from("products").select("*, categories(name, slug), reviews(rating)").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(row => toProduct(row as CatalogRow));
}

export async function recordProductActivity(input: { adminUserId: number; adminName?: string | null; productId?: string | null; productName: string; action: "created" | "updated"; changes: Record<string, unknown> }) {
  const profile = await ensureProfile(input.adminUserId, input.adminName);
  const { error } = await supabase.from("product_activity_log").insert({ admin_profile_id: profile.id, product_id: input.productId ?? null, product_name: input.productName, action: input.action, changes: input.changes });
  if (error) throw new Error(error.message);
  return { success: true };
}

export async function listProductActivity(input: { userId: number; limit?: number; page?: number; pageSize?: number; administrator?: string; action?: "created" | "updated"; from?: string; to?: string }) {
  await ensureProfile(input.userId);
  const { data, error } = await supabase.from("product_activity_log").select("id, action, product_id, product_name, changes, created_at, profiles(full_name), products(name, slug)").order("created_at", { ascending: false }).limit(100);
  if (error) throw new Error(error.message);
  const entries = (data ?? []).map((entry: any) => ({ id: entry.id, action: entry.action, productId: entry.product_id, productName: entry.product_name, changes: entry.changes ?? {}, createdAt: new Date(entry.created_at), adminName: entry.profiles?.full_name ?? "Admin", productSlug: entry.products?.slug ?? null })) as ProductActivityEntry[];
  const filtered = filterProductActivity(entries, { ...input, limit: 50 });
  const pageSize = Math.min(Math.max(input.pageSize ?? 10, 1), 25);
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(input.page ?? 1, 1), totalPages);
  return { items: filtered.slice((page - 1) * pageSize, page * pageSize), page, pageSize, total, totalPages };
}

export async function saveProduct(input: { id?: string; name: string; slug: string; description: string; price: number; originalPrice?: number | null; categoryId: string; stockQuantity: number; images: string[]; isFeatured: boolean; isActive: boolean; adminUserId?: number; adminName?: string | null }) {
  const discountPercent = input.originalPrice && input.originalPrice > input.price ? Math.round(((input.originalPrice - input.price) / input.originalPrice) * 100) : 0;
  const payload = { name: input.name, slug: input.slug, description: input.description, price: input.price, original_price: input.originalPrice ?? null, discount_percent: discountPercent, category_id: input.categoryId, stock_quantity: input.stockQuantity, images: input.images, is_featured: input.isFeatured, is_active: input.isActive };
  let previous: { price: number; stock_quantity: number } | null = null;
  if (input.id) { try { const productTable = supabase.from("products") as any; if (typeof productTable.select === "function") { const { data, error: readError } = await productTable.select("price, stock_quantity").eq("id", input.id).maybeSingle(); if (readError) throw new Error(readError.message); previous = data ? { price: Number(data.price), stock_quantity: Number(data.stock_quantity) } : null; } } catch (error) { if (!(error instanceof Error && error.message.startsWith("Unexpected table:"))) throw error; } }
  const query = input.id ? supabase.from("products").update(payload).eq("id", input.id) : supabase.from("products").insert(payload);
  const { error } = await query;
  if (error) throw new Error(error.message);
  if (input.id && previous) {
    await createWishlistAlerts(input.id, previous.price, input.price, previous.stock_quantity, input.stockQuantity);
    if (previous.stock_quantity === 0 && input.stockQuantity > 0) await sendPendingRestockNotifications(input.id, input.name);
  }
  if (input.adminUserId) {
    let productId = input.id ?? null;
    if (!productId) { const { data: created } = await supabase.from("products").select("id").eq("slug", input.slug).maybeSingle(); productId = created?.id ?? null; }
    await recordProductActivity({ adminUserId: input.adminUserId, adminName: input.adminName, productId, productName: input.name, action: input.id ? "updated" : "created", changes: input.id ? { price: input.price, stockQuantity: input.stockQuantity, isActive: input.isActive } : { price: input.price, stockQuantity: input.stockQuantity, isActive: input.isActive } });
  }
  return { success: true };
}

export async function requestRestock(input: { productId: string; email: string; ipAddress: string }) {
  const email = normalizeRestockEmail(input.email);
  if (!email) throw new Error("Enter a valid email address.");
  const { data: preference } = await supabase.from("customer_email_preferences").select("alert_emails_enabled").eq("email", email).maybeSingle();
  if (preference && !preference.alert_emails_enabled) throw new Error("Email alerts are disabled in your settings.");
  const { data: product, error: productError } = await supabase.from("products").select("id, name, is_active, stock_quantity").eq("id", input.productId).maybeSingle();
  if (productError) throw new Error(productError.message);
  if (!product || !product.is_active) throw new Error("This product is no longer available.");
  if (product.stock_quantity > 0) throw new Error("This item is available now—add it to your cart instead.");
  const ipHash = createHash("sha256").update(input.ipAddress || "unknown").digest("hex");
  const emailHash = createHash("sha256").update(email).digest("hex");
  const { data: allowed, error: limitError } = await supabase.rpc("consume_restock_request_limit", { p_ip_hash: ipHash, p_email_hash: emailHash, p_now: new Date().toISOString() });
  if (limitError) throw new Error(limitError.message);
  if (!allowed) throw new Error("Too many notification requests. Please try again later.");
  const { error } = await supabase.from("restock_requests").upsert({ product_id: input.productId, email, status: "pending", updated_at: new Date().toISOString() }, { onConflict: "product_id,email" });
  if (error) throw new Error(error.message);
  return { success: true, productName: product.name };
}

export function buildRestockEmail(productName: string) {
  return {
    subject: `${productName} is back at Nexus Drop`,
    text: `Good news: ${productName} is back in stock at Nexus Drop. Visit the store to shop the latest drop.`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#101821"><h2>${productName} is back in stock</h2><p>Your requested item is available again at Nexus Drop.</p><p>Visit the store to shop the latest drop.</p></div>`,
  };
}

export async function sendPendingRestockNotifications(productId: string, productName: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) return { sent: 0, skipped: true };
  const { data: requests, error } = await supabase.from("restock_requests").select("id, email").eq("product_id", productId).eq("status", "pending").limit(500);
  if (error) throw new Error(error.message);
  const email = buildRestockEmail(productName);
  let sent = 0;
  for (const request of requests ?? []) {
    const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": `nexus-restock-${request.id}` }, body: JSON.stringify({ from, to: request.email, subject: email.subject, text: email.text, html: email.html }) });
    const result = await response.json().catch(() => ({}));
    if (response.ok) {
      await supabase.from("restock_requests").update({ status: "sent", sent_at: new Date().toISOString(), provider_message_id: result.id ?? null, updated_at: new Date().toISOString(), last_error: null }).eq("id", request.id);
      sent += 1;
    } else {
      await supabase.from("restock_requests").update({ status: "failed", last_error: `Resend ${response.status}: ${result.message ?? "Email delivery failed"}`, updated_at: new Date().toISOString() }).eq("id", request.id);
    }
  }
  return { sent, skipped: false };
}

export async function getPaymentProofUrl(orderId: string) {
  const { data: order, error } = await supabase.from("orders").select("payment_proof_url").eq("id", orderId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!order?.payment_proof_url) return null;
  const { data, error: signedError } = await supabase.storage.from("payment-proofs").createSignedUrl(order.payment_proof_url, 600);
  if (signedError) throw new Error(signedError.message);
  return data.signedUrl;
}

export async function updateOrder(input: { id: string; orderStatus: OrderStatus; paymentStatus: PaymentStatus }) {
  const { error } = await supabase.from("orders").update({ order_status: input.orderStatus, payment_status: input.paymentStatus }).eq("id", input.id);
  if (error) throw new Error(error.message);
  return { success: true };
}

export async function listCoupons() {
  const { data, error } = await supabase.from("coupons").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function saveCoupon(input: { id?: string; code: string; discountPercent: number; minSpend: number; maxUses?: number | null; isActive: boolean; expiryDate?: Date | null }) {
  const payload = { code: input.code.trim().toUpperCase(), discount_percent: input.discountPercent, min_spend: input.minSpend, max_uses: input.maxUses ?? null, is_active: input.isActive, expiry_date: input.expiryDate?.toISOString() ?? null };
  const query = input.id ? supabase.from("coupons").update(payload).eq("id", input.id) : supabase.from("coupons").insert(payload);
  const { error } = await query;
  if (error) throw new Error(error.message);
  return { success: true };
}


export type CustomerAddressInput = {
  label: string;
  fullName: string;
  phone: string;
  addressLine: string;
  city: string;
  isDefault?: boolean;
};

function addressPayload(input: CustomerAddressInput) {
  return {
    label: input.label.trim(),
    full_name: input.fullName.trim(),
    phone: input.phone.trim(),
    address_line: input.addressLine.trim(),
    city: input.city.trim(),
    is_default: Boolean(input.isDefault),
  };
}

export async function listCustomerAddresses(userId: number, userName?: string | null) {
  const profile = await ensureProfile(userId, userName);
  const { data, error } = await supabase.from("customer_addresses").select("id, label, full_name, phone, address_line, city, is_default, created_at, updated_at").eq("user_id", profile.id).order("is_default", { ascending: false }).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((address: any) => ({ id: address.id, label: address.label, fullName: address.full_name, phone: address.phone, addressLine: address.address_line, city: address.city, isDefault: Boolean(address.is_default), createdAt: new Date(address.created_at), updatedAt: new Date(address.updated_at) }));
}

export async function createCustomerAddress(userId: number, input: CustomerAddressInput, userName?: string | null) {
  const profile = await ensureProfile(userId, userName);
  const payload = addressPayload(input);
  if (payload.is_default) await supabase.from("customer_addresses").update({ is_default: false }).eq("user_id", profile.id);
  const { data, error } = await supabase.from("customer_addresses").insert({ ...payload, user_id: profile.id }).select("id, label, full_name, phone, address_line, city, is_default, created_at, updated_at").single();
  if (error || !data) throw new Error(error?.message ?? "Unable to save address.");
  return { id: data.id, label: data.label, fullName: data.full_name, phone: data.phone, addressLine: data.address_line, city: data.city, isDefault: Boolean(data.is_default), createdAt: new Date(data.created_at), updatedAt: new Date(data.updated_at) };
}

export async function updateCustomerAddress(userId: number, addressId: string, input: CustomerAddressInput, userName?: string | null) {
  const profile = await ensureProfile(userId, userName);
  const payload = addressPayload(input);
  if (payload.is_default) await supabase.from("customer_addresses").update({ is_default: false }).eq("user_id", profile.id).neq("id", addressId);
  const { data, error } = await supabase.from("customer_addresses").update(payload).eq("id", addressId).eq("user_id", profile.id).select("id, label, full_name, phone, address_line, city, is_default, created_at, updated_at").single();
  if (error || !data) throw new Error(error?.message ?? "Unable to update address.");
  return { id: data.id, label: data.label, fullName: data.full_name, phone: data.phone, addressLine: data.address_line, city: data.city, isDefault: Boolean(data.is_default), createdAt: new Date(data.created_at), updatedAt: new Date(data.updated_at) };
}

export async function deleteCustomerAddress(userId: number, addressId: string, userName?: string | null) {
  const profile = await ensureProfile(userId, userName);
  const { error } = await supabase.from("customer_addresses").delete().eq("id", addressId).eq("user_id", profile.id);
  if (error) throw new Error(error.message);
  return { success: true };
}

export async function setDefaultCustomerAddress(userId: number, addressId: string, userName?: string | null) {
  const profile = await ensureProfile(userId, userName);
  await supabase.from("customer_addresses").update({ is_default: false }).eq("user_id", profile.id);
  const { error } = await supabase.from("customer_addresses").update({ is_default: true }).eq("id", addressId).eq("user_id", profile.id);
  if (error) throw new Error(error.message);
  return { success: true };
}
