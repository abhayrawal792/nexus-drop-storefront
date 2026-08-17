import { describe, expect, it } from "vitest";
import { buildRestockFailureCsv } from "./analyticsExport";

describe("buildRestockFailureCsv", () => {
  it("exports only supplied filtered failures with exact provider errors safely quoted", () => {
    const csv = buildRestockFailureCsv([{ productName: 'Night "Bag"', categoryName: "Bags", email: "buyer@example.com", errorType: "provider", error: 'Provider said: "bounce"', failedAt: "2026-08-17T00:00:00.000Z" }]);
    expect(csv.split("\n")).toHaveLength(2);
    expect(csv).toContain('"Night ""Bag"""');
    expect(csv).toContain('"Provider said: ""bounce"""');
    expect(csv).not.toContain("other@example.com");
  });
});
