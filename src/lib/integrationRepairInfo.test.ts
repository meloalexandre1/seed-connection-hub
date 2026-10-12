import { describe, expect, it } from "vitest";
import { GOOGLE_OAUTH_CALLBACKS } from "./integrationRepairInfo";

describe("OAuth help for separate Google connectors", () => {
  it("keeps each required callback distinct and HTTPS", () => {
    expect(new Set([GOOGLE_OAUTH_CALLBACKS.calendarViaLovable, GOOGLE_OAUTH_CALLBACKS.driveDirect, GOOGLE_OAUTH_CALLBACKS.gmailDirect]).size).toBe(3);
    for (const entry of Object.values(GOOGLE_OAUTH_CALLBACKS))
      expect(entry.startsWith("https://")).toBe(true);
  });
  it("uses the Lovable gateway for the Calendar app-user connector", () => {
    expect(new URL(GOOGLE_OAUTH_CALLBACKS.calendarViaLovable).pathname)
      .toBe("/api/v1/app-users/oauth2/callback");
  });
  it("keeps the separate direct Drive callback on the published origin", () => {
    expect(new URL(GOOGLE_OAUTH_CALLBACKS.driveDirect).origin).toBe(GOOGLE_OAUTH_CALLBACKS.origin);
    expect(new URL(GOOGLE_OAUTH_CALLBACKS.driveDirect).pathname).toBe("/api/oauth/drive/return");
  });
});