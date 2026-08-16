export function getQuickViewPurchaseState(stockQuantity: number) {
  return { canPurchase: stockQuantity > 0, stockLabel: stockQuantity > 0 ? `${stockQuantity} in stock` : "Currently sold out" };
}
