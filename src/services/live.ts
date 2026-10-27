// Serviços com dados REAIS (Lovable Cloud). RLS do banco decide o que cada usuário vê.
// Somente o cliente com chave publicável é usado aqui — nunca chaves privilegiadas.
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { normalizeContactKind } from "@/services/contact-kind";

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
      name: (data.user.user_metadata?.["full_name"] as string | undefined) ?? "",
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
    // Validate and normalize before creating the person, so an invalid kind
    // cannot leave a partial record in the database.
    const cm = contacts.filter((c) => c.value.trim()).map((c) => {
      const kind = normalizeContactKind(c.kind);
      const value = c.value.trim();
      return {
        kind,
        value_raw: value,
        value_normalized: kind === "email" ? value.toLowerCase() : kind === "telefone" ? value.replace(/\D/g, "") : value,
      };
    });
    const owner_id = await uid();
    const row = must(
      await supabase
        .from("people")
        .insert({ ...p, owner_id, source: "manual" })
        .select()
        .single(),
    );
    if (cm.length) {
      const { error } = await supabase.from("contact_methods").insert(
        cm.map((c) => ({ ...c, person_id: row.id })),
      );
      if (error) {
        // No other records have been added for this newly created person.
        const rollback = await supabase.from("people").delete().eq("id", row.id);
        if (rollback.error) {
          throw new Error(
            "Falha ao salvar contatos; o cadastro da pessoa pode ter ficado parcialmente salvo. " +
            "Confira a lista antes de tentar novamente. Detalhe: " + error.message,
          );
        }
        throw new Error("Não foi possível salvar o contato: " + error.message);
      }
    }
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
    const normalizedKind = normalizeContactKind(kind);
    const trimmed = value.trim();
    must(
      await supabase.from("contact_methods").insert({
        person_id: personId,
        kind: normalizedKind,
        value_raw: trimmed,
        value_normalized:
          normalizedKind === "email" ? trimmed.toLowerCase() :
          normalizedKind === "telefone" ? trimmed.replace(/\D/g, "") : trimmed,
      }),
    );
  },
};

export const liveNetwork = {
  async list() {
    // Paginate instead of silently dropping contacts beyond the Data API row limit.
    const readPeople = async () => {
      const rows: PersonRow[] = [];
      for (let offset = 0; ; offset += 500) {
        const page = must(await supabase.from("people").select("*").order("name").order("id").range(offset, offset + 499));
        rows.push(...page);
        if (page.length < 500) return rows;
      }
    };
    const readRelationships = async () => {
      const rows: Database["public"]["Tables"]["relationships"]["Row"][] = [];
      for (let offset = 0; ; offset += 500) {
        const page = must(await supabase.from("relationships").select("*").neq("status", "rejeitado").order("id").range(offset, offset + 499));
        rows.push(...page);
        if (page.length < 500) return rows;
      }
    };
    const [people, relationships] = await Promise.all([readPeople(), readRelationships()]);
    return { people, relationships };
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

export interface AgendaItem {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  kind: "prazo" | "followup" | "reuniao";
  detail: string;
  done: boolean;
}

export const liveAgenda = {
  async list(): Promise<AgendaItem[]> {
    const [tasks, followups, people] = await Promise.all([
      supabase.from("tasks").select("id,title,due_date,status,priority").not("due_date", "is", null),
      supabase.from("followups").select("id,reason,due_date,done_at,person_id").not("due_date", "is", null),
      supabase.from("people").select("id,name"),
    ]);
    const names = new Map((people.data ?? []).map((p) => [p.id, p.name]));
    const items: AgendaItem[] = [];
    for (const t of tasks.data ?? []) {
      if (!t.due_date) continue;
      items.push({
        id: `t-${t.id}`,
        date: t.due_date,
        title: t.title,
        kind: "prazo",
        detail: `Tarefa · prioridade ${t.priority}`,
        done: t.status === "feito",
      });
    }
    for (const f of followups.data ?? []) {
      if (!f.due_date) continue;
      items.push({
        id: `f-${f.id}`,
        date: f.due_date,
        title: f.reason ?? "Follow-up",
        kind: "followup",
        detail: `Follow-up · ${names.get(f.person_id) ?? "pessoa"}`,
        done: !!f.done_at,
      });
    }
    return items;
  },
};

export const liveCaptures = {
  async list() {
    const owner_id = await uid();
    return must(await supabase.from("captures")
      .select("id,owner_id,title,kind,status,source,received_at,storage_path,external_id,note,error,mime")
      .eq("owner_id", owner_id)
      .order("received_at", { ascending: false }).limit(80));
  },
  async signedDownloadUrl(storagePath: string): Promise<string> {
    const result = await supabase.storage.from("captures").createSignedUrl(storagePath, 900);
    if (result.error || !result.data?.signedUrl)
      throw new Error(result.error?.message ?? "Não foi possível abrir o arquivo privado.");
    return result.data.signedUrl;
  },
  async createNote(note: string, title: string) {
    const owner_id = await uid();
    return must(
      await supabase
        .from("captures")
        .insert({
          owner_id,
          visibility: "privado",
          source: "captura",
          kind: "nota",
          status: "revisar",
          title,
          note,
        })
        .select()
        .single(),
    );
  },
  async createFile(file: File | Blob, kind: string, label: string, mime: string) {
    // Drive is preferred only after admin grants access to the designated folder.
    // Existing private Supabase storage stays in place until authorization succeeds.
    const { googleDriveStorageStatus } = await import("@/lib/googleDriveStorage.functions");
    // A disabled Drive integration must never block or slow ordinary
    // private Supabase uploads. The mode is a server-side feature flag.
    const { captureDriveUploadsEnabled } = await import("@/lib/driveUploadMode.functions");
    const { enabled } = await captureDriveUploadsEnabled();
    let drive: Awaited<ReturnType<typeof googleDriveStorageStatus>> | null = null;
    if (enabled) drive = await googleDriveStorageStatus();
    if (drive?.enabled && !drive.folderReady) {
      throw new Error("O Google Drive está habilitado, mas ainda não tem acesso à pasta. Solicite ao administrador que confira a autorização.");
    }
    if (drive?.enabled && drive.folderReady) {
      const { uploadCaptureToDrive } = await import("@/services/googleDriveUpload");
      const captureId = await uploadCaptureToDrive(
        file, kind as "audio" | "video" | "foto" | "arquivo" | "plaud", label, mime,
      );
      return must(await supabase.from("captures").select("*").eq("id", captureId).single());
    }
    const owner_id = await uid();
    const capture = must(
      await supabase
        .from("captures")
        .insert({
          owner_id,
          visibility: "privado",
          source: "captura",
          kind,
          status: "enviando",
          title: label,
          mime,
          size_bytes: file.size,
        })
        .select()
        .single(),
    );
    const ext =
      file instanceof File && file.name.includes(".")
        ? file.name.split(".").pop()
        : (mime.split("/")[1]?.split(";")[0] ?? "bin");
    const path = `${owner_id}/${capture.id}/arquivo.${ext}`;
    const up = await supabase.storage.from("captures").upload(path, file, { contentType: mime });
    if (up.error) {
      await supabase.from("captures").update({ status: "erro", error: up.error.message }).eq("id", capture.id);
      throw new Error(up.error.message);
    }
    return must(
      await supabase
        .from("captures")
        .update({ storage_path: path, status: "revisar" })
        .eq("id", capture.id)
        .select()
        .single(),
    );
  },
  async markReviewed(id: string) {
    must(await supabase.from("captures").update({ status: "concluido" }).eq("id", id));
  },
};

export const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) : "—";
