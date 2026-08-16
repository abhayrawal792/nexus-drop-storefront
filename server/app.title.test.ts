import { describe, expect, it } from "vitest";

describe("app title configuration", () => {
  it("keeps the storefront title configured for Nexus Drop", () => {
    expect(process.env.VITE_APP_TITLE).toBe("Nexus Drop");
  });
});
