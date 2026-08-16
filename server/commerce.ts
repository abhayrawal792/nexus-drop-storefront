import { calculateOrderTotals } from "../shared/commerce";
import { supabase } from "./supabase";

export type PaymentMethod = "COD" | "eSewa" | "Khalti" | "FonePay" | "BankTransfer";
export type OrderStatus = "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
export type PaymentStatus = "pending" | "verified" | "failed";

type CatalogRow = {
  id: string; name: string; slug: string; description: string; price: number | string; original_price: number | string | null;
  discount_percent: number; category_id: string; stock_quantity: number; images: string[]; is_featured: boolean; is_active: boolean; created_at: string;
  categories: { name: string; slug: string } | null; reviews?: Array<{ rating: number }> | null;
};

function toProduct(row: CatalogRow) {
  const reviewCount = row.reviews?.length ?? 0;
  const averageRating = reviewCount ? Number((row.reviews!.reduce((sum, review) => sum + review.rating, 0) / reviewCount).toFixed(1)) : null;
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

export async function listProducts(input: { category?: string; search?: string; sort?: "newest" | "price-low" | "price-high" }) {
  let query = supabase.from("products").select("*, categories(name, slug), reviews(rating)").eq("is_active", true);
  if (input.category) {
    const { data: category, error: categoryError } = await supabase.from("categories").select("id").eq("slug", input.category).maybeSingle();
    if (categoryError) throw new Error(categoryError.message);
    if (!category) return [];
    query = query.eq("category_id", category.id);
  }
  if (input.search?.trim()) query = query.or(`name.ilike.%${input.search.trim()}%,description.ilike.%${input.search.trim()}%`);
  if (input.sort === "price-low") query = query.order("price", { ascending: true });
  else if (input.sort === "price-high") query = query.order("price", { ascending: false });
  else query = query.order("created_at", { ascending: false });
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map(row => toProduct(row as CatalogRow));
}

export async function getProduct(slug: string) {
  const { data, error } = await supabase.from("products").select("*, categories(name, slug)").eq("slug", slug).eq("is_active", true).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toProduct(data as CatalogRow) : null;
}

export async function listReviews(productId: string) {
  const { data, error } = await supabase.from("reviews").select("id, rating, comment, created_at, profiles(full_name)").eq("product_id", productId).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((review: any) => ({ id: review.id, rating: review.rating, comment: review.comment, createdAt: new Date(review.created_at), author: review.profiles?.full_name ?? "Verified customer" }));
}

export async function createReview(input: { productId: string; userId: number; userName?: string | null; rating: number; comment: string }) {
  const profile = await ensureProfile(input.userId, input.userName);
  const { error } = await supabase.from("reviews").insert({ product_id: input.productId, user_id: profile.id, rating: input.rating, comment: input.comment });
  if (error) throw new Error(error.message);
  return { success: true };
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
  await Promise.all(lines.map(line => supabase.from("products").update({ stock_quantity: line.product.stock_quantity - line.quantity }).eq("id", line.product.id)));
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

export async function saveProduct(input: { id?: string; name: string; slug: string; description: string; price: number; originalPrice?: number | null; categoryId: string; stockQuantity: number; images: string[]; isFeatured: boolean; isActive: boolean }) {
  const discountPercent = input.originalPrice && input.originalPrice > input.price ? Math.round(((input.originalPrice - input.price) / input.originalPrice) * 100) : 0;
  const payload = { name: input.name, slug: input.slug, description: input.description, price: input.price, original_price: input.originalPrice ?? null, discount_percent: discountPercent, category_id: input.categoryId, stock_quantity: input.stockQuantity, images: input.images, is_featured: input.isFeatured, is_active: input.isActive };
  const query = input.id ? supabase.from("products").update(payload).eq("id", input.id) : supabase.from("products").insert(payload);
  const { error } = await query;
  if (error) throw new Error(error.message);
  return { success: true };
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
