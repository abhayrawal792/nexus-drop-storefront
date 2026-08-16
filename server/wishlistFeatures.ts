export type WishlistAlertRow = { user_id: string; product_id: string; wishlist_item_id: string; alert_type: "price_drop" | "low_stock"; previous_value: number; current_value: number };

export function buildWishlistAlerts(items: Array<{ id: string; user_id: string }>, productId: string, previousPrice: number, nextPrice: number, previousStock: number, nextStock: number): WishlistAlertRow[] {
  const priceDrop = nextPrice < previousPrice;
  const lowStock = previousStock > 5 && nextStock <= 5;
  return items.flatMap(item => [
    ...(priceDrop ? [{ user_id: item.user_id, product_id: productId, wishlist_item_id: item.id, alert_type: "price_drop" as const, previous_value: previousPrice, current_value: nextPrice }] : []),
    ...(lowStock ? [{ user_id: item.user_id, product_id: productId, wishlist_item_id: item.id, alert_type: "low_stock" as const, previous_value: previousStock, current_value: nextStock }] : []),
  ]);
}
