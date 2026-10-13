// SID real: pergunta ao modelo com contexto do banco, limitado pelo RLS do usuário.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inputSchema = z.object({
  conversationId: z.string().uuid().nullable(),
  mode: z.enum(["perguntar", "registrar"]),
  question: z.string().min(1).max(4000),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(8000) }))
    .max(20)
    .default([]),
});

const PROX: Record<string, string> = {
  multidao: "Multidão",
  seguidor: "Seguidor",
  discipulo: "Discípulo",
  amigo_proximo: "Amigo próximo",
  amigo_intimo: "Amigo íntimo",
};
const PRIO: Record<string, string> = { alta: "alta", media: "média", baixa: "baixa" };

export const askSid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => inputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Operational requests work directly from Supabase, without an AI
    // subscription or Lovable AI usage. All queries honor the user's RLS.
    const { answerSidLocally } = await import("./sidLocal.server");
    let answer = await answerSidLocally({ mode: data.mode, question: data.question, context: { supabase, userId } });
    if (answer === null) {
    // Contexto: só o que o RLS permite a este usuário.
    const [people, tasks, opps, followups, interactions] = await Promise.all([
      supabase
        .from("people")
        .select("id,name,company,role,city,proximity,priority,needs,skills,next_action,last_interaction_at,next_followup_at")
        .order("updated_at", { ascending: false })
        .limit(80),
      supabase
        .from("tasks")
        .select("id,title,status,priority,due_date")
        .order("created_at", { ascending: false })
        .limit(60),
      supabase
        .from("opportunities")
        .select("id,title,need,status,recommendation,decision,review_at")
        .order("updated_at", { ascending: false })
        .limit(40),
      supabase
        .from("followups")
        .select("id,reason,due_date,done_at,person_id")
        .order("due_date", { ascending: true })
        .limit(40),
      supabase
        .from("interactions")
        .select("id,person_id,kind,summary,occurred_at")
        .order("occurred_at", { ascending: false })
        .limit(40),
    ]);

    const peopleRows = people.data ?? [];
    const personName = new Map(peopleRows.map((p) => [p.id, p.name]));

    const ctx = [
      "PESSOAS (nome | empresa | cargo | cidade | proximidade | prioridade | necessidades | habilidades | próxima ação | última interação | próximo follow-up):",
      ...peopleRows.map(
        (p) =>
          `- ${p.name} | ${p.company ?? "-"} | ${p.role ?? "-"} | ${p.city ?? "-"} | ${PROX[p.proximity] ?? p.proximity} | ${PRIO[p.priority] ?? p.priority} | nec: ${(p.needs ?? []).join(", ") || "-"} | hab: ${(p.skills ?? []).join(", ") || "-"} | ação: ${p.next_action ?? "-"} | última: ${p.last_interaction_at ?? "-"} | follow-up: ${p.next_followup_at ?? "-"}`,
      ),
      "",
      "TAREFAS (título | status | prioridade | vencimento):",
      ...(tasks.data ?? []).map(
        (t) => `- ${t.title} | ${t.status} | ${PRIO[t.priority] ?? t.priority} | ${t.due_date ?? "-"}`,
      ),
      "",
      "OPORTUNIDADES (título | necessidade | status | recomendação | decisão | revisão):",
      ...(opps.data ?? []).map(
        (o) =>
          `- ${o.title} | ${o.need ?? "-"} | ${o.status} | ${o.recommendation ?? "-"} | ${o.decision ?? "-"} | ${o.review_at ?? "-"}`,
      ),
      "",
      "FOLLOW-UPS (pessoa | motivo | vencimento | concluído):",
      ...(followups.data ?? []).map(
        (f) =>
          `- ${personName.get(f.person_id) ?? "?"} | ${f.reason ?? "-"} | ${f.due_date ?? "-"} | ${f.done_at ? "feito" : "pendente"}`,
      ),
      "",
      "INTERAÇÕES RECENTES (pessoa | tipo | resumo | data):",
      ...(interactions.data ?? []).map(
        (i) =>
          `- ${personName.get(i.person_id) ?? "?"} | ${i.kind ?? "-"} | ${i.summary ?? "-"} | ${i.occurred_at ?? "-"}`,
      ),
    ].join("\n");

    const hoje = new Date().toISOString().slice(0, 10);
    const system = [
      "Você é o SID, assistente de inteligência de relacionamentos do app Seed Connection (pt-BR).",
      `Hoje é ${hoje}. Responda sempre em português brasileiro, de forma direta e útil.`,
      "Use SOMENTE os dados abaixo, que são exatamente o que este usuário tem permissão de ver. Nunca invente pessoas, tarefas ou datas.",
      "Se a informação não estiver nos dados, diga que não encontrou e sugira onde registrar.",
      data.mode === "registrar"
        ? "Modo REGISTRAR: o usuário está descrevendo algo para gravar. Resuma o que entendeu e proponha registros concretos (pessoa, interação, tarefa, follow-up, oportunidade) em lista, deixando claro que nada foi salvo ainda e que ele deve revisar."
        : "Modo PERGUNTAR: consulta somente leitura. Não proponha criar nem alterar registros.",
      "Formate com listas curtas; cite nomes e datas quando relevantes.",
      "",
      "DADOS DO USUÁRIO:",
      ctx,
    ].join("\n");

    const {claimAiRequest}=await import("@/server/aiSafety.server");
    await claimAiRequest(userId,"sid_chat");
    const { askSidModel } = await import("./sid.server");
    answer = await askSidModel({ system, history: data.history, question: data.question });

    }

    // Persistência da conversa (mensagem do usuário via RLS; resposta via service role).
    let conversationId = data.conversationId;
    if (!conversationId) {
      const conv = await supabase
        .from("sid_conversations")
        .insert({ owner_id: userId, title: data.question.slice(0, 60), visibility: "privado" })
        .select("id")
        .single();
      if (conv.error) throw new Error(conv.error.message);
      conversationId = conv.data.id;
    }
    const userMsg = await supabase.from("sid_messages").insert({
      conversation_id: conversationId,
      role: "user",
      mode: data.mode,
      author_id: userId,
      content: data.question,
      status: "concluido",
    });
    if (userMsg.error) throw new Error(userMsg.error.message);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sidMsg = await supabaseAdmin.from("sid_messages").insert({
      conversation_id: conversationId,
      role: "assistant",
      mode: data.mode,
      author_id: null,
      content: answer,
      status: "concluido",
    });
    if (sidMsg.error) throw new Error(sidMsg.error.message);

    return { conversationId, answer };
  });

export const listSidConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("sid_conversations")
      .select("id,title,updated_at")
      .order("updated_at", { ascending: false })
      .limit(30);
    if (error) throw new Error(error.message);
    return data;
  });

export const getSidConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: msgs, error } = await context.supabase
      .from("sid_messages")
      .select("id,role,mode,content,created_at")
      .eq("conversation_id", data.id)
      .order("created_at");
    if (error) throw new Error(error.message);
    return msgs;
  });
