import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Upload, Plus, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, LevelBadge, PriorityBadge, Avatar, EmptyState } from "@/components/app/ui-bits";
import { PersonFormDialog } from "@/components/app/PersonFormDialog";
import { PROXIMITY } from "@/services";
import { livePeople, fmtDate } from "@/services/live";
import type { Priority, Proximity } from "@/types/domain";
import { cn } from "@/lib/utils";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/pessoas/")({
  head: () => pageHead("Pessoas", "CRM de relacionamentos: busque, filtre e abra perfis."),
  component: PeoplePage,
});

function PeoplePage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [level, setLevel] = useState<Proximity | "todos">("todos");
  const [prio, setPrio] = useState<Priority | "todas">("todas");
  const [open, setOpen] = useState(false);
  const list = useQuery({ queryKey: ["people"], queryFn: livePeople.list });

  const create = useMutation({
    mutationFn: (v: Parameters<typeof livePeople.create>) => livePeople.create(...v),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["people"] });
      toast.success("Pessoa salva.");
      setOpen(false);
    },
    onError: (e) => toast.error(`Não foi possível salvar: ${e.message}`),
  });

  const people = useMemo(() => {
    const s = q.toLowerCase();
    return (list.data ?? []).filter(
      (p) =>
        (level === "todos" || p.proximity === level) &&
        (prio === "todas" || p.priority === prio) &&
        (!s ||
          [p.name, p.company, p.city, p.role, ...p.aliases, ...p.skills, ...p.needs]
            .join(" ")
            .toLowerCase()
            .includes(s)),
    );
  }, [q, level, prio, list.data]);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="CRM"
        title="Pessoas"
        actions={
          <>
            <Button asChild variant="secondary" className="h-11">
              <Link to="/pessoas/importar">
                <Upload className="h-4 w-4" />
                Importar CSV/XLSX
              </Link>
            </Button>
            <Button className="h-11" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" />
              Nova pessoa
            </Button>
          </>
        }
      >
        Proximidade relacional e prioridade estratégica são classificações independentes.
      </PageHeader>

      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome, empresa, cidade, habilidade ou dor"
            aria-label="Buscar pessoas"
            className="h-11 pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Filtrar por proximidade">
            {[{ key: "todos" as const, label: "Todos" }, ...PROXIMITY].map((p) => (
              <button
                key={p.key}
                onClick={() => setLevel(p.key)}
                aria-pressed={level === p.key}
                className={cn(
                  "min-h-9 whitespace-nowrap rounded-full border px-3 text-xs font-medium text-areia",
                  level === p.key && "border-lime-line bg-lime-deep text-primary",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <Select value={prio} onValueChange={(v) => setPrio(v as Priority | "todas")}>
            <SelectTrigger className="h-9 w-44" aria-label="Filtrar prioridade">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Toda prioridade</SelectItem>
              <SelectItem value="alta">Prioridade alta</SelectItem>
              <SelectItem value="media">Prioridade média</SelectItem>
              <SelectItem value="baixa">Prioridade baixa</SelectItem>
            </SelectContent>
          </Select>
          <span className="ml-auto text-xs text-muted-foreground">{people.length} pessoa(s)</span>
        </div>
      </div>

      <div className="mt-4">
        {list.isLoading ? (
          <p className="p-6 text-center text-sm text-muted-foreground">Carregando…</p>
        ) : list.isError ? (
          <EmptyState title="Não foi possível carregar" text={list.error.message} action={<Button variant="secondary" onClick={() => list.refetch()}>Tentar de novo</Button>} />
        ) : people.length === 0 ? (
          <EmptyState
            title={list.data?.length ? "Nenhuma pessoa encontrada" : "Nenhuma pessoa cadastrada ainda"}
            text={list.data?.length ? "Ajuste a busca ou os filtros." : "Cadastre a primeira pessoa ou importe uma planilha."}
            action={<Button onClick={() => setOpen(true)}>Nova pessoa</Button>}
          />
        ) : (
          <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
            {people.map((p) => (
              <li key={p.id}>
                <Link to="/pessoas/$id" params={{ id: p.id }} className="flex items-center gap-3 p-3 hover:bg-secondary sm:p-4">
                  <Avatar name={p.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{p.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[p.role, p.company, p.city].filter(Boolean).join(" · ") || "Sem detalhes"}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <LevelBadge level={p.proximity} />
                      <PriorityBadge p={p.priority} />
                    </div>
                  </div>
                  <div className="hidden w-36 text-right text-xs text-muted-foreground md:block">
                    Última interação
                    <br />
                    <b className="text-foreground">{fmtDate(p.last_interaction_at)}</b>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-subtle" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <PersonFormDialog
        open={open}
        onOpenChange={setOpen}
        busy={create.isPending}
        onSubmit={(v, contacts) => create.mutate([v, contacts])}
      />
    </div>
  );
}
