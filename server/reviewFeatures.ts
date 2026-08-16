export function normalizeReviewFilters(input: { status?: "pending" | "approved" | "rejected"; verified?: boolean; search?: string; from?: string; to?: string } = {}) {
  const search = input.search?.trim();
  return { ...(input.status ? { status: input.status } : {}), ...(input.verified === undefined ? {} : { verified: input.verified }), ...(search ? { search } : {}), ...(input.from ? { from: input.from } : {}), ...(input.to ? { to: input.to } : {}) };
}
