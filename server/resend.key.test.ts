import { describe, expect, it } from "vitest";

describe("Resend server credential", () => {
  it("authenticates against the domains endpoint without sending mail", async () => {
    const key = process.env.RESEND_API_KEY;
    expect(key, "RESEND_API_KEY must be configured").toBeTruthy();
    const response = await fetch("https://api.resend.com/domains", { headers: { Authorization: `Bearer ${key}` } });
    expect(response.status).not.toBe(401);
    expect(response.status).not.toBe(403);
  }, 15_000);
});
