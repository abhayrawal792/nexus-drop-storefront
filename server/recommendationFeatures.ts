export type RecommendationCandidate = {
  id: string;
  category_id?: string | null;
  price?: number | null;
};

export function rankWishlistRecommendations<T extends RecommendationCandidate>(current: RecommendationCandidate, wishlist: RecommendationCandidate[], candidates: T[], limit = 4) {
  const wishlistIds = new Set(wishlist.map(item => item.id));
  const wishlistCategories = new Set(wishlist.map(item => item.category_id).filter(Boolean));
  return [...candidates]
    .filter(item => item.id !== current.id && !wishlistIds.has(item.id))
    .sort((a, b) => {
      const score = (item: RecommendationCandidate) => {
        const categoryScore = item.category_id === current.category_id ? 3 : wishlistCategories.has(item.category_id) ? 2 : 0;
        const priceScore = current.price && item.price ? Math.max(0, 1 - Math.abs(Number(item.price) - Number(current.price)) / Number(current.price)) : 0;
        return categoryScore + priceScore;
      };
      return score(b) - score(a) || String(a.id).localeCompare(String(b.id));
    })
    .slice(0, limit);
}
