import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, Panel, DemoNotice } from "@/components/app/ui-bits";
import { eventsService } from "@/services";
import type { CalendarEvent } from "@/types/domain";
import { cn } from "@/lib/utils";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/agenda")({
  head: () => pageHead("Agenda", "Reuniões, follow-ups e prazos da semana."),
  component: AgendaPage,
});

const DAYS = ["Seg 12", "Ter 13", "Qua 14", "Qui 15", "Sex 16"];
const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
const KIND: Record<CalendarEvent["kind"], string> = { reuniao: "bg-primary text-primary-foreground", followup: "bg-info text-primary-foreground", prazo: "bg-warning text-primary-foreground" };
const KLABEL = { reuniao: "Reunião", followup: "Follow-up", prazo: "Prazo de tarefa" };

function AgendaPage() {
  const events = eventsService.list();
  const [day, setDay] = useState(0);
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader eyebrow="12 – 16 de outubro" title="Agenda">Google Agenda não conectado. Eventos fictícios.</PageHeader>
      <div className="mb-4 flex flex-wrap gap-3 text-xs">{Object.entries(KLABEL).map(([k, l]) => <span key={k} className="flex items-center gap-1.5"><i className={cn("h-3 w-3 rounded-full", KIND[k as CalendarEvent["kind"]])} />{l}</span>)}</div>

      <div className="md:hidden">
        <div className="mb-3 grid grid-cols-5 gap-1">{DAYS.map((d, i) => (
          <button key={d} onClick={() => setDay(i)} aria-pressed={day === i} className={cn("min-h-12 rounded-xl border text-xs", day === i && "border-lime-line bg-lime-deep text-primary")}>{d}</button>
        ))}</div>
        <Panel>
          {events.filter((e) => e.day === day).length === 0 ? <p className="text-sm text-muted-foreground">Sem eventos neste dia.</p> : (
            <ul className="space-y-2">{events.filter((e) => e.day === day).map((e) => (
              <li key={e.id} className="flex gap-3 rounded-xl border p-3"><span className={cn("w-1.5 rounded-full", KIND[e.kind])} /><div><p className="text-sm font-medium">{e.title}</p><p className="text-xs text-muted-foreground">{e.start}h – {e.start + e.duration}h · {KLABEL[e.kind]}</p></div></li>
            ))}</ul>
          )}
        </Panel>
      </div>

      <div className="hidden overflow-hidden rounded-2xl border bg-card md:grid md:grid-cols-[54px_repeat(5,1fr)]">
        <div />{DAYS.map((d) => <div key={d} className="border-b border-l p-2 text-center text-sm font-semibold">{d}</div>)}
        {HOURS.map((h) => (
          <div key={h} className="contents">
            <div className="h-12 border-b pr-2 pt-1 text-right text-[11px] text-subtle">{h}h</div>
            {DAYS.map((_, di) => {
              const ev = events.find((e) => e.day === di && e.start === h);
              return <div key={di} className="relative h-12 border-b border-l">{ev && <div className={cn("absolute inset-x-1 top-1 z-10 rounded-lg p-1.5 text-[11px] font-semibold leading-tight", KIND[ev.kind])} style={{ height: ev.duration * 48 - 8 }}>{ev.title}</div>}</div>;
            })}
          </div>
        ))}
      </div>
      <div className="mt-4"><DemoNotice>Datas citadas em conversas não viram eventos automaticamente: prazo, follow-up e reunião são diferenciados. Criar eventos no Google Agenda exigirá autorização e confirmação.</DemoNotice></div>
    </div>
  );
}
