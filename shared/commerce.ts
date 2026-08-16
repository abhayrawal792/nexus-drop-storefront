export const STANDARD_DELIVERY_CHARGE = 150;
export const FREE_DELIVERY_THRESHOLD = 3000;
export const MAX_COUPON_DISCOUNT = 30;

export function calculateOrderTotals(subtotal: number, discountPercent = 0) {
  const normalizedSubtotal = Math.max(0, Math.round(subtotal));
  const normalizedDiscount = Math.max(0, Math.min(MAX_COUPON_DISCOUNT, discountPercent));
  const discountAmount = Math.round((normalizedSubtotal * normalizedDiscount) / 100);
  const deliveryCharge = normalizedSubtotal > FREE_DELIVERY_THRESHOLD ? 0 : STANDARD_DELIVERY_CHARGE;
  const totalAmount = Math.max(0, normalizedSubtotal - discountAmount + deliveryCharge);

  return { subtotal: normalizedSubtotal, discountAmount, deliveryCharge, totalAmount };
}

export function discountedPrice(price: number, originalPrice?: number | null) {
  const base = originalPrice && originalPrice > price ? originalPrice : price;
  return Math.round(((base - price) / base) * 100);
}
