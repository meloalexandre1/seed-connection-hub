import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { PageHeader, DemoTag, DemoNotice } from "@/components/app/ui-bits";
import { projectsService } from "@/services";
import { cn } from "@/lib/utils";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/projetos")({
  head: () => pageHead("Projetos", "Objetivos, responsáveis, status, marcos e riscos."),
  component: ProjectsPage,
});

const ST = {
  todos: "Todos",
  ativo: "Ativos",
  pausado: "Pausados",
  concluido: "Concluídos",
} as const;

function ProjectsPage() {
  const [f, setF] = useState<keyof typeof ST>("todos");
  const list = projectsService.list().filter((p) => f === "todos" || p.status === f);
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader eyebrow="Execução" title="Projetos" />
      <div className="mb-4 flex gap-2 overflow-x-auto">
        {(Object.keys(ST) as (keyof typeof ST)[]).map((k) => (
          <button
            key={k}
            aria-pressed={f === k}
            onClick={() => setF(k)}
            className={cn(
              "min-h-9 rounded-full border px-3 text-xs text-areia",
              f === k && "border-lime-line bg-lime-deep text-primary",
            )}
          >
            {ST[k]}
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          Nenhum projeto neste filtro.
        </p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {list.map((p) => (
            <li key={p.id} className="rounded-2xl border bg-card p-4">
              <div className="flex items-start gap-2">
                <p className="flex-1 font-semibold">{p.name}</p>
                <DemoTag />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{p.goal}</p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full bg-primary" style={{ width: `${p.progress}%` }} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {p.progress}% · {p.status} · {p.owner}
              </p>
              {p.risk && (
                <p className="mt-2 flex items-center gap-1 text-xs text-warning">
                  <AlertTriangle className="h-3 w-3" />
                  {p.risk}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4">
        <DemoNotice>
          Criação e edição de projetos serão habilitadas com o backend conectado.
        </DemoNotice>
      </div>
    </div>
  );
}
