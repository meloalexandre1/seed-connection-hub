import { describe, expect, it } from "vitest";
import { contactLabel, normalizeContactKind } from "./contact-kind";

describe("contact_methods.kind normalization", () => {
  it.each([
    ["whatsapp", "telefone"],
    ["WhatsApp/telefone", "telefone"],
    ["WhatsApp telefone", "telefone"],
    ["telefone", "telefone"],
    ["phone", "telefone"],
    ["celular", "telefone"],
    ["e-mail", "email"],
    ["E-mail", "email"],
    ["email", "email"],
    ["outro", "outro"],
  ] as const)("maps %s to the actual database value %s", (input, expected) => {
    expect(normalizeContactKind(input)).toBe(expected);
  });

  it("does not silently turn an unknown kind into a phone number", () => {
    expect(() => normalizeContactKind("telegram")).toThrow(/Tipo de contato/);
  });

  it("keeps friendly labels separate from persisted values", () => {
    expect(contactLabel("telefone")).toBe("WhatsApp/telefone");
    expect(contactLabel("email")).toBe("E-mail");
  });
});
