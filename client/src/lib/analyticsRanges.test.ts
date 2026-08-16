import { describe, expect, it } from "vitest";
import { getAnalyticsQuickRange } from "./analyticsRanges";

describe("analytics quick ranges", () => {
  const now = new Date("2026-08-16T12:00:00Z");
  it("returns an inclusive seven-day window", () => {
    expect(getAnalyticsQuickRange("last7", now)).toEqual({ from: "2026-08-10", to: "2026-08-16" });
  });
  it("returns same-day and inclusive thirty-day windows", () => {
    expect(getAnalyticsQuickRange("today", now)).toEqual({ from: "2026-08-16", to: "2026-08-16" });
    expect(getAnalyticsQuickRange("last30", now)).toEqual({ from: "2026-07-18", to: "2026-08-16" });
  });
  it("returns the first and current day of the month", () => {
    expect(getAnalyticsQuickRange("this-month", now)).toEqual({ from: "2026-08-01", to: "2026-08-16" });
  });
});
