// Persistência real para oportunidades, projetos e inteligência operacional.
// Toda leitura/escrita utiliza a sessão da pessoa autenticada e respeita RLS.
import { supabase } from "@/integrations/supabase/client";
import type { FactorKey, Opportunity, Project, Recommendation } from "@/types/domain";
import { recommend } from "@/lib/opportunity";

const defaults: Record<FactorKey, number> = {
  retorno: 3, urgencia: 3, esforco: 3, complexidade: 3,
  custo_oportunidade: 3, capacidade: 3, conectar: 3,
};

async function requireUid() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Sua sessão expirou. Entre novamente.");
  return data.user.id;
}

function checked<T>(data: T | null, error: { message: string } | null): T {
  if (error) throw new Error(error.message);
  if (data === null) throw new Error("Operação não retornou resultado.");
  return data;
}

export type RealOpportunity = Opportunity & {
  recommendation?: Recommendation | null;
  decision?: Recommendation | null;
  reviewAt?: string | null;
};

export const liveOpportunities = {
  async list(): Promise<RealOpportunity[]> {
    const r = await supabase.from("opportunities")
      .select("id,title,need,resources,third_party,scores,status,recommendation,decision,review_at")
      .order("updated_at", { ascending: false });
    const rows = checked(r.data, r.error);
    const rel = await supabase.from("opportunity_people")
      .select("opportunity_id,person_id");
    if (rel.error) throw new Error(rel.error.message);
    return rows.map((row) => ({
      id: row.id, title: row.title,
      need: row.need ?? "", resources: row.resources ?? "",
      thirdParty: row.third_party ?? "",
      scores: { ...defaults, ...((row.scores ?? {}) as Partial<Record<FactorKey, number>>) },
      status: row.status as Opportunity["status"],
      recommendation: row.recommendation as Recommendation | null,
      decision: row.decision as Recommendation | null,
      reviewAt: row.review_at ?? null,
      personIds: (rel.data ?? []).filter((a) => a.opportunity_id === row.id).map((a) => a.person_id),
    }));
  },
  async save(o: RealOpportunity): Promise<void> {
    const { id, ...rest } = o;
    const payload = {
      title: rest.title.trim(),
      need: rest.need.trim() || null,
      resources: rest.resources.trim() || null,
      third_party: rest.thirdParty.trim() || null,
      scores: rest.scores,
      status: rest.status,
      recommendation: recommend(rest.scores).decision,
      decision: rest.decision ?? null,
      review_at: rest.reviewAt || null,
    };
    if (!payload.title) throw new Error("Informe um título.");
    let recordId = id;
    if (id) {
      const r = await supabase.from("opportunities").update(payload).eq("id", id).select("id").single();
      recordId = checked(r.data, r.error).id;
    } else {
      const owner_id = await requireUid();
      const r = await supabase.from("opportunities")
        .insert({ ...payload, owner_id, visibility: "equipe", source: "manual" })
        .select("id").single();
      recordId = checked(r.data, r.error).id;
    }
    // Só altera as relações se o salvamento principal ocorreu.
    const old = await supabase.from("opportunity_people").select("person_id").eq("opportunity_id", recordId);
    if (old.error) throw new Error(old.error.message);
    const current = new Set((old.data ?? []).map((v) => v.person_id));
    const wanted = new Set(rest.personIds);
    for (const p of current) if (!wanted.has(p)) {
      const deleted = await supabase.from("opportunity_people")
        .delete().eq("opportunity_id", recordId).eq("person_id", p);
      if (deleted.error) throw new Error(deleted.error.message);
    }
    for (const p of wanted) if (!current.has(p)) {
      const inserted = await supabase.from("opportunity_people")
        .insert({ opportunity_id: recordId, person_id: p });
      if (inserted.error) throw new Error(inserted.error.message);
    }
  },
  async remove(id: string) {
    const r = await supabase.from("opportunities").delete().eq("id", id);
    if (r.error) throw new Error(r.error.message);
  },
};

export type RealProject = Project & { visibility: "privado" | "equipe" };
export const liveProjects = {
  async list(): Promise<RealProject[]> {
    const r = await supabase.from("projects")
      .select("id,name,goal,status,progress,risk,owner_id,visibility")
      .order("updated_at", { ascending: false });
    return checked(r.data, r.error).map((p) => ({
      id: p.id, name: p.name, goal: p.goal ?? "",
      status: p.status as Project["status"],
      progress: p.progress, risk: p.risk ?? undefined,
      owner: p.owner_id, visibility: p.visibility === "privado" ? "privado" : "equipe",
    }));
  },
  async save(p: RealProject): Promise<void> {
    const payload = {
      name: p.name.trim(), goal: p.goal.trim() || null,
      status: p.status, progress: Math.max(0, Math.min(100, p.progress)),
      risk: p.risk?.trim() || null, visibility: p.visibility,
    };
    if (!payload.name) throw new Error("Informe o nome do projeto.");
    if (p.id) {
      const r = await supabase.from("projects").update(payload).eq("id", p.id).select("id").single();
      checked(r.data, r.error);
    } else {
      const owner_id = await requireUid();
      const r = await supabase.from("projects").insert({ ...payload, owner_id }).select("id").single();
      checked(r.data, r.error);
    }
  },
  async remove(id: string) {
    const r = await supabase.from("projects").delete().eq("id", id);
    if (r.error) throw new Error(r.error.message);
  },
};

export const liveNetwork = {
  async list() {
    const [people, edges] = await Promise.all([
      supabase.from("people").select("id,name,sphere,company,proximity,priority").order("name").limit(500),
      supabase.from("relationships").select("id,a,b,kind,status").eq("status", "aprovado").limit(1500),
    ]);
    return {
      people: checked(people.data, people.error),
      edges: checked(edges.data, edges.error),
    };
  },
};

export const liveReports = {
  async get() {
    const [people, tasks, opportunities, captures, interactions, followups] = await Promise.all([
      supabase.from("people").select("id,name,priority,last_interaction_at,next_followup_at").limit(10000),
      supabase.from("tasks").select("id,title,status,priority,due_date,completed_at").limit(10000),
      supabase.from("opportunities").select("id,title,status,recommendation,decision,review_at").limit(10000),
      supabase.from("captures").select("id,status,kind,created_at").limit(10000),
      supabase.from("interactions").select("id,occurred_at,person_id").limit(10000),
      supabase.from("followups").select("id,reason,due_date,done_at,person_id").limit(10000),
    ]);
    return {
      people: checked(people.data, people.error),
      tasks: checked(tasks.data, tasks.error),
      opportunities: checked(opportunities.data, opportunities.error),
      captures: checked(captures.data, captures.error),
      interactions: checked(interactions.data, interactions.error),
      followups: checked(followups.data, followups.error),
    };
  },
};
