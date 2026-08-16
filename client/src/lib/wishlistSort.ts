export type WishlistSort = "newest" | "oldest" | "price-low" | "price-high";

export function sortWishlistItems<T extends { price: number | string; addedAt?: Date | string | null }>(items: T[], sortBy: WishlistSort) {
  return [...items].sort((a, b) => {
    if (sortBy === "price-low" || sortBy === "price-high") {
      const difference = Number(a.price) - Number(b.price);
      return sortBy === "price-low" ? difference : -difference;
    }
    const difference = new Date(a.addedAt ? String(a.addedAt) : 0).getTime() - new Date(b.addedAt ? String(b.addedAt) : 0).getTime();
    return sortBy === "oldest" ? difference : -difference;
  });
}
