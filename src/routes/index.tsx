import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Mic,
  Camera,
  Paperclip,
  PenLine,
  ArrowRight,
  AlertCircle,
  Upload,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel, DemoTag, EmptyState, PriorityBadge } from "@/components/app/ui-bits";
import { peopleService, tasksService } from "@/services";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/")({
  head: () =>
    pageHead(
      "Início",
      "Painel diário: captura rápida, perguntas ao SID, prioridades e follow-ups.",
    ),
  component: Index,
});

const QUICK = [
  { label: "Gravar áudio", icon: Mic, mode: "audio" },
  { label: "Fotografar", icon: Camera, mode: "foto" },
  { label: "Anexar", icon: Paperclip, mode: "arquivo" },
  { label: "Nota", icon: PenLine, mode: "nota" },
] as const;

function Index() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const tasks = tasksService
    .list()
    .filter((t) => t.status !== "feito")
    .sort((a, b) => Number(!!b.late) - Number(!!a.late))
    .slice(0, 3);
  const overdue = peopleService
    .list()
    .flatMap((p) => p.followups.filter((f) => f.overdue).map((f) => ({ ...f, person: p })));

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div>
        <div className="eyebrow">Domingo, 11 de outubro</div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          Bom dia. O que vamos registrar hoje?
        </h1>
      </div>

      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {QUICK.map(({ label, icon: I, mode }) => (
          <Link
            key={mode}
            to="/capturar"
            search={{ modo: mode }}
            className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl border bg-card p-3 text-xs font-semibold transition-colors hover:border-lime-line hover:bg-lime-deep sm:text-sm"
          >
            <I className="h-6 w-6 text-primary" aria-hidden />
            {label}
          </Link>
        ))}
      </div>

      <form
        className="flex gap-2 rounded-2xl border bg-card p-2"
        onSubmit={(e) => {
          e.preventDefault();
          navigate({ to: "/sid", search: q.trim() ? { q: q.trim() } : {} });
        }}
      >
        <Sparkles className="ml-2 h-5 w-5 shrink-0 self-center text-primary" aria-hidden />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Pergunte ao SID"
          placeholder="Pergunte ao SID: com quem devo falar hoje?"
          className="min-w-0 flex-1 bg-transparent px-1 text-sm outline-none"
        />
        <Button
          type="button"
          size="icon"
          variant="secondary"
          className="h-11 w-11"
          aria-label="Perguntar por voz"
          onClick={() => navigate({ to: "/sid", search: { voz: true } })}
        >
          <Mic className="h-5 w-5" />
        </Button>
        <Button type="submit" className="h-11">
          Perguntar
        </Button>
      </form>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Três prioridades do dia" action={<DemoTag />} className="lg:col-span-2">
          <ul className="divide-y">
            {tasks.map((t, i) => (
              <li key={t.id} className="flex items-center gap-3 py-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-lime-deep text-sm font-bold text-primary">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{t.title}</p>
                  <p
                    className={
                      t.late
                        ? "text-xs font-semibold text-destructive"
                        : "text-xs text-muted-foreground"
                    }
                  >
                    Prazo {t.due}
                    {t.late && " · atrasada"}
                  </p>
                </div>
                <PriorityBadge p={t.priority} />
              </li>
            ))}
          </ul>
          <Link
            to="/tarefas"
            className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-lime-line hover:text-primary"
          >
            Ver todas as tarefas <ArrowRight className="h-4 w-4" />
          </Link>
        </Panel>

        <Panel title="Follow-ups atrasados" action={<DemoTag />}>
          {overdue.length === 0 ? (
            <EmptyState
              title="Nada atrasado"
              text="Quando houver follow-ups vencidos, eles aparecem aqui."
            />
          ) : (
            <ul className="space-y-2">
              {overdue.map((f) => (
                <li key={f.id}>
                  <Link
                    to="/pessoas/$id"
                    params={{ id: f.person.id }}
                    className="flex gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3 hover:border-destructive/60"
                  >
                    <AlertCircle className="h-5 w-5 shrink-0 text-destructive" aria-hidden />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{f.person.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {f.reason} · venceu {f.date}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Status das importações">
          <EmptyState
            title="Nenhuma importação real"
            text="Importações de contatos e arquivos PLAUD aparecerão aqui depois que o Supabase for conectado."
            action={
              <Button asChild variant="secondary">
                <Link to="/pessoas/importar">
                  <Upload className="h-4 w-4" />
                  Ver importador (demo)
                </Link>
              </Button>
            }
          />
        </Panel>
        <Panel title="Indicadores">
          <EmptyState
            title="Sem métricas reais ainda"
            text="Indicadores só serão exibidos quando derivados de registros reais. Nenhum número inventado é mostrado."
            action={
              <Button asChild variant="secondary">
                <Link to="/relatorios">Abrir relatórios</Link>
              </Button>
            }
          />
        </Panel>
      </div>
    </div>
  );
}
