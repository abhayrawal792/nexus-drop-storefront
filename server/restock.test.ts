import { describe, expect, it } from "vitest";
import { buildAlertReenabledEmail, buildRestockEmail, normalizeRestockEmail } from "./commerce";

describe("restock notification validation", () => {
  it("normalizes valid emails", () => {
    expect(normalizeRestockEmail("  Shopper@Example.COM ")).toBe("shopper@example.com");
  });

  it("rejects malformed emails", () => {
    expect(normalizeRestockEmail("not-an-email")).toBeNull();
    expect(normalizeRestockEmail("shopper@example")).toBeNull();
  });

  it("builds a back-in-stock email payload", () => {
    const message = buildRestockEmail("Black Roll-Top Backpack");
    expect(message.subject).toContain("Black Roll-Top Backpack");
    expect(message.text).toContain("back in stock");
    expect(message.html).toContain("Black Roll-Top Backpack");
  });

  it("builds an alert re-enable confirmation email", () => {
    const message = buildAlertReenabledEmail();
    expect(message.subject).toContain("enabled again");
    expect(message.text.toLowerCase()).toContain("back-in-stock alerts");
    expect(message.html).toContain("Alerts enabled again");
  });
});
