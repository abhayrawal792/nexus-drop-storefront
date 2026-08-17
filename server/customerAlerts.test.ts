import { describe, expect, it } from "vitest";
import { isManageableRestockStatus, normalizeRestockEmail } from "./commerce";

describe("customer restock alert management", () => {
  it("allows customers to manage pending and failed alerts only", () => {
    expect(isManageableRestockStatus("pending")).toBe(true);
    expect(isManageableRestockStatus("failed")).toBe(true);
    expect(isManageableRestockStatus("sent")).toBe(false);
    expect(isManageableRestockStatus("cancelled")).toBe(false);
  });

  it("matches alert ownership using normalized email", () => {
    expect(normalizeRestockEmail(" Customer@Example.com ")).toBe("customer@example.com");
  });
});
