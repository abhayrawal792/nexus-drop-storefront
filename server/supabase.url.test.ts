import { describe, expect, it } from "vitest";

describe("Supabase URL configuration", () => {
  it("responds to the configured REST endpoint", async () => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_KEY;
    expect(url).toBeTruthy();
    expect(key).toBeTruthy();
    const response = await fetch(`${url}/rest/v1/categories?select=id&limit=1`, { headers: { apikey: key!, Authorization: `Bearer ${key!}` } });
    expect(response.ok).toBe(true);
  }, 30_000);
});
