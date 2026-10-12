/**
 * SID basic operational queries that never call an AI service.
 * Supabase RLS is used for all database access.
 * This module is server-only and never uses a service-role key.
 */
export function classifyLocalSidQuestion(question: string):
  "today" | "tasks" | "followups" | "contacts" | "captures" | null {
  const q = question.toLocaleLowerCase("pt-BR")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  if (/\b(o que tenho hoje|compromissos de hoje|tarefas de hoje|pendencias de hoje|meu dia hoje|prioridades de hoje)\b/.test(q)) return "today";
  if (/\b(tarefas pendentes|minhas tarefas|quais tarefas|listar tarefas|tarefas abertas|o que preciso fazer)\b/.test(q)) return "tasks";
  if (/\b(follow.?ups? pendentes|proximos follow.?ups?|quem preciso contatar|contatos para retornar|retornos pendentes)\b/.test(q)) return "followups";
  if (/\b(quantos contatos|quantas pessoas|quantos clientes|total de contatos|total de pessoas)\b/.test(q)) return "contacts";
  if (/\b(ultimas capturas|capturas recentes|ultimos resumos|resumos salvos|arquivos salvos|notas salvas)\b/.test(q)) return "captures";
  return null;
}

export const localSidScopeNotice =
  "Consulta diretamente ao seu banco de dados, respeitando as permissões do usuário. " +
  "Não utilizou IA paga.";

export type LocalSidTask = {
  title: string; due_date: string | null; priority: string; status: string;
};
export type LocalSidFollowup = {
  reason: string | null; due_date: string | null; person_id: string; done_at: string | null;
};
export type LocalSidCapture = {
  title: string | null; kind: string; status: string; received_at: string;
};

export function formatTaskReply(tasks: LocalSidTask[], today: string, heading: string): string {
  const lines = tasks.map(t=>`- ${t.title} · ${t.due_date ?? "sem prazo"} · ${t.priority}`);
  return [
    heading,
    !lines.length ? "Nenhuma tarefa encontrada nesta consulta." : lines.join("\n"),
    "",
    localSidScopeNotice,
  ].join("\n");
}
export function formatFollowupReply(
  items: LocalSidFollowup[], personName: Map<string,string>, heading: string,
): string {
  const lines = items.map(f=>`- ${personName.get(f.person_id) ?? "Pessoa não identificada"}: ${f.reason ?? "Acompanhar"} · ${f.due_date ?? "sem prazo"}`);
  return [heading, lines.length ? lines.join("\n") : "Nenhum follow-up encontrado nesta consulta.", "", localSidScopeNotice].join("\n");
}
export function formatCapturesReply(rows: LocalSidCapture[]): string {
  const lines = rows.map(c=>`- ${c.title ?? "Sem título"} · ${c.kind} · ${c.status} · ${c.received_at.slice(0,10)}`);
  return [
    "Últimas capturas cadastradas (até 20):",
    lines.length ? lines.join("\n") : "Nenhuma captura cadastrada nesta consulta.",
    "Para abrir documentos ou notas, entre na Central de Captura.",
    "", localSidScopeNotice,
  ].join("\n");
}
