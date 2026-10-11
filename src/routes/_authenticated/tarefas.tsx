import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, PriorityBadge, EmptyState } from "@/components/app/ui-bits";
import { liveTasks, livePeople, fmtDate } from "@/services/live";
import type { Priority, TaskStatus } from "@/types/domain";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/tarefas")({
  head: () => pageHead("Tarefas", "Kanban de tarefas e follow-ups."),
  component: TasksPage,
});

const COLS: { key: TaskStatus; label: string }[] = [
  { key: "a_fazer", label: "A fazer" },
  { key: "fazendo", label: "Fazendo" },
  { key: "aguardando", label: "Aguardando" },
  { key: "feito", label: "Feito" },
];

function TasksPage() {
  const qc = useQueryClient();
  const tasks = useQuery({ queryKey: ["tasks"], queryFn: liveTasks.list });
  const people = useQuery({ queryKey: ["people"], queryFn: livePeople.list });
  const [open, setOpen] = useState(false);
  const inv = () => qc.invalidateQueries({ queryKey: ["tasks"] });
  const move = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => liveTasks.setStatus(id, status),
    onSuccess: inv,
    onError: (e) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: liveTasks.remove,
    onSuccess: () => { inv(); toast.success("Tarefa excluída."); },
    onError: (e) => toast.error(e.message),
  });
  const create = useMutation({
    mutationFn: liveTasks.create,
    onSuccess: () => { inv(); setOpen(false); toast.success("Tarefa criada."); },
    onError: (e) => toast.error(e.message),
  });
  const nameOf = (id: string | null) => people.data?.find((p) => p.id === id)?.name;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader eyebrow="Execução" title="Tarefas" actions={<Button className="h-11" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Nova tarefa</Button>}>
        Mova as tarefas entre colunas. Tudo é salvo no banco.
      </PageHeader>
      {tasks.isLoading ? (
        <p className="p-6 text-center text-sm text-muted-foreground">Carregando…</p>
      ) : tasks.isError ? (
        <EmptyState title="Não foi possível carregar" text={tasks.error.message} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {COLS.map((c, ci) => {
            const items = (tasks.data ?? []).filter((t) => t.status === c.key);
            return (
              <section key={c.key} className="rounded-2xl border bg-card p-3">
                <h2 className="mb-2 flex items-center justify-between text-sm font-semibold">
                  {c.label} <span className="text-xs text-muted-foreground">{items.length}</span>
                </h2>
                <ul className="space-y-2">
                  {items.map((t) => {
                    const late = t.due_date && t.due_date < today && t.status !== "feito";
                    return (
                      <li key={t.id} className="rounded-xl border bg-background p-3">
                        <p className="text-sm font-medium">{t.title}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                          <PriorityBadge p={t.priority} />
                          <span className={late ? "text-destructive" : ""}>{t.due_date ? fmtDate(t.due_date) : "Sem prazo"}</span>
                          {t.person_id && nameOf(t.person_id) && (
                            <Link to="/pessoas/$id" params={{ id: t.person_id }} className="underline">{nameOf(t.person_id)}</Link>
                          )}
                        </div>
                        <div className="mt-2 flex gap-1">
                          <Button size="icon" variant="ghost" aria-label="Mover para a coluna anterior" disabled={ci === 0} onClick={() => move.mutate({ id: t.id, status: COLS[ci - 1].key })}><ChevronLeft className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" aria-label="Mover para a próxima coluna" disabled={ci === COLS.length - 1} onClick={() => move.mutate({ id: t.id, status: COLS[ci + 1].key })}><ChevronRight className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" className="ml-auto" aria-label="Excluir tarefa" onClick={() => confirm("Excluir esta tarefa?") && remove.mutate(t.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </li>
                    );
                  })}
                  {items.length === 0 && <li className="p-2 text-xs text-subtle">Vazio</li>}
                </ul>
              </section>
            );
          })}
        </div>
      )}
      <NewTask open={open} onOpenChange={setOpen} people={people.data ?? []} busy={create.isPending} onCreate={(v) => create.mutate(v)} />
    </div>
  );
}

function NewTask({ open, onOpenChange, people, onCreate, busy }: {
  open: boolean; onOpenChange: (v: boolean) => void; busy: boolean;
  people: { id: string; name: string }[];
  onCreate: (v: Parameters<typeof liveTasks.create>[0]) => void;
}) {
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [prio, setPrio] = useState<Priority>("media");
  const [person, setPerson] = useState("none");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova tarefa</DialogTitle>
          <DialogDescription>Você será o responsável. Vincule uma pessoa se quiser.</DialogDescription>
        </DialogHeader>
        <form id="nt" className="grid gap-3" onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return toast.error("Informe o título.");
          onCreate({ title: title.trim(), due_date: due || null, priority: prio, person_id: person === "none" ? null : person });
          setTitle(""); setDue("");
        }}>
          <div className="grid gap-1.5"><Label htmlFor="tt">Título</Label><Input id="tt" value={title} onChange={(e) => setTitle(e.target.value)} className="h-11" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5"><Label htmlFor="td">Prazo</Label><Input id="td" type="date" value={due} onChange={(e) => setDue(e.target.value)} className="h-11" /></div>
            <div className="grid gap-1.5"><Label>Prioridade</Label>
              <Select value={prio} onValueChange={(v) => setPrio(v as Priority)}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="alta">Alta</SelectItem><SelectItem value="media">Média</SelectItem><SelectItem value="baixa">Baixa</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-1.5"><Label>Pessoa</Label>
            <Select value={person} onValueChange={setPerson}>
              <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma</SelectItem>
                {people.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </form>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button type="submit" form="nt" disabled={busy}>Criar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
