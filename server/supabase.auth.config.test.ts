import { describe, expect, it } from "vitest";

describe("Supabase Auth OTP configuration", () => {
  it("accepts the configured public Supabase credentials", async () => {
    const url = process.env.VITE_SUPABASE_URL;
    const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    expect(url).toBeTruthy();
    const projectUrl = new URL(url as string);
    expect(projectUrl.protocol).toBe("https:");
    expect(projectUrl.hostname).toMatch(/^[a-z0-9-]+\.supabase\.co$/i);
    expect(key).toBeTruthy();

    const response = await fetch(`${projectUrl.origin}/auth/v1/settings`, {
      headers: { apikey: key as string },
    });

    expect(response.ok).toBe(true);
  }, 15_000);
});
