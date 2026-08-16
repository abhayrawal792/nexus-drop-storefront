import { describe, expect, it } from "vitest";

describe("Gemini integration", () => {
  it("accepts the configured API key for model discovery", async () => {
    const key = process.env.GEMINI_API_KEY;
    expect(key).toBeTruthy();
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key!)}`);
    expect(response.ok).toBe(true);
    const body = await response.json() as { models?: unknown[] };
    expect(Array.isArray(body.models)).toBe(true);
  }, 30_000);
});
