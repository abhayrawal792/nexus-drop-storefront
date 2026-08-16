export function normalizeReviewFilters(input: { status?: "pending" | "approved" | "rejected"; verified?: boolean } = {}) {
  return { ...(input.status ? { status: input.status } : {}), ...(input.verified === undefined ? {} : { verified: input.verified }) };
}
