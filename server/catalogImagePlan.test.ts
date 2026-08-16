import { describe, expect, it } from "vitest";

const categoryBySlug = {
  jewelry: ["cuban-chain", "signet-ring", "iced-tennis-bracelet", "razor-pendant", "curb-link-bracelet", "steel-ear-cuff"],
  watches: ["chrono-watch", "minimal-square-watch", "blackout-field-watch", "digital-sport-watch", "steel-mesh-watch", "skeleton-dial-watch"],
  eyewear: ["cyberpunk-sunglasses", "smoke-oval-sunglasses", "polarized-sport-wraps", "clear-frame-glasses", "matte-black-wayfarers", "chrome-shield-sunglasses"],
  bags: ["sling-bag", "tech-utility-crossbody", "mini-messenger-bag", "black-roll-top-backpack", "canvas-tote-bag", "compact-waist-pack"],
} as const;

describe("expanded catalog image plan", () => {
  it("gives every storefront category six distinct product-specific image slugs", () => {
    for (const products of Object.values(categoryBySlug)) {
      expect(products).toHaveLength(6);
      expect(new Set(products).size).toBe(products.length);
    }
  });
});
