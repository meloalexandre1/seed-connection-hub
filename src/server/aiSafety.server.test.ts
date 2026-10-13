import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { sha256MeetingText } from "./aiSafety.server";

describe("Meeting provenance fingerprint",()=>{
  it("matches PostgreSQL pgcrypto SHA-256 UTF8 encoding",async()=>{
    const content="Reunião: ação com participantes e proposta.";
    const expected=createHash("sha256").update(content,"utf8").digest("hex");
    expect(await sha256MeetingText(content)).toBe(expected);
  });
  it("changes if a single character of the original source changes",async()=>{
    const original=await sha256MeetingText("Ana precisa de investidores");
    const changed=await sha256MeetingText("Ana não precisa de investidores");
    expect(changed).not.toBe(original);
    expect(original).toMatch(/^[0-9a-f]{64}$/);
  });
});
