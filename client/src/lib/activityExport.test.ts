import { describe, expect, it } from "vitest";
import { buildActivityCsv } from "./activityExport";

describe("buildActivityCsv", () => {
  it("exports only the supplied filtered entries with safe CSV quoting", () => {
    const csv = buildActivityCsv([
      {
        createdAt: "2026-08-16T00:00:00.000Z",
        adminName: "Store Admin",
        action: "updated",
        productName: 'Nexus "Night" Bag',
        productId: "p-1",
        changes: { stockQuantity: 2 },
      },
    ]);
    expect(csv.split("\n")).toHaveLength(2);
    expect(csv).toContain('"Nexus ""Night"" Bag"');
    expect(csv).toContain('"{""stockQuantity"":2}"');
    expect(csv).not.toContain("p-2");
  });

  it("includes a stable export header and empty optional fields", () => {
    expect(buildActivityCsv([{ createdAt: new Date("2026-08-16T00:00:00.000Z"), action: "created", productName: "Cap" }])).toBe(
      '"Timestamp","Administrator","Action","Product","Product ID","Changes"\n"2026-08-16T00:00:00.000Z","","created","Cap","","{}"',
    );
  });
});
