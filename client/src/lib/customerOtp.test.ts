import { describe, expect, it } from "vitest";
import { isValidCustomerEmail, isValidCustomerOtp, normalizeCustomerEmail } from "./customerOtp";

describe("customer OTP validation", () => {
  it("normalizes and validates customer email addresses", () => {
    expect(normalizeCustomerEmail("  Buyer@Example.COM ")).toBe("buyer@example.com");
    expect(isValidCustomerEmail("buyer@example.com")).toBe(true);
    expect(isValidCustomerEmail("not-an-email")).toBe(false);
  });

  it("accepts exactly six numeric OTP digits", () => {
    expect(isValidCustomerOtp("123456")).toBe(true);
    expect(isValidCustomerOtp("12345")).toBe(false);
    expect(isValidCustomerOtp("1234567")).toBe(false);
    expect(isValidCustomerOtp("12a456")).toBe(false);
  });
});
