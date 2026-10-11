// Serviços com dados REAIS (Lovable Cloud). RLS do banco decide o que cada usuário vê.
// Somente o cliente com chave publicável é usado aqui — nunca chaves privilegiadas.
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type PersonRow = Database["public"]["Tables"]["people"]["Row"];
export type PersonInsert = Database["public"]["Tables"]["people"]["Insert"];
export type ContactRow = Database["public"]["Tables"]["contact_methods"]["Row"];
export type InteractionRow = Database["public"]["Tables"]["interactions"]["Row"];
export type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (s: string) => UUID.test(s);

function must<R extends { data: unknown; error: { message: string } | null }>(
  r: R,
): NonNullable<R["data"]> {
  if (r.error) throw new Error(r.error.message);
  return r.data as NonNullable<R["data"]>;
}

async function uid() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Sessão expirada. Entre novamente.");
  return data.user.id;
}

export const meService = {
  async get() {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return null;
    const roles = must(
      await supabase.from("user_roles").select("role").eq("user_id", data.user.id),
    );
    return {
      id: data.user.id,
      email: data.user.email ?? "",
      role: roles?.[0]?.role ?? null,
      name: (data.user.user_metadata?.full_name as string | undefined) ?? "",
    };
  },
};

export const livePeople = {
  async list() {
    return must(await supabase.from("people").select("*").order("name"));
  },
  async get(id: string) {
    if (!isUuid(id)) return null;
    return must(await supabase.from("people").select("*").eq("id", id).maybeSingle());
  },
  async create(p: Omit<PersonInsert, "owner_id">, contacts: { kind: string; value: string }[]) {
    const owner_id = await uid();
    const row = must(
      await supabase
        .from("people")
        .insert({ ...p, owner_id, source: "manual" })
        .select()
        .single(),
    );
    const cm = contacts.filter((c) => c.value.trim());
    if (cm.length)
      must(
        await supabase.from("contact_methods").insert(
          cm.map((c) => ({
            person_id: row.id,
            kind: c.kind,
            value_raw: c.value.trim(),
            value_normalized:
              c.kind === "email" ? c.value.trim().toLowerCase() : c.value.replace(/\D/g, ""),
          })),
        ),
      );
    return row;
  },
  async update(id: string, patch: Partial<PersonInsert>) {
    const { owner_id: _o, ...rest } = patch;
    return must(await supabase.from("people").update(rest).eq("id", id).select().single());
  },
  async contacts(personId: string) {
    return must(
      await supabase.from("contact_methods").select("*").eq("person_id", personId).order("created_at"),
    );
  },
  async addContact(personId: string, kind: string, value: string) {
    must(
      await supabase.from("contact_methods").insert({
        person_id: personId,
        kind,
        value_raw: value.trim(),
        value_normalized: kind === "email" ? value.trim().toLowerCase() : value.replace(/\D/g, ""),
      }),
    );
  },
};

export const liveInteractions = {
  async listByPerson(personId: string) {
    return must(
      await supabase
        .from("interactions")
        .select("*")
        .eq("person_id", personId)
        .order("occurred_at", { ascending: false }),
    );
  },
  async create(i: { person_id: string; kind: string; summary: string; occurred_at: string }) {
    const author_id = await uid();
    must(
      await supabase
        .from("interactions")
        .insert({ ...i, author_id, source: "manual", status: "aprovado" }),
    );
    await supabase
      .from("people")
      .update({ last_interaction_at: i.occurred_at })
      .eq("id", i.person_id);
  },
};

export const liveTasks = {
  async list() {
    return must(await supabase.from("tasks").select("*").order("due_date", { nullsFirst: false }));
  },
  async create(t: {
    title: string;
    priority: TaskRow["priority"];
    due_date: string | null;
    person_id: string | null;
  }) {
    const owner_id = await uid();
    return must(
      await supabase
        .from("tasks")
        .insert({ ...t, owner_id, assignee_id: owner_id, source: "manual" })
        .select()
        .single(),
    );
  },
  async setStatus(id: string, status: string) {
    must(
      await supabase
        .from("tasks")
        .update({ status, completed_at: status === "feito" ? new Date().toISOString() : null })
        .eq("id", id),
    );
  },
  async remove(id: string) {
    must(await supabase.from("tasks").delete().eq("id", id));
  },
};

export const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) : "—";
