import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { PageHeader, Panel, DemoTag, DemoNotice } from "@/components/app/ui-bits";
import { opportunitiesService } from "@/services";
import { FACTORS, recommend } from "@/lib/opportunity";
import type { FactorKey, Opportunity, Recommendation } from "@/types/domain";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/oportunidades")({
  head: () =>
    pageHead(
      "Oportunidades",
      "Avalie necessidades em 7 fatores e decida resolver, conectar, adiar ou encerrar.",
    ),
  component: OppPage,
});

const TONE: Record<Recommendation, string> = {
  RESOLVER: "bg-primary text-primary-foreground",
  CONECTAR: "bg-info text-primary-foreground",
  ADIAR: "bg-warning text-primary-foreground",
  ENCERRAR: "bg-surface-2 text-foreground",
};
const blank = (): Opportunity => ({
  id: "",
  title: "",
  need: "",
  resources: "",
  thirdParty: "",
  personIds: [],
  status: "aberta",
  scores: {
    retorno: 3,
    urgencia: 3,
    esforco: 3,
    complexidade: 3,
    custo_oportunidade: 3,
    capacidade: 3,
    conectar: 3,
  },
});

function OppPage() {
  const [list, setList] = useState(opportunitiesService.list());
  const [edit, setEdit] = useState<Opportunity | null>(null);
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        eyebrow="Inteligência"
        title="Oportunidades"
        actions={
          <Button className="h-11" onClick={() => setEdit(blank())}>
            <Plus className="h-4 w-4" />
            Nova avaliação
          </Button>
        }
      >
        Necessidade → recursos → viabilidade → decisão humana → tarefa.
      </PageHeader>
      <ul className="grid gap-3 md:grid-cols-2">
        {list.map((o) => {
          const r = recommend(o.scores);
          return (
            <li key={o.id}>
              <button
                onClick={() => setEdit(o)}
                className="w-full rounded-2xl border bg-card p-4 text-left hover:border-lime-line"
              >
                <div className="flex items-start gap-2">
                  <p className="flex-1 font-semibold">{o.title}</p>
                  <span
                    className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${TONE[r.decision]}`}
                  >
                    {r.decision}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">Necessidade: {o.need}</p>
                <p className="text-sm text-muted-foreground">Terceiros: {o.thirdParty || "—"}</p>
                <div className="mt-2">
                  <DemoTag />
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      <Sheet open={!!edit} onOpenChange={(v) => !v && setEdit(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {edit && (
            <Evaluator
              o={edit}
              onSave={(o) => {
                setList((l) =>
                  o.id
                    ? l.map((x) => (x.id === o.id ? o : x))
                    : [...l, { ...o, id: `o${Date.now()}` }],
                );
                setEdit(null);
                toast.warning("Demonstração: decisão registrada só nesta tela.");
              }}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Evaluator({ o, onSave }: { o: Opportunity; onSave: (o: Opportunity) => void }) {
  const [d, setD] = useState(o);
  const r = recommend(d.scores);
  const setScore = (k: FactorKey, v: number) =>
    setD((x) => ({ ...x, scores: { ...x.scores, [k]: v } }));
  return (
    <>
      <SheetHeader>
        <SheetTitle>{o.id ? "Avaliar oportunidade" : "Nova avaliação"}</SheetTitle>
        <SheetDescription>A recomendação é uma sugestão; a decisão é sua.</SheetDescription>
      </SheetHeader>
      <div className="grid gap-3 px-4 pb-6">
        {(
          [
            ["title", "Título"],
            ["need", "Necessidade / dor"],
            ["resources", "Recursos disponíveis"],
            ["thirdParty", "Capacidade de terceiros"],
          ] as const
        ).map(([k, l]) => (
          <div key={k} className="grid gap-1.5">
            <Label htmlFor={k}>{l}</Label>
            <Input
              id={k}
              value={d[k]}
              onChange={(e) => setD({ ...d, [k]: e.target.value })}
              className="h-11"
            />
          </div>
        ))}
        <div className="mt-2 space-y-4">
          {FACTORS.map((f) => (
            <div key={f.key}>
              <div className="flex justify-between text-sm">
                <span>{f.label}</span>
                <b className="text-primary">{d.scores[f.key]}</b>
              </div>
              <Slider
                min={1}
                max={5}
                step={1}
                value={[d.scores[f.key]]}
                onValueChange={([v]) => setScore(f.key, v ?? 3)}
                aria-label={f.label}
                className="mt-2"
              />
              <p className="mt-1 text-[11px] text-subtle">{f.hint}</p>
            </div>
          ))}
        </div>
        <Panel className="mt-2 border-lime-line bg-lime-deep">
          <p className="eyebrow">Recomendação</p>
          <p className="mt-1 text-2xl font-bold">{r.decision}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {r.reasons.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Regra explicável baseada nas suas notas — não é IA.
          </p>
        </Panel>
        <DemoNotice>
          Com backend, a decisão humana gera tarefa e acompanhamento com trilha de auditoria.
        </DemoNotice>
        <Button className="h-11" onClick={() => onSave(d)} disabled={!d.title.trim()}>
          Registrar decisão (demo)
        </Button>
      </div>
    </>
  );
}
