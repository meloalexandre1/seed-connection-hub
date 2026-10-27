import type { PersonRow } from "@/services/live";

export type NetworkPerson = Pick<PersonRow, "id" | "name" | "company" | "needs" | "skills">;
export interface NetworkRelationship {
  id: string;
  a: string;
  b: string;
  kind: string | null;
  evidence: string | null;
  status: string;
}
export interface NetworkEdge {
  id: string;
  a: string;
  b: string;
  confirmed: boolean;
  reasons: string[];
}
const normalize = (value: string) => value.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").replace(/\s+/g, " ");
const pairKey = (a: string, b: string) => JSON.stringify([a, b].sort());

// Suggestions describe matches in existing fields, not a claim that people know each other.
// No suggestion is written to the database or sent to an AI provider.
export function buildNetworkEdges(people: NetworkPerson[], relationships: NetworkRelationship[]): NetworkEdge[] {
  const ids = new Set(people.map((p) => p.id));
  const edges = new Map<string, NetworkEdge>();
  for (const relationship of relationships) {
    if (relationship.status === "rejeitado" || relationship.a === relationship.b || !ids.has(relationship.a) || !ids.has(relationship.b)) continue;
    const key = pairKey(relationship.a, relationship.b);
    const confirmed = relationship.status === "aprovado";
    const previous = edges.get(key);
    edges.set(key, {
      id: key, a: relationship.a, b: relationship.b,
      confirmed: confirmed || previous?.confirmed === true,
      reasons: [...(previous?.reasons ?? []), `${confirmed ? "Vínculo registrado" : "Vínculo pendente de revisão"}${relationship.kind ? `: ${relationship.kind}` : ""}${relationship.evidence ? ` — ${relationship.evidence}` : ""}`],
    });
  }
  for (let i = 0; i < people.length; i++) {
    const a = people[i];
    if (!a) continue;
    for (const b of people.slice(i + 1)) {
      const key = pairKey(a.id, b.id);
      if (edges.has(key)) continue;
      const reasons: string[] = [];
      const company = normalize(a.company ?? "");
      if (company && company === normalize(b.company ?? "")) reasons.push(`Mesma empresa cadastrada: ${a.company}`);
      for (const [needing, helping] of [[a, b], [b, a]]) {
        if (!needing || !helping) continue;
        const skills = new Set(helping.skills.map(normalize).filter(Boolean));
        for (const need of needing.needs) {
          if (normalize(need) && skills.has(normalize(need))) reasons.push(`${helping.name} tem habilidade cadastrada para a necessidade de ${needing.name}: ${need}`);
        }
      }
      if (reasons.length) edges.set(key, { id: key, a: a.id, b: b.id, confirmed: false, reasons: [...new Set(reasons)] });
    }
  }
  return [...edges.values()];
}

export function networkNameLines(name: string): string[] {
  const chunks = name.trim().split(/\s+/).flatMap((word) => word.match(/.{1,22}/g) ?? []);
  const lines: string[] = [];
  for (const word of chunks) {
    const last = lines.at(-1);
    if (last && last.length + word.length + 1 <= 22) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  return lines;
}