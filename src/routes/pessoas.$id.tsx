import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Phone, Mail, Building2, MapPin, CalendarPlus, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Panel,
  LevelBadge,
  PriorityBadge,
  Avatar,
  EmptyState,
  DemoTag,
} from "@/components/app/ui-bits";
import { peopleService } from "@/services";
import type { Followup } from "@/types/domain";

export const Route = createFileRoute("/pessoas/$id")({
  loader: ({ params }) => {
    const person = peopleService.get(params.id);
    if (!person) throw notFound();
    return { person };
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData ? `${loaderData.person.name} · Seed Connection` : "Pessoa não encontrada",
      },
      {
        name: "description",
        content: "Perfil relacional com contatos, necessidades, habilidades e histórico.",
      },
      { property: "og:title", content: "Perfil de pessoa · Seed Connection" },
      { property: "og:description", content: "Perfil relacional privado." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  notFoundComponent: () => (
    <EmptyState
      title="Pessoa não encontrada"
      text="Este registro não existe no modo demonstração."
      action={
        <Button asChild>
          <Link to="/pessoas">Voltar</Link>
        </Button>
      }
    />
  ),
  component: PersonPage,
});

function PersonPage() {
  const { person: p } = Route.useLoaderData();
  const [fups, setFups] = useState<Followup[]>(p.followups);
  const [reason, setReason] = useState("");
  const [date, setDate] = useState("");
  const conns = p.connections.map((id) => peopleService.get(id)).filter(Boolean);

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <Link
        to="/pessoas"
        className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Pessoas
      </Link>
      <div className="flex flex-col gap-4 rounded-2xl border bg-card bg-glow p-5 sm:flex-row sm:items-center">
        <Avatar name={p.name} className="h-16 w-16 text-lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold">{p.name}</h1>
            <DemoTag />
          </div>
          <p className="text-sm text-muted-foreground">
            {p.role} · {p.company}
          </p>
          {p.aliases.length > 0 && (
            <p className="text-xs text-subtle">Também conhecido como {p.aliases.join(", ")}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="text-[11px] text-muted-foreground">Proximidade:</span>
            <LevelBadge level={p.proximity} />
            <span className="ml-2 text-[11px] text-muted-foreground">Estratégia:</span>
            <PriorityBadge p={p.priority} />
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Lock className="h-3 w-3" />
              Visibilidade: {p.visibility}
            </span>
          </div>
        </div>
      </div>

      <Tabs defaultValue="geral">
        <TabsList className="h-auto w-full justify-start overflow-x-auto">
          {(
            [
              ["geral", "Visão geral"],
              ["necessidades", "Dores e recursos"],
              ["conexoes", "Conexões"],
              ["historico", "Histórico"],
              ["followups", "Follow-ups"],
            ] as const
          ).map(([v, l]) => (
            <TabsTrigger key={v} value={v} className="min-h-10">
              {l}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="geral" className="grid gap-4 md:grid-cols-2">
          <Panel title="Cinco pilares">
            <dl className="divide-y divide-dashed text-sm">
              {[
                ["Nome", p.name],
                ["Cidade", p.city],
                ["Trabalho", `${p.role} · ${p.company}`],
                ["Habilidade", p.skills[0] ?? "—"],
                ["Dor", p.needs[0] ?? "—"],
              ].map(([k, v]) => (
                <div key={k} className="grid grid-cols-[96px_1fr] gap-2 py-2">
                  <dt className="eyebrow pt-0.5">{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </Panel>
          <Panel title="Contatos e empresa">
            <ul className="space-y-2 text-sm">
              {p.phones.map((x) => (
                <li key={x} className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-primary" />
                  {x}
                </li>
              ))}
              {p.emails.map((x) => (
                <li key={x} className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary" />
                  {x}
                </li>
              ))}
              <li className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                {p.company} · esfera {p.sphere}
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                {p.city}
              </li>
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">
              Completude do cadastro: {p.completeness}%
            </p>
          </Panel>
        </TabsContent>

        <TabsContent value="necessidades" className="grid gap-4 md:grid-cols-2">
          <Panel title="Necessidades / dores">
            {p.needs.length ? (
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {p.needs.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma registrada.</p>
            )}
          </Panel>
          <Panel title="Habilidades / recursos">
            {p.skills.length ? (
              <div className="flex flex-wrap gap-2">
                {p.skills.map((s) => (
                  <span key={s} className="rounded-full border px-3 py-1 text-xs">
                    {s}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma registrada.</p>
            )}
          </Panel>
        </TabsContent>

        <TabsContent value="conexoes">
          <Panel title="Conexões registradas">
            {conns.length === 0 ? (
              <EmptyState
                title="Sem conexões"
                text="Coocorrência em conversas não é tratada como conexão comprovada."
              />
            ) : (
              <ul className="divide-y">
                {conns.map(
                  (c) =>
                    c && (
                      <li key={c.id}>
                        <Link
                          to="/pessoas/$id"
                          params={{ id: c.id }}
                          className="flex items-center gap-3 py-3 hover:text-primary"
                        >
                          <Avatar name={c.name} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">{c.name}</p>
                            <p className="text-xs text-muted-foreground">{c.company}</p>
                          </div>
                          <LevelBadge level={c.proximity} />
                        </Link>
                      </li>
                    ),
                )}
              </ul>
            )}
          </Panel>
        </TabsContent>

        <TabsContent value="historico">
          <Panel title="Histórico cronológico">
            {p.history.length === 0 ? (
              <EmptyState
                title="Sem interações"
                text="Capturas aprovadas aparecerão aqui com fonte e data."
              />
            ) : (
              <ol className="relative space-y-4 border-l pl-5">
                {p.history.map((h, i) => (
                  <li key={i} className="relative">
                    <span
                      className="absolute -left-[26px] top-1 h-3 w-3 rounded-full bg-primary"
                      aria-hidden
                    />
                    <p className="text-xs text-muted-foreground">
                      {h.date} · {h.type}
                    </p>
                    <p className="text-sm">{h.text}</p>
                    <p className="text-[11px] text-subtle">Fonte: {h.source}</p>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </TabsContent>

        <TabsContent value="followups">
          <Panel title="Próximos follow-ups">
            <ul className="mb-4 space-y-2">
              {fups.length === 0 && (
                <li className="text-sm text-muted-foreground">Nenhum follow-up.</li>
              )}
              {fups.map((f) => (
                <li key={f.id} className="flex items-center gap-3 rounded-xl border p-3 text-sm">
                  <CalendarPlus
                    className={f.overdue ? "h-4 w-4 text-destructive" : "h-4 w-4 text-primary"}
                  />
                  <span className="flex-1">{f.reason}</span>
                  <span
                    className={
                      f.overdue
                        ? "text-xs font-semibold text-destructive"
                        : "text-xs text-muted-foreground"
                    }
                  >
                    {f.date}
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setFups((x) => x.filter((y) => y.id !== f.id));
                      toast.warning("Demonstração: concluído só nesta tela.");
                    }}
                  >
                    Concluir
                  </Button>
                </li>
              ))}
            </ul>
            <form
              className="flex flex-col gap-2 sm:flex-row"
              onSubmit={(e) => {
                e.preventDefault();
                if (!reason || !date) {
                  toast.error("Informe motivo e data.");
                  return;
                }
                setFups((x) => [
                  ...x,
                  { id: `f${Date.now()}`, reason, date: date.split("-").reverse().join("/") },
                ]);
                setReason("");
                setDate("");
                toast.warning("Demonstração: follow-up não foi salvo.");
              }}
            >
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Motivo do follow-up"
                aria-label="Motivo"
                className="h-11"
              />
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                aria-label="Data"
                className="h-11 sm:w-44"
              />
              <Button type="submit" className="h-11">
                Adicionar
              </Button>
            </form>
          </Panel>
        </TabsContent>
      </Tabs>
    </div>
  );
}
