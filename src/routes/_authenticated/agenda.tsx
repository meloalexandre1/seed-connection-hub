import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel } from "@/components/app/ui-bits";
import { liveAgenda, type AgendaItem } from "@/services/live";
import { cn } from "@/lib/utils";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/agenda")({
  head: () => pageHead("Agenda", "Prazos e follow-ups por dia, semana ou mês."),
  component: AgendaPage,
});

type View = "dia" | "semana" | "mes";

const KIND_STYLE: Record<AgendaItem["kind"], string> = {
  prazo: "bg-warning text-primary-foreground",
  followup: "bg-info text-primary-foreground",
};
const KIND_LABEL = { prazo: "Prazo de tarefa", followup: "Follow-up" };
const WD = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const startOfWeek = (d: Date) => addDays(d, -d.getDay());
const fmtDay = (d: Date) =>
  d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
const fmtMonth = (d: Date) =>
  d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

function AgendaPage() {
  const [view, setView] = useState<View>("semana");
  const [cursor, setCursor] = useState(() => new Date());
  const items = useQuery({ queryKey: ["agenda"], queryFn: () => liveAgenda.list() });

  const byDate = useMemo(() => {
    const m = new Map<string, AgendaItem[]>();
    for (const it of items.data ?? []) {
      const arr = m.get(it.date) ?? [];
      arr.push(it);
      m.set(it.date, arr);
    }
    return m;
  }, [items.data]);

  const shift = (n: number) =>
    setCursor((c) =>
      view === "dia"
        ? addDays(c, n)
        : view === "semana"
          ? addDays(c, n * 7)
          : new Date(c.getFullYear(), c.getMonth() + n, 1),
    );

  const title =
    view === "dia"
      ? cursor.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })
      : view === "semana"
        ? `${fmtDay(startOfWeek(cursor))} – ${fmtDay(addDays(startOfWeek(cursor), 6))}`
        : fmtMonth(cursor);

  const weekDays = useMemo(() => {
    const s = startOfWeek(cursor);
    return Array.from({ length: 7 }, (_, i) => addDays(s, i));
  }, [cursor]);

  const monthCells = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = startOfWeek(first);
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [cursor]);

  const todayIso = iso(new Date());

  const dayList = (d: Date) => {
    const list = byDate.get(iso(d)) ?? [];
    if (!list.length)
      return <p className="text-sm text-muted-foreground">Nada neste dia.</p>;
    return (
      <ul className="space-y-2">
        {list.map((e) => (
          <li key={e.id} className="flex gap-3 rounded-xl border p-3">
            <span className={cn("w-1.5 rounded-full", KIND_STYLE[e.kind])} />
            <div className="min-w-0">
              <p className={cn("text-sm font-medium", e.done && "line-through opacity-60")}>
                {e.title}
              </p>
              <p className="text-xs text-muted-foreground">{e.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader eyebrow="Agenda" title={title}>
        Prazos de tarefas e follow-ups reais do banco. Google Agenda ainda não conectado.
      </PageHeader>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex rounded-xl border bg-secondary p-1" role="group" aria-label="Modo de visualização">
          {(["dia", "semana", "mes"] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              aria-pressed={view === v}
              className={cn(
                "min-h-10 rounded-lg px-4 text-sm font-medium",
                view === v ? "bg-lime-deep text-primary" : "text-muted-foreground",
              )}
            >
              {v === "dia" ? "Dia" : v === "semana" ? "Semana" : "Mês"}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-10 w-10" aria-label="Anterior" onClick={() => shift(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button variant="secondary" className="h-10" onClick={() => setCursor(new Date())}>
            Hoje
          </Button>
          <Button variant="ghost" size="icon" className="h-10 w-10" aria-label="Próximo" onClick={() => shift(1)}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-3 text-xs">
        {Object.entries(KIND_LABEL).map(([k, l]) => (
          <span key={k} className="flex items-center gap-1.5">
            <i className={cn("h-3 w-3 rounded-full", KIND_STYLE[k as AgendaItem["kind"]])} />
            {l}
          </span>
        ))}
      </div>

      {items.isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
      {items.isError && (
        <p className="text-sm text-destructive">Não foi possível carregar a agenda.</p>
      )}

      {items.isSuccess && view === "dia" && <Panel>{dayList(cursor)}</Panel>}

      {items.isSuccess && view === "semana" && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-7">
          {weekDays.map((d) => {
            const list = byDate.get(iso(d)) ?? [];
            return (
              <div
                key={iso(d)}
                className={cn(
                  "min-h-28 rounded-xl border bg-card p-2",
                  iso(d) === todayIso && "border-lime-line",
                )}
              >
                <p className="mb-1.5 text-center text-xs font-semibold">
                  {WD[d.getDay()]} {d.getDate()}
                </p>
                <ul className="space-y-1">
                  {list.map((e) => (
                    <li
                      key={e.id}
                      title={`${e.title} — ${e.detail}`}
                      className={cn(
                        "truncate rounded-md px-1.5 py-1 text-[11px] font-medium",
                        KIND_STYLE[e.kind],
                        e.done && "line-through opacity-60",
                      )}
                    >
                      {e.title}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      {items.isSuccess && view === "mes" && (
        <div className="overflow-hidden rounded-2xl border bg-card">
          <div className="grid grid-cols-7 border-b text-center text-[11px] font-semibold text-subtle">
            {WD.map((w) => (
              <div key={w} className="p-2">
                {w}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {monthCells.map((d) => {
              const list = byDate.get(iso(d)) ?? [];
              const outside = d.getMonth() !== cursor.getMonth();
              return (
                <button
                  key={iso(d)}
                  onClick={() => {
                    setCursor(d);
                    setView("dia");
                  }}
                  className={cn(
                    "min-h-16 border-b border-l p-1 text-left align-top hover:bg-secondary focus-visible:bg-secondary sm:min-h-24",
                    outside && "opacity-40",
                    iso(d) === todayIso && "bg-lime-deep/40",
                  )}
                >
                  <span
                    className={cn(
                      "text-[11px] font-semibold",
                      iso(d) === todayIso && "text-primary",
                    )}
                  >
                    {d.getDate()}
                  </span>
                  <span className="mt-0.5 flex flex-wrap gap-0.5">
                    {list.slice(0, 3).map((e) => (
                      <i
                        key={e.id}
                        title={e.title}
                        className={cn("h-1.5 w-1.5 rounded-full", KIND_STYLE[e.kind])}
                      />
                    ))}
                    {list.length > 3 && (
                      <span className="text-[9px] text-subtle">+{list.length - 3}</span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {items.isSuccess && (items.data ?? []).length === 0 && (
        <Panel className="mt-4">
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <CalendarDays className="h-8 w-8 text-subtle" />
            <p className="text-sm text-muted-foreground">
              Nenhum prazo ou follow-up com data. Crie tarefas com vencimento para vê-las aqui.
            </p>
          </div>
        </Panel>
      )}
    </div>
  );
}
