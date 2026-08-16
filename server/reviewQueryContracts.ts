export const publicReviewSelect =
  "id, rating, comment, created_at, verified_purchase, profiles!reviews_user_id_fkey(full_name)";

export const adminReviewSelect =
  "id, product_id, rating, comment, created_at, moderation_status, verified_purchase, profiles!reviews_user_id_fkey(full_name), products(name, slug), review_moderation_history(id, from_status, to_status, note, created_at, profiles!review_moderation_history_moderator_id_fkey(full_name))";
