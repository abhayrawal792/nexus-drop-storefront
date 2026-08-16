import { describe, expect, it } from "vitest";

describe("Supabase configuration", () => {
  it("connects to the configured project with the server key", async () => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_KEY;

    expect(url).toMatch(/^https:\/\//);
    expect(key).toBeTruthy();

    const response = await fetch(`${url}/rest/v1/`, {
      headers: { apikey: key!, Authorization: `Bearer ${key}` },
    });

    expect(response.ok).toBe(true);
  });
});
