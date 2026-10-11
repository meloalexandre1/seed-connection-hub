// Administração de acesso. Toda função exige sessão válida E papel admin,
// verificado pelo próprio banco (RLS / user_roles) com o cliente do usuário.
// O cliente privilegiado só é carregado depois dessa verificação, e apenas para
// listar e-mails e enviar convites (operações que exigem a API de administração).
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ROLES = ["admin", "gestor", "operacional"] as const;
type Role = (typeof ROLES)[number];
const MAX_USERS = 6;

type Ctx = { supabase: any; userId: string };

async function assertAdmin({ supabase, userId }: Ctx) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !data) throw new Error("Acesso negado: somente administradores.");
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export const listAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as Ctx);
    const sb = await admin();
    const { data: users, error } = await sb.auth.admin.listUsers({ perPage: 50 });
    if (error) throw new Error("Não foi possível listar os usuários.");
    const { data: roles } = await context.supabase.from("user_roles").select("user_id, role, created_at");
    const { data: audit } = await context.supabase
      .from("audit_log")
      .select("id, actor_id, row_id, action, changed_columns, at")
      .eq("table_name", "user_roles")
      .order("at", { ascending: false })
      .limit(100);
    const { data: roleRows } = await sb.from("user_roles").select("id, user_id");
    const emailOf = new Map(users.users.map((u) => [u.id, u.email ?? "—"]));
    const userOfRow = new Map((roleRows ?? []).map((r) => [r.id, r.user_id]));
    return {
      me: context.userId,
      max: MAX_USERS,
      users: users.users.map((u) => ({
        id: u.id,
        email: u.email ?? "—",
        invitedAt: u.invited_at ?? null,
        confirmed: !!u.email_confirmed_at,
        lastSignIn: u.last_sign_in_at ?? null,
        role: (roles ?? []).find((r: any) => r.user_id === u.id)?.role ?? null,
      })),
      audit: (audit ?? []).map((a: any) => ({
        id: String(a.id),
        at: a.at as string,
        action: a.action as string,
        actor: a.actor_id ? (emailOf.get(a.actor_id) ?? "usuário removido") : "sistema",
        target: userOfRow.get(a.row_id) ? emailOf.get(userOfRow.get(a.row_id)!) ?? "—" : "registro removido",
        columns: (a.changed_columns ?? []) as string[],
      })),
    };
  });

export const inviteCollaborator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { email: string; role: Role; redirectTo: string }) => {
    const email = String(d.email ?? "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new Error("E-mail inválido.");
    if (!ROLES.includes(d.role)) throw new Error("Papel inválido.");
    const url = new URL(String(d.redirectTo));
    return { email, role: d.role, redirectTo: `${url.origin}/auth` };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context as Ctx);
    const sb = await admin();
    const { data: list } = await sb.auth.admin.listUsers({ perPage: 50 });
    if ((list?.users.length ?? 0) >= MAX_USERS)
      throw new Error(`Limite de ${MAX_USERS} usuários (proprietário + 5) atingido.`);
    if (list?.users.some((u) => u.email?.toLowerCase() === data.email))
      throw new Error("Este e-mail já tem conta. Ajuste o papel na lista.");
    const { data: inv, error } = await sb.auth.admin.inviteUserByEmail(data.email, {
      redirectTo: data.redirectTo,
    });
    if (error || !inv.user) throw new Error("Não foi possível enviar o convite.");
    // Papel concedido pelo próprio admin (RLS + auditoria registram quem concedeu).
    const { error: rErr } = await context.supabase
      .from("user_roles")
      .insert({ user_id: inv.user.id, role: data.role, granted_by: context.userId });
    if (rErr) throw new Error("Convite enviado, mas o papel não foi atribuído: " + rErr.message);
    return { ok: true };
  });

export const setRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; role: Role | null }) => {
    if (!/^[0-9a-f-]{36}$/i.test(d.userId)) throw new Error("Usuário inválido.");
    if (d.role !== null && !ROLES.includes(d.role)) throw new Error("Papel inválido.");
    return d;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context as Ctx);
    const sb = context.supabase;
    if (data.role === null) {
      const { error } = await sb.from("user_roles").delete().eq("user_id", data.userId);
      if (error) throw new Error(error.message);
      return { ok: true };
    }
    const { data: existing } = await sb.from("user_roles").select("id").eq("user_id", data.userId).maybeSingle();
    const { error } = existing
      ? await sb.from("user_roles").update({ role: data.role, granted_by: context.userId }).eq("id", existing.id)
      : await sb.from("user_roles").insert({ user_id: data.userId, role: data.role, granted_by: context.userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
