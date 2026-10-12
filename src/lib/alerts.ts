/** Internal Seed Connection reminders. Never invent activity or send data to outside services. */
export type AlertKind = "tarefa" | "agenda" | "alteracao";
export type SeedAlert = {
  id: string;
  kind: AlertKind;
  title: string;
  detail: string;
  href: "/tarefas" | "/agenda" | "/configuracoes";
  urgent: boolean;
};
export type DueTask = {id:string;title:string;due_date:string|null;status:string;priority:string};
export type DueFollowup = {id:string;person_id:string;reason:string|null;due_date:string|null;done_at:string|null};
export type ChangeRecord = {id:number;actor_id:string|null;table_name:string;action:string;at:string};
const MS_PER_DAY = 86_400_000;

export function daysFromToday(due: string, today: string): number {
  // Date-only strings are treated as UTC calendar dates, never converted to
  // viewer time zones, so a deadline does not shift on mobile.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(due) || !/^\d{4}-\d{2}-\d{2}$/.test(today))
    throw new Error("Formato de data inválido.");
  return Math.round((Date.parse(due+"T00:00:00Z")-Date.parse(today+"T00:00:00Z"))/MS_PER_DAY);
}
export function duePhrase(d: number): string {
  if(d<0) return `Atrasado há ${Math.abs(d)} dia(s)`;
  if(d===0) return "Vence hoje";
  if(d===1) return "Vence amanhã";
  return `Vence em ${d} dias`;
}

export function taskAlerts(tasks: DueTask[],today:string): SeedAlert[] {
  return tasks.filter(t=>t.status!=="feito"&&!!t.due_date)
    .flatMap(t=>{
      const diff=daysFromToday(t.due_date!,today);
      if(diff>2) return [];
      return [{
        id:`tarefa:${t.id}:${t.due_date}:${t.status}`,
        kind:"tarefa" as const,
        title:t.title,
        detail:`${duePhrase(diff)} · prioridade ${t.priority}`,
        href:"/tarefas" as const,
        urgent:diff<=0,
      }];
    });
}
export function followupAlerts(items:DueFollowup[],names:Map<string,string>,today:string):SeedAlert[]{
  return items.filter(f=>!f.done_at&&!!f.due_date)
    .flatMap(f=>{
      const diff=daysFromToday(f.due_date!,today);
      if(diff>2)return [];
      return [{
        id:`agenda:${f.id}:${f.due_date}`,
        kind:"agenda" as const,
        title:`Retornar para ${names.get(f.person_id)??"contato"}`,
        detail:`${duePhrase(diff)} · ${f.reason??"Follow-up"}`,
        href:"/agenda" as const, urgent:diff<=0,
      }];
    });
}
const TABLES:Record<string,string>={
  people:"Pessoas", contact_methods:"Contatos", tasks:"Tarefas",
  followups:"Follow-ups", opportunities:"Oportunidades",
  interactions:"Interações", captures:"Capturas", projects:"Projetos",
};
export function auditAlerts(records:ChangeRecord[],viewerId:string):SeedAlert[]{
  return records.filter(a=>a.actor_id!==viewerId && !!TABLES[a.table_name])
    .map(a=>({
      id:`alteracao:${a.id}`,kind:"alteracao" as const,
      title:`Alteração em ${TABLES[a.table_name]}`,
      detail:`Ação: ${a.action} · ${new Date(a.at).toLocaleString("pt-BR")}`,
      href:"/configuracoes" as const, urgent:false,
    }));
}
export function brazilToday(d:Date=new Date()):string{
  const parts=new Intl.DateTimeFormat("pt-BR",{
    timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit",
  }).formatToParts(d);
  const y=parts.find(x=>x.type==="year")?.value??"";
  const m=parts.find(x=>x.type==="month")?.value??"";
  const day=parts.find(x=>x.type==="day")?.value??"";
  return `${y}-${m}-${day}`;
}
