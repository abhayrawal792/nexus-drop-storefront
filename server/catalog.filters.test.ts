import { describe, expect, it } from "vitest";
import { normalizeCatalogFilters } from "./commerce";

describe("catalog price filters", () => {
  it("keeps non-negative minimum and maximum prices", () => {
    expect(normalizeCatalogFilters({ minPrice: 500, maxPrice: 2500 })).toEqual({ minPrice: 500, maxPrice: 2500 });
  });

  it("drops invalid negative values and reversed ranges", () => {
    expect(normalizeCatalogFilters({ minPrice: -10, maxPrice: 400 })).toEqual({ maxPrice: 400 });
    expect(normalizeCatalogFilters({ minPrice: 3000, maxPrice: 1000 })).toEqual({});
  });

  it("leaves an empty filter unset", () => {
    expect(normalizeCatalogFilters({})).toEqual({});
  });
});
