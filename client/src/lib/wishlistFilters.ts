export type WishlistFilterAvailability = "all" | "in-stock" | "low-stock" | "out-of-stock";

export function filterWishlistItems<T extends { price: number | string; stockQuantity: number | string }>(items: T[], minPrice: string, maxPrice: string, availability: WishlistFilterAvailability) {
  const min = minPrice ? Number(minPrice) : 0;
  const max = maxPrice ? Number(maxPrice) : Number.POSITIVE_INFINITY;
  return items.filter(item => {
    const price = Number(item.price);
    const stock = Number(item.stockQuantity);
    const availabilityMatch = availability === "all" || (availability === "in-stock" && stock > 5) || (availability === "low-stock" && stock > 0 && stock <= 5) || (availability === "out-of-stock" && stock <= 0);
    return price >= min && price <= max && availabilityMatch;
  });
}
