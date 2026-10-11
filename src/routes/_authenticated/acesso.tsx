import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ShieldCheck, UserPlus, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listAccess, inviteCollaborator, setRole } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/acesso")({
  head: () => ({
    meta: [
      { title: "Acesso e equipe | Seed Connection" },
      { name: "description", content: "Convide colaboradores, gerencie papéis e veja o histórico de acesso." },
      { property: "og:title", content: "Acesso e equipe | Seed Connection" },
      { property: "og:description", content: "Administração privada de acesso da equipe." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AccessPage,
});

type Role = "admin" | "gestor" | "operacional";
const ROLE_LABEL: Record<Role, string> = { admin: "Administrador", gestor: "Gestor", operacional: "Operacional" };
const ACTION_LABEL: Record<string, string> = {
  INSERT: "Papel concedido",
  UPDATE: "Papel alterado",
  DELETE: "Papel revogado",
  BOOTSTRAP_ADMIN: "Primeiro administrador",
};
const fmt = (s: string | null) => (s ? new Date(s).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—");
const selectCls = "h-11 rounded-xl border border-border bg-background px-3 text-sm";

function AccessPage() {
  const qc = useQueryClient();
  const list = useServerFn(listAccess);
  const invite = useServerFn(inviteCollaborator);
  const updateRole = useServerFn(setRole);
  const q = useQuery({ queryKey: ["access"], queryFn: () => list(), retry: false });
  const [email, setEmail] = useState("");
  const [role, setNewRole] = useState<Role>("operacional");

  const inv = useMutation({
    mutationFn: () => invite({ data: { email, role, redirectTo: window.location.origin } }),
    onSuccess: () => { toast.success("Convite enviado por e-mail."); setEmail(""); qc.invalidateQueries({ queryKey: ["access"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const rm = useMutation({
    mutationFn: (v: { userId: string; role: Role | null }) => updateRole({ data: v }),
    onSuccess: () => { toast.success("Acesso atualizado."); qc.invalidateQueries({ queryKey: ["access"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (q.isLoading) return <p className="p-6 text-sm text-muted-foreground">Carregando…</p>;
  if (q.isError)
    return (
      <div className="m-6 rounded-2xl border border-border bg-card p-6">
        <ShieldCheck className="mb-2 h-6 w-6 text-primary" aria-hidden />
        <h1 className="text-lg font-semibold">Área restrita</h1>
        <p className="mt-1 text-sm text-muted-foreground">{(q.error as Error).message}</p>
      </div>
    );
  const d = q.data!;
  const full = d.users.length >= d.max;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 pb-28 md:p-8">
      <header>
        <h1 className="text-2xl font-semibold">Acesso e equipe</h1>
        <p className="text-sm text-muted-foreground">{d.users.length} de {d.max} contas usadas (proprietário + 5).</p>
      </header>

      <section className="rounded-2xl border border-border bg-card p-4 md:p-5">
        <h2 className="mb-3 flex items-center gap-2 font-semibold"><UserPlus className="h-4 w-4" aria-hidden />Convidar colaborador</h2>
        <form
          className="flex flex-col gap-3 md:flex-row md:items-end"
          onSubmit={(e) => { e.preventDefault(); inv.mutate(); }}
        >
          <div className="flex-1 space-y-1">
            <Label htmlFor="inv-email">E-mail</Label>
            <Input id="inv-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="inv-role">Papel</Label>
            <select id="inv-role" className={`${selectCls} w-full`} value={role} onChange={(e) => setNewRole(e.target.value as Role)}>
              {(Object.keys(ROLE_LABEL) as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </select>
          </div>
          <Button type="submit" className="h-11" disabled={inv.isPending || full}>
            {inv.isPending ? "Enviando…" : "Enviar convite"}
          </Button>
        </form>
        {full && <p className="mt-2 text-xs text-muted-foreground">Limite atingido. Revogue e remova uma conta antes de convidar outra.</p>}
        <p className="mt-2 text-xs text-muted-foreground">A pessoa recebe um e-mail para criar a própria senha. Ninguém mais vê essa senha.</p>
      </section>

      <section className="rounded-2xl border border-border bg-card">
        <h2 className="flex items-center gap-2 border-b border-border p-4 font-semibold"><ShieldCheck className="h-4 w-4" aria-hidden />Usuários</h2>
        <ul className="divide-y divide-border">
          {d.users.map((u) => {
            const self = u.id === d.me;
            return (
              <li key={u.id} className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{u.email}{self && <span className="ml-2 text-xs text-primary">você</span>}</p>
                  <p className="text-xs text-muted-foreground">
                    {u.confirmed ? `Último acesso: ${fmt(u.lastSignIn)}` : `Convite pendente desde ${fmt(u.invitedAt)}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <select
                    aria-label={`Papel de ${u.email}`}
                    className={selectCls}
                    value={u.role ?? ""}
                    disabled={rm.isPending || self}
                    onChange={(e) => rm.mutate({ userId: u.id, role: (e.target.value || null) as Role | null })}
                  >
                    <option value="">Sem acesso</option>
                    {(Object.keys(ROLE_LABEL) as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                  </select>
                  {u.role && !self && (
                    <Button
                      variant="outline"
                      className="h-11"
                      disabled={rm.isPending}
                      onClick={() => { if (confirm(`Revogar o acesso de ${u.email}?`)) rm.mutate({ userId: u.id, role: null }); }}
                    >
                      Revogar
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        <p className="border-t border-border p-4 text-xs text-muted-foreground">Você não pode alterar o próprio papel aqui, e o último administrador nunca pode ser removido.</p>
      </section>

      <section className="rounded-2xl border border-border bg-card">
        <h2 className="flex items-center gap-2 border-b border-border p-4 font-semibold"><History className="h-4 w-4" aria-hidden />Histórico de acesso</h2>
        {d.audit.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Nenhuma alteração registrada.</p>
        ) : (
          <ul className="divide-y divide-border">
            {d.audit.map((a) => (
              <li key={a.id} className="p-4 text-sm">
                <p><span className="font-medium">{ACTION_LABEL[a.action] ?? a.action}</span> · {a.target}</p>
                <p className="text-xs text-muted-foreground">por {a.actor} · {fmt(a.at)}{a.columns.length ? ` · campos: ${a.columns.join(", ")}` : ""}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
