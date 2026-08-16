export type ProductActivityEntry = {
  id: string;
  action: "created" | "updated";
  productId: string | null;
  productName: string;
  changes: Record<string, unknown>;
  createdAt: Date;
  adminName: string;
  productSlug: string | null;
};

export type ProductActivityFilter = {
  administrator?: string;
  action?: "created" | "updated";
  from?: string;
  to?: string;
  limit?: number;
};

export function filterProductActivity(entries: ProductActivityEntry[], input: ProductActivityFilter = {}) {
  const fromMs = input.from ? new Date(input.from).getTime() : undefined;
  const toMs = input.to ? new Date(`${input.to}T23:59:59.999Z`).getTime() : undefined;
  const administrator = input.administrator?.trim().toLowerCase();
  return entries.filter(entry => {
    const time = entry.createdAt.getTime();
    return (!input.action || entry.action === input.action)
      && (!administrator || entry.adminName.toLowerCase().includes(administrator))
      && (fromMs === undefined || time >= fromMs)
      && (toMs === undefined || time <= toMs);
  }).slice(0, Math.min(Math.max(input.limit ?? 10, 1), 50));
}
