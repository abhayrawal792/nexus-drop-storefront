export type BuyNowProduct = {
  id: string;
  stockQuantity: number;
};

export type BuyNowCartLine<T extends BuyNowProduct> = {
  product: T;
  quantity: number;
};

export function buildBuyNowCart<T extends BuyNowProduct>(product: T, requestedQuantity = 1): BuyNowCartLine<T>[] {
  if (product.stockQuantity < 1) return [];
  return [{ product, quantity: Math.max(1, Math.min(requestedQuantity, product.stockQuantity)) }];
}
