import { describe, expect, it } from "vitest";
import { buildDemoReply, formatSize, kindOf } from "./sid-demo";

const people = [{ id: "p1", name: "Marcelo Exemplo" }];

describe("SID demo", () => {
  it("perguntar nunca propõe ações que alterem dados", () => {
    expect(
      buildDemoReply("perguntar", "O que o Marcelo precisa?", [], people).actions,
    ).toHaveLength(0);
  });
  it("registrar gera propostas pendentes de revisão", () => {
    const r = buildDemoReply("registrar", "Falei com o Marcelo", [], people);
    expect(r.actions.length).toBeGreaterThan(0);
    expect(r.actions.every((a) => a.status === "pendente")).toBe(true);
  });
  it("anexos são declarados como não enviados", () => {
    expect(buildDemoReply("perguntar", "x", [{ name: "a.pdf" }], people).attachmentNote).toContain(
      "Nenhum arquivo foi enviado",
    );
  });
  it("classifica tipo e tamanho", () => {
    expect(kindOf("image/png")).toBe("imagem");
    expect(kindOf("application/pdf")).toBe("arquivo");
    expect(formatSize(2 * 1024 * 1024)).toBe("2.0 MB");
  });
});
