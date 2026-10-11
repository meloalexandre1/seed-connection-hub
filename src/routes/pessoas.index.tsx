import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Upload, Plus, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PageHeader,
  LevelBadge,
  PriorityBadge,
  Avatar,
  EmptyState,
  DemoNotice,
} from "@/components/app/ui-bits";
import { PROXIMITY, peopleService } from "@/services";
import type { Person, Priority, Proximity } from "@/types/domain";
import { cn } from "@/lib/utils";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/pessoas/")({
  head: () => pageHead("Pessoas", "CRM de relacionamentos: busque, filtre e abra perfis."),
  component: PeoplePage,
});

function PeoplePage() {
  const [q, setQ] = useState("");
  const [level, setLevel] = useState<Proximity | "todos">("todos");
  const [prio, setPrio] = useState<Priority | "todas">("todas");
  const [extra, setExtra] = useState<Person[]>([]);
  const [open, setOpen] = useState(false);

  const people = useMemo(() => {
    const s = q.toLowerCase();
    return [...peopleService.list(), ...extra].filter(
      (p) =>
        (level === "todos" || p.proximity === level) &&
        (prio === "todas" || p.priority === prio) &&
        (!s ||
          [p.name, p.company, p.city, ...p.skills, ...p.needs].join(" ").toLowerCase().includes(s)),
    );
  }, [q, level, prio, extra]);

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
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome, empresa, cidade, habilidade ou dor"
            aria-label="Buscar pessoas"
            className="h-11 pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
            role="group"
            aria-label="Filtrar por proximidade"
          >
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
          <span className="ml-auto text-xs text-muted-foreground">
            {people.length} registro(s) fictício(s)
          </span>
        </div>
      </div>

      <div className="mt-4">
        {people.length === 0 ? (
          <EmptyState
            title="Nenhuma pessoa encontrada"
            text="Ajuste a busca ou os filtros."
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  setQ("");
                  setLevel("todos");
                  setPrio("todas");
                }}
              >
                Limpar filtros
              </Button>
            }
          />
        ) : (
          <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
            {people.map((p) => (
              <li key={p.id}>
                <Link
                  to="/pessoas/$id"
                  params={{ id: p.id }}
                  className="flex items-center gap-3 p-3 hover:bg-secondary sm:p-4"
                >
                  <Avatar name={p.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{p.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {p.role} · {p.company} · {p.city}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <LevelBadge level={p.proximity} />
                      <PriorityBadge p={p.priority} />
                    </div>
                  </div>
                  <div className="hidden w-32 text-right text-xs text-muted-foreground md:block">
                    Última interação
                    <br />
                    <b className="text-foreground">{p.lastInteraction}</b>
                  </div>
                  <div
                    className="hidden w-28 md:block"
                    aria-label={`Completude ${p.completeness}%`}
                  >
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                      <div className="h-full bg-primary" style={{ width: `${p.completeness}%` }} />
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {p.completeness}% completo
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-subtle" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <NewPersonDialog
        open={open}
        onOpenChange={setOpen}
        onCreate={(p) => setExtra((x) => [...x, p])}
      />
    </div>
  );
}

function NewPersonDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreate: (p: Person) => void;
}) {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [company, setCompany] = useState("");
  const [level, setLevel] = useState<Proximity>("multidao");
  const [prio, setPrio] = useState<Priority>("media");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova pessoa</DialogTitle>
          <DialogDescription>
            Cadastro mínimo: nome ou contato. Pode ser enriquecido depois.
          </DialogDescription>
        </DialogHeader>
        <form
          id="np"
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim() && !contact.trim()) {
              toast.error("Informe ao menos nome ou contato.");
              return;
            }
            onCreate({
              id: `tmp-${Date.now()}`,
              name: name || contact,
              aliases: [],
              city: "—",
              company: company || "—",
              role: "—",
              sphere: "—",
              proximity: level,
              priority: prio,
              phones: contact ? [contact] : [],
              emails: [],
              needs: [],
              skills: [],
              connections: [],
              history: [],
              followups: [],
              lastInteraction: "—",
              completeness: 10,
              visibility: "privado",
            });
            toast.warning("Demonstração: adicionado só nesta tela. Nada foi salvo.");
            setName("");
            setContact("");
            setCompany("");
            onOpenChange(false);
          }}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="n">Nome</Label>
            <Input id="n" value={name} onChange={(e) => setName(e.target.value)} className="h-11" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="c">Telefone ou e-mail</Label>
            <Input
              id="c"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              className="h-11"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="e">Empresa</Label>
            <Input
              id="e"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="h-11"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Proximidade</Label>
              <Select value={level} onValueChange={(v) => setLevel(v as Proximity)}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROXIMITY.map((p) => (
                    <SelectItem key={p.key} value={p.key}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Prioridade estratégica</Label>
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
          </div>
          <DemoNotice>
            Sem backend conectado, o cadastro existe só enquanto esta tela estiver aberta.
          </DemoNotice>
        </form>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="np">
            Adicionar (demo)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
