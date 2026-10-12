import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { meService } from "@/services/live";
import { Database, ShieldCheck, Plug } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader, Panel, DemoNotice } from "@/components/app/ui-bits";
import { GoogleCalendarConnect } from "@/components/app/GoogleCalendarConnect";
import { GoogleDriveStorageConnect } from "@/components/app/GoogleDriveStorageConnect";
import { SidOpenAIIntegrationStatus } from "@/components/app/SidOpenAIIntegrationStatus";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => pageHead("Configurações", "Perfil, equipe, autonomia do SID, integrações e dados."),
  component: SettingsPage,
});

const INTEGRATIONS: [string, string][] = [
  [
    "PLAUD",
    "Canal futuro · importação manual de arquivos exportados. Você ainda não possui o dispositivo.",
  ],
  ["Google Agenda", "Não conectado · exigirá autorização e confirmação antes de criar eventos."],
  ["Gmail / Gemini", "Não conectado · importação de resumos de reunião planejada (P2)."],
  [
    "WhatsApp Business",
    "Não conectado · somente via API oficial após validação técnica e jurídica (P2).",
  ],
];
const ACTIONS = [
  "Enviar mensagem externa",
  "Apresentar duas pessoas",
  "Criar evento de agenda",
  "Atualizar perfil de pessoa",
  "Criar tarefa",
];

function ProfileTab() {
  const qc = useQueryClient();
  const me = useQuery({ queryKey: ["me"], queryFn: () => meService.get() });
  const [name, setName] = useState<string | null>(null);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [curPw, setCurPw] = useState("");
  const [saving, setSaving] = useState(false);

  if (me.isLoading) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  if (!me.data) return <p className="text-sm text-destructive">Sessão expirada. Entre novamente.</p>;

  const displayName = name ?? me.data.name;

  async function saveName() {
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ data: { full_name: displayName } });
      if (error) throw error;
      toast.success("Nome atualizado.");
      qc.invalidateQueries({ queryKey: ["me"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function savePassword() {
    if (pw.length < 8) {
      toast.warning("A nova senha precisa de pelo menos 8 caracteres.");
      return;
    }
    if (pw !== pw2) {
      toast.warning("As senhas não coincidem.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw, current_password: curPw });
      if (error) throw error;
      toast.success("Senha alterada.");
      setPw("");
      setPw2("");
      setCurPw("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível alterar a senha.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <Panel title="Seu perfil">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="pn">Nome de exibição</Label>
            <Input
              id="pn"
              value={displayName}
              onChange={(e) => setName(e.target.value)}
              className="h-11"
              placeholder="Como você aparece para a equipe"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="pe">E-mail (login)</Label>
            <Input id="pe" value={me.data.email} disabled className="h-11" />
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          O e-mail de login só pode ser trocado por um administrador na tela Acesso e equipe.
        </p>
        <Button className="mt-3" disabled={saving} onClick={saveName}>
          Salvar perfil
        </Button>
      </Panel>

      <Panel title="Alterar senha">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="grid gap-1.5">
            <Label htmlFor="cpw">Senha atual</Label>
            <Input
              id="cpw"
              type="password"
              value={curPw}
              onChange={(e) => setCurPw(e.target.value)}
              className="h-11"
              autoComplete="current-password"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="npw">Nova senha</Label>
            <Input
              id="npw"
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              className="h-11"
              autoComplete="new-password"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="npw2">Repetir nova senha</Label>
            <Input
              id="npw2"
              type="password"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              className="h-11"
              autoComplete="new-password"
            />
          </div>
        </div>
        <Button className="mt-3" variant="secondary" disabled={saving} onClick={savePassword}>
          Alterar senha
        </Button>
      </Panel>
    </div>
  );
}

function SettingsPage() {
  const [reduce, setReduce] = useState(false);
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader eyebrow="Administração" title="Configurações" />
      <Tabs defaultValue="perfil">
        <TabsList className="h-auto w-full justify-start overflow-x-auto">
          {(
            [
              ["perfil", "Perfil"],
              ["equipe", "Equipe"],
              ["sid", "Autonomia do SID"],
              ["integracoes", "Integrações"],
              ["dados", "Dados e Supabase"],
              ["acess", "Acessibilidade"],
            ] as const
          ).map(([v, l]) => (
            <TabsTrigger key={v} value={v} className="min-h-10">
              {l}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="perfil">
          <ProfileTab />
        </TabsContent>

        <TabsContent value="equipe">
          <Panel title="Equipe (até 5 colaboradores)">
            <p className="text-sm text-muted-foreground">
              Convites, papéis (Administrador, Gestor, Operacional) e histórico de acessos ficam na
              tela <b>Acesso e equipe</b>, exclusiva de administradores.
            </p>
            <Button asChild className="mt-3">
              <Link to="/acesso">Abrir Acesso e equipe</Link>
            </Button>
          </Panel>
        </TabsContent>

        <TabsContent value="sid">
          <Panel title="Matriz de autonomia">
            <ul className="space-y-2">
              {ACTIONS.map((a) => (
                <li
                  key={a}
                  className="flex flex-col gap-2 rounded-xl border p-3 sm:flex-row sm:items-center"
                >
                  <span className="flex-1 text-sm">{a}</span>
                  <Select defaultValue="aprovar">
                    <SelectTrigger className="h-10 sm:w-52" aria-label={a}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aprovar">Sempre pedir aprovação</SelectItem>
                      <SelectItem value="rascunho">Somente rascunho</SelectItem>
                      <SelectItem value="nunca">Nunca</SelectItem>
                    </SelectContent>
                  </Select>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">
              Na v1.0, nenhuma ação externa é automática.
            </p>
          </Panel>
        </TabsContent>

        <TabsContent value="integracoes">
          <Panel title="Integrações">
            <ul className="space-y-2">
              <GoogleCalendarConnect />
              <GoogleDriveStorageConnect />
              <SidOpenAIIntegrationStatus />
              {INTEGRATIONS.filter(([n]) => !/agenda|calendar/i.test(n)).map(([n, d]) => (
                <li key={n} className="flex gap-3 rounded-xl border p-3">
                  <Plug className="h-5 w-5 shrink-0 text-subtle" />
                  <div>
                    <p className="text-sm font-semibold">
                      {n}{" "}
                      <span className="ml-1 rounded-full border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        não conectado
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">{d}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        </TabsContent>

        <TabsContent value="dados" className="space-y-4">
          <Panel
            title={
              <span className="flex items-center gap-2">
                <Database className="h-4 w-4 text-primary" />
                Fonte de dados
              </span>
            }
          >
            <p className="text-sm">
              Estado atual:{" "}
              <b className="text-primary">Backend conectado (Lovable Cloud) com acesso por RLS.</b>
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>Login por convite ativo; cadastro público desativado (máx. 6 usuários).</li>
              <li>Pessoas, Interações e Tarefas já gravam no banco real.</li>
              <li>Demais telas seguem em demonstração honesta até a migração tela a tela.</li>
            </ul>
          </Panel>
          <Panel
            title={
              <span className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Segurança
              </span>
            }
          >
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>Nenhuma chave privilegiada no navegador; somente chave publicável + RLS.</li>
              <li>Arquivos em buckets privados com URLs assinadas e validade curta.</li>
              <li>Nenhum dado real guardado no navegador.</li>
              <li>Auditoria de criação, alteração, exclusão e acesso sensível.</li>
            </ul>
          </Panel>
        </TabsContent>

        <TabsContent value="acess">
          <Panel title="Acessibilidade">
            <label className="flex items-center justify-between gap-3 text-sm">
              <span>
                Reduzir animações
                <br />
                <span className="text-xs text-muted-foreground">
                  O sistema também respeita a preferência do aparelho.
                </span>
              </span>
              <Switch
                checked={reduce}
                onCheckedChange={(v) => {
                  setReduce(v);
                  document.documentElement.style.setProperty("scroll-behavior", v ? "auto" : "");
                  document.documentElement.classList.toggle("motion-reduce", v);
                }}
              />
            </label>
            <div className="mt-3">
              <DemoNotice>Preferência válida só nesta sessão.</DemoNotice>
            </div>
          </Panel>
        </TabsContent>
      </Tabs>
    </div>
  );
}
