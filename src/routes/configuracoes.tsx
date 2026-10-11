import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Database, ShieldCheck, Plug } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, Panel, DemoNotice } from "@/components/app/ui-bits";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/configuracoes")({
  head: () => pageHead("Configurações", "Perfil, equipe, autonomia do SID, integrações e dados."),
  component: SettingsPage,
});

const INTEGRATIONS = [
  ["PLAUD", "Canal futuro · importação manual de arquivos exportados. Você ainda não possui o dispositivo."],
  ["Google Agenda", "Não conectado · exigirá autorização e confirmação antes de criar eventos."],
  ["Gmail / Gemini", "Não conectado · importação de resumos de reunião planejada (P2)."],
  ["WhatsApp Business", "Não conectado · somente via API oficial após validação técnica e jurídica (P2)."],
];
const ACTIONS = ["Enviar mensagem externa", "Apresentar duas pessoas", "Criar evento de agenda", "Atualizar perfil de pessoa", "Criar tarefa"];

function SettingsPage() {
  const [reduce, setReduce] = useState(false);
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader eyebrow="Administração" title="Configurações" />
      <Tabs defaultValue="perfil">
        <TabsList className="h-auto w-full justify-start overflow-x-auto">
          {([["perfil", "Perfil"], ["equipe", "Equipe"], ["sid", "Autonomia do SID"], ["integracoes", "Integrações"], ["dados", "Dados e Supabase"], ["acess", "Acessibilidade"]] as const).map(([v, l]) => <TabsTrigger key={v} value={v} className="min-h-10">{l}</TabsTrigger>)}
        </TabsList>

        <TabsContent value="perfil"><Panel title="Seu perfil">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5"><Label htmlFor="pn">Nome</Label><Input id="pn" defaultValue="Proprietário" className="h-11" /></div>
            <div className="grid gap-1.5"><Label htmlFor="pe">E-mail</Label><Input id="pe" placeholder="definido no login" disabled className="h-11" /></div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Login ainda não disponível: será habilitado com o Supabase Auth do projeto do proprietário.</p>
          <Button className="mt-3" onClick={() => toast.warning("Demonstração: perfil não foi salvo.")}>Salvar (demo)</Button>
        </Panel></TabsContent>

        <TabsContent value="equipe"><Panel title="Equipe (até 5 usuários)">
          <ul className="divide-y text-sm">
            <li className="flex items-center justify-between py-3"><span>Proprietário</span><span className="text-xs text-primary">Administrador</span></li>
            {[1, 2, 3, 4].map((i) => <li key={i} className="flex items-center justify-between py-3 text-muted-foreground"><span>Vaga {i + 1} disponível</span><span className="text-xs">Gestor ou Operacional</span></li>)}
          </ul>
          <Button variant="secondary" className="mt-3" onClick={() => toast.info("Convites exigem backend com autenticação. Indisponível no demo.")}>Convidar usuário</Button>
        </Panel></TabsContent>

        <TabsContent value="sid"><Panel title="Matriz de autonomia">
          <ul className="space-y-2">{ACTIONS.map((a) => (
            <li key={a} className="flex flex-col gap-2 rounded-xl border p-3 sm:flex-row sm:items-center"><span className="flex-1 text-sm">{a}</span>
              <Select defaultValue="aprovar"><SelectTrigger className="h-10 sm:w-52" aria-label={a}><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="aprovar">Sempre pedir aprovação</SelectItem><SelectItem value="rascunho">Somente rascunho</SelectItem><SelectItem value="nunca">Nunca</SelectItem></SelectContent></Select></li>
          ))}</ul>
          <p className="mt-3 text-xs text-muted-foreground">Na v1.0, nenhuma ação externa é automática.</p>
        </Panel></TabsContent>

        <TabsContent value="integracoes"><Panel title="Integrações">
          <ul className="space-y-2">{INTEGRATIONS.map(([n, d]) => (
            <li key={n} className="flex gap-3 rounded-xl border p-3"><Plug className="h-5 w-5 shrink-0 text-subtle" /><div><p className="text-sm font-semibold">{n} <span className="ml-1 rounded-full border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">não conectado</span></p><p className="text-xs text-muted-foreground">{d}</p></div></li>
          ))}</ul>
        </Panel></TabsContent>

        <TabsContent value="dados" className="space-y-4">
          <Panel title={<span className="flex items-center gap-2"><Database className="h-4 w-4 text-primary" />Fonte de dados</span>}>
            <p className="text-sm">Estado atual: <b className="text-warning">Modo demonstração — nenhum backend conectado.</b></p>
            <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
              <li>O proprietário conecta o projeto Supabase externo (Cloud → “Already have a Supabase project?” ou Conectores → Supabase).</li>
              <li>Aplicar o schema proposto (tabelas, RLS e buckets privados).</li>
              <li>Trocar a camada de serviços do modo demo para o Supabase.</li>
              <li>Habilitar login, convites e persistência real.</li>
            </ol>
          </Panel>
          <Panel title={<span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" />Segurança</span>}>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>Nenhuma chave privilegiada no navegador; somente chave publicável + RLS.</li>
              <li>Arquivos em buckets privados com URLs assinadas e validade curta.</li>
              <li>Nenhum dado real guardado no navegador.</li>
              <li>Auditoria de criação, alteração, exclusão e acesso sensível.</li>
            </ul>
          </Panel>
        </TabsContent>

        <TabsContent value="acess"><Panel title="Acessibilidade">
          <label className="flex items-center justify-between gap-3 text-sm"><span>Reduzir animações<br /><span className="text-xs text-muted-foreground">O sistema também respeita a preferência do aparelho.</span></span>
            <Switch checked={reduce} onCheckedChange={(v) => { setReduce(v); document.documentElement.style.setProperty("scroll-behavior", v ? "auto" : ""); document.documentElement.classList.toggle("motion-reduce", v); }} /></label>
          <div className="mt-3"><DemoNotice>Preferência válida só nesta sessão.</DemoNotice></div>
        </Panel></TabsContent>
      </Tabs>
    </div>
  );
}
