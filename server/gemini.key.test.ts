import { describe, expect, it } from "vitest";

describe("Gemini key configuration", () => {
  it("can list models with the configured key", async () => {
    const key = process.env.GEMINI_API_KEY;
    expect(key).toBeTruthy();
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key!)}`);
    expect(response.ok).toBe(true);
  }, 30_000);
});
