import { describe, expect, it } from "vitest";
import { recommend } from "./opportunity";

const base = { retorno: 3, urgencia: 3, esforco: 3, complexidade: 3, custo_oportunidade: 3, capacidade: 3, conectar: 3 };

describe("recommend", () => {
  it("encerra quando retorno e urgência são baixos", () => {
    expect(recommend({ ...base, retorno: 2, urgencia: 1 }).decision).toBe("ENCERRAR");
  });
  it("resolve com capacidade alta e custo aceitável", () => {
    expect(recommend({ ...base, capacidade: 4 }).decision).toBe("RESOLVER");
  });
  it("conecta quando a equipe não resolve mas a rede pode", () => {
    expect(recommend({ ...base, capacidade: 2, conectar: 5 }).decision).toBe("CONECTAR");
  });
  it("adia quando ninguém tem condição clara", () => {
    expect(recommend(base).decision).toBe("ADIAR");
  });
});
