export function hasWishlistPriceDrop(price: number, priceAtAdded: number | null | undefined) {
  return priceAtAdded !== null && priceAtAdded !== undefined && price < priceAtAdded;
}
