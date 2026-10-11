import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader, PriorityBadge, DemoNotice } from "@/components/app/ui-bits";
import { tasksService, peopleService } from "@/services";
import type { Priority, Task, TaskStatus } from "@/types/domain";
import { cn } from "@/lib/utils";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/tarefas")({
  head: () => pageHead("Tarefas", "Kanban de tarefas e follow-ups vinculados a pessoas."),
  component: TasksPage,
});

const COLS: { key: TaskStatus; label: string }[] = [
  { key: "a_fazer", label: "A fazer" },
  { key: "fazendo", label: "Fazendo" },
  { key: "aguardando", label: "Aguardando" },
  { key: "feito", label: "Feito" },
];
const FILTERS = ["Todas", "Minhas", "Equipe", "Atrasadas"] as const;

function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>(tasksService.list());
  const [f, setF] = useState<(typeof FILTERS)[number]>("Todas");
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [prio, setPrio] = useState<Priority>("media");
  const [due, setDue] = useState("");

  const visible = tasks.filter(
    (t) =>
      f === "Todas" ||
      (f === "Minhas" && t.owner === "Você") ||
      (f === "Equipe" && t.owner === "Equipe") ||
      (f === "Atrasadas" && t.late),
  );
  const move = (id: string, dir: -1 | 1) =>
    setTasks((ts) =>
      ts.map((t) => {
        if (t.id !== id) return t;
        const i = COLS.findIndex((c) => c.key === t.status) + dir;
        return COLS[i] ? { ...t, status: COLS[i].key } : t;
      }),
    );

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Execução"
        title="Tarefas"
        actions={
          <Button className="h-11" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            Nova tarefa
          </Button>
        }
      />
      <div className="mb-3">
        <DemoNotice>Tarefas fictícias. Mover ou criar altera só esta tela.</DemoNotice>
      </div>
      <div className="mb-4 flex gap-2 overflow-x-auto">
        {FILTERS.map((x) => (
          <button
            key={x}
            aria-pressed={f === x}
            onClick={() => setF(x)}
            className={cn(
              "min-h-9 whitespace-nowrap rounded-full border px-3 text-xs font-medium text-areia",
              f === x && "border-lime-line bg-lime-deep text-primary",
            )}
          >
            {x}
          </button>
        ))}
      </div>
      <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 lg:mx-0 lg:grid lg:grid-cols-4 lg:px-0">
        {COLS.map((c) => {
          const list = visible.filter((t) => t.status === c.key);
          return (
            <section
              key={c.key}
              className="w-[82vw] shrink-0 snap-start rounded-2xl border bg-card p-3 sm:w-80 lg:w-auto"
              aria-label={c.label}
            >
              <h2 className="flex justify-between px-1 pb-3 text-[11px] font-semibold uppercase tracking-wider text-areia">
                {c.label}
                <span>{list.length}</span>
              </h2>
              {list.length === 0 && (
                <p className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">
                  Vazio
                </p>
              )}
              <ul className="space-y-2">
                {list.map((t) => {
                  const p = t.personId ? peopleService.get(t.personId) : undefined;
                  return (
                    <li key={t.id} className="rounded-xl border bg-secondary p-3">
                      <p className="text-sm font-medium">{t.title}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <PriorityBadge p={t.priority} />
                        <span className={cn(t.late && "font-semibold text-destructive")}>
                          {t.due}
                          {t.late && " · atrasada"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-subtle">
                        {t.owner}
                        {p && ` · ${p.name}`}
                      </p>
                      <div className="mt-2 flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-9 w-9"
                          aria-label="Mover para a esquerda"
                          disabled={c.key === "a_fazer"}
                          onClick={() => move(t.id, -1)}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-9 w-9"
                          aria-label="Mover para a direita"
                          disabled={c.key === "feito"}
                          onClick={() => move(t.id, 1)}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova tarefa</DialogTitle>
            <DialogDescription>Demonstração: não será salva.</DialogDescription>
          </DialogHeader>
          <form
            id="nt"
            className="grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!title.trim()) {
                toast.error("Informe o título.");
                return;
              }
              setTasks((t) => [
                ...t,
                {
                  id: `t${Date.now()}`,
                  title,
                  priority: prio,
                  due: due ? due.split("-").reverse().slice(0, 2).join("/") : "sem prazo",
                  status: "a_fazer",
                  owner: "Você",
                },
              ]);
              setTitle("");
              setDue("");
              setOpen(false);
              toast.warning("Demonstração: tarefa criada só nesta tela.");
            }}
          >
            <div className="grid gap-1.5">
              <Label htmlFor="tt">Título</Label>
              <Input
                id="tt"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Prioridade</Label>
                <Select value={prio} onValueChange={(v) => setPrio(v as Priority)}>
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="baixa">Baixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="td">Prazo</Label>
                <Input
                  id="td"
                  type="date"
                  value={due}
                  onChange={(e) => setDue(e.target.value)}
                  className="h-11"
                />
              </div>
            </div>
          </form>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="nt">
              Criar (demo)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
