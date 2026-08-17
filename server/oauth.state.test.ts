import { describe, expect, it } from "vitest";
import { decodeOAuthState, encodeOAuthState } from "@shared/const";

describe("OAuth state binding", () => {
  it("round-trips the current callback origin and nonce", () => {
    const state = encodeOAuthState({ redirectUri: "https://store.example/api/oauth/callback", nonce: "nonce-123" });
    expect(decodeOAuthState(state)).toEqual({ redirectUri: "https://store.example/api/oauth/callback", nonce: "nonce-123" });
  });

  it("returns an empty redirect for malformed base64", () => {
    expect(decodeOAuthState("not-valid-base64-%%")).toEqual({ redirectUri: "" });
  });
});
