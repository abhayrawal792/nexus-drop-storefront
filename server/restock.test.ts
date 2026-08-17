import { describe, expect, it } from "vitest";
import { normalizeRestockEmail } from "./commerce";

describe("restock notification validation", () => {
  it("normalizes valid emails", () => {
    expect(normalizeRestockEmail("  Shopper@Example.COM ")).toBe("shopper@example.com");
  });

  it("rejects malformed emails", () => {
    expect(normalizeRestockEmail("not-an-email")).toBeNull();
    expect(normalizeRestockEmail("shopper@example")).toBeNull();
  });
});
