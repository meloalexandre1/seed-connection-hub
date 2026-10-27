import { describe, expect, it } from "vitest";
import { buildNetworkEdges, type NetworkPerson } from "./network";

const person = (id: string, patch: Partial<NetworkPerson> = {}): NetworkPerson => ({ id, name: id, company: null, needs: [], skills: [], ...patch });
describe("mapa com pessoas cadastradas", () => {
  it("não inventa vínculos quando faltam evidências", () => {
    expect(buildNetworkEdges([person("a"), person("b")], [])).toEqual([]);
  });
  it("mantém apenas vínculos entre pessoas visíveis, sem rejeitados", () => {
    const relationship = { id: "r", a: "a", b: "b", kind: null, evidence: null, status: "aprovado" };
    expect(buildNetworkEdges([person("a"), person("b")], [relationship, { ...relationship, b: "invisível" }, { ...relationship, status: "rejeitado" }])).toHaveLength(1);
    expect(buildNetworkEdges([person("a"), person("b")], [relationship])[0]?.confirmed).toBe(true);
  });
  it("mesma empresa gera sugestão, nunca conexão confirmada", () => {
    const edges = buildNetworkEdges([person("a", { company: "Conexão" }), person("b", { company: " conexão " })], []);
    expect(edges).toHaveLength(1);
    expect(edges[0]?.confirmed).toBe(false);
    expect(edges[0]?.reasons).toEqual(["Mesma empresa cadastrada: Conexão"]);
  });
  it("habilidade e necessidade reais geram sugestão explicável", () => {
    const edges = buildNetworkEdges([person("cliente", { needs: ["Gestão"] }), person("parceiro", { skills: ["gestao"] })], []);
    expect(edges[0]?.confirmed).toBe(false);
    expect(edges[0]?.reasons).toEqual(["parceiro tem habilidade cadastrada para a necessidade de cliente: Gestão"]);
  });
  it("não duplica nem substitui vínculo registrado por sugestão", () => {
    const relationships = [ { id: "r", a: "a", b: "b", kind: "parceiro", evidence: null, status: "aprovado" }, { id: "s", a: "b", b: "a", kind: null, evidence: null, status: "sugerido" } ];
    const edges = buildNetworkEdges([person("a", { company: "SC" }), person("b", { company: "SC" })], relationships);
    expect(edges).toHaveLength(1);
    expect(edges[0]?.confirmed).toBe(true);
  });
});