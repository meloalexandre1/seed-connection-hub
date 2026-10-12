import { describe, expect, it } from "vitest";
import { describeGoogleDriveOAuthFailure, describeGoogleDrivePopupError } from "./googleOAuthDiagnostics";

describe("Google OAuth diagnostics: no secrets in errors", () => {
  it.each([
    ["invalid_client", "CLIENT_SECRET"],
    ["invalid_grant", "Código"],
    ["redirect_uri_mismatch", "redirect"],
    ["unauthorized_client", "OAuth"],
    ["access_denied", "permissão"],
    ["invalid_request", "OAuth"],
  ])("classifies token errors %s", (error, expected) => {
    const result = describeGoogleDriveOAuthFailure(400, {
      error,
      error_description: "secret=do-not-expose&code=one-time-code",
    });
    expect(result.toLowerCase()).toContain(expected.toLowerCase());
    expect(result).not.toContain("do-not-expose");
    expect(result).not.toContain("one-time-code");
  });
  it("does not print unknown Google response bodies", () => {
    const result = describeGoogleDriveOAuthFailure(500, {
      error: "unexpected_secret", token: "not-for-display",
    });
    expect(result).toContain("HTTP 500");
    expect(result).not.toContain("not-for-display");
    expect(result).not.toContain("unexpected_secret");
  });
  it("distinguishes popup denial and mismatch", () => {
    expect(describeGoogleDrivePopupError("access_denied")).toContain("permissão");
    expect(describeGoogleDrivePopupError("redirect_uri_mismatch")).toContain("redirect");
  });
});