import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Nexus Drop branding metadata", () => {
  it("declares the refined favicon and social preview tags", () => {
    const html = readFileSync(new URL("../client/index.html", import.meta.url), "utf8");
    expect(html).toContain('rel="icon" href="/favicon.svg"');
    expect(html).toContain('property="og:title"');
    expect(html).toContain('property="og:image" content="/favicon.svg"');
    expect(html).toContain('name="twitter:card" content="summary"');
  });
});
