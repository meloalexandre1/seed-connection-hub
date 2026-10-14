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

export const proposedTask = z.object({
  title: z.string().trim().min(4).max(200),
  responsible: z.enum(["nos","cliente"]),
  person_name: z.string().trim().max(130).nullable().optional(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  priority: z.enum(["alta","media","baixa"]).default("media"),
  evidence: z.string().trim().min(5).max(500),
}).strict();
export const taskExtraction = z.object({ tasks: z.array(proposedTask).max(20) }).strict();
export type ProposedTask = z.infer<typeof proposedTask>;

/** Parses model output and drops tasks whose evidence is not literally in the source. */
export function parseTaskExtraction(raw:string, source:string):ProposedTask[] {
  const normalized=raw.trim().replace(/^\`\`\`(?:json)?\s*/i,"").replace(/\s*\`\`\`$/,"");
  const data=taskExtraction.parse(JSON.parse(normalized));
  const src=source.toLocaleLowerCase("pt-BR");
  return data.tasks.filter(t=>src.includes(t.evidence.toLocaleLowerCase("pt-BR")));
}
/** Our tasks start in "a fazer"; tasks delegated to the client wait on them. */
export function taskStatusFor(responsible:"nos"|"cliente"){
  return responsible==="cliente"?"aguardando":"a_fazer";
}
