import { z } from "zod";

export const evidenceFact = z.object({
  kind: z.enum(["necessidade","habilidade","contexto","compromisso","oportunidade"]),
  text: z.string().trim().min(5).max(500),
  evidence: z.string().trim().min(5).max(500),
  confidence: z.number().min(0).max(1),
}).strict();

export const proposedPerson = z.object({
  name: z.string().trim().min(3).max(130),
  email: z.string().trim().email().max(180).nullable().optional(),
  phone: z.string().trim().max(32).nullable().optional(),
  organization: z.string().trim().max(120).nullable().optional(),
  role: z.string().trim().max(120).nullable().optional(),
  facts: z.array(evidenceFact).max(8),
}).strict();

export const meetingExtraction = z.object({
  summary: z.string().trim().min(10).max(1600),
  people: z.array(proposedPerson).max(12),
}).strict();

export type MeetingExtraction = z.infer<typeof meetingExtraction>;
export type ProposedPerson = z.infer<typeof proposedPerson>;
export type IdentityMatch = {
  id: string;
  name: string;
  method: "email"|"telefone"|"nome";
};

export function parseMeetingExtraction(raw:string, source:string):MeetingExtraction {
  const normalized=raw.trim().replace(/^\`\`\`(?:json)?\s*/i,"").replace(/\s*\`\`\`$/,"");
  const body=JSON.parse(normalized) as unknown;
  const data=meetingExtraction.parse(body);
  // Facts must be demonstrably present in the source. Reject any unsupported
  // quote: an LLM-generated claim without text evidence must not enter the CRM.
  const people=data.people.map(p=>({
    ...p,
    facts:p.facts.filter(f=>source.toLocaleLowerCase("pt-BR").includes(f.evidence.toLocaleLowerCase("pt-BR"))),
  }));
  return {...data,people};
}
export function normalizedPhone(s:string):string {
  return s.replace(/\D/g,"");
}
export function normalizedIdentityName(s:string):string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .toLocaleLowerCase("pt-BR").replace(/\s+/g," ").trim();
}
export function pickUniqueMatches(matches:IdentityMatch[]):IdentityMatch[]{
  const seen=new Set<string>();
  return matches.filter(m=>{
    if(seen.has(m.id))return false;
    seen.add(m.id);return true;
  });
}
