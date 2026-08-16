export type ActivityExportEntry = {
  id?: string;
  createdAt: string | Date;
  adminName?: string | null;
  action: string;
  productName: string;
  productId?: string | null;
  changes?: Record<string, unknown> | null;
};

const csvCell = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;

export function buildActivityCsv(items: ActivityExportEntry[]) {
  return [
    ["Timestamp", "Administrator", "Action", "Product", "Product ID", "Changes"],
    ...items.map(entry => [
      new Date(entry.createdAt).toISOString(),
      entry.adminName ?? "",
      entry.action,
      entry.productName,
      entry.productId ?? "",
      JSON.stringify(entry.changes ?? {}),
    ]),
  ].map(row => row.map(csvCell).join(",")).join("\n");
}
