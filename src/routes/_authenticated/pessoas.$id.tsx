import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Panel, LevelBadge, PriorityBadge, Avatar, EmptyState } from "@/components/app/ui-bits";
import { PersonFormDialog } from "@/components/app/PersonFormDialog";
import { livePeople, liveInteractions, fmtDate } from "@/services/live";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/pessoas/$id")({
  head: () => pageHead("Perfil", "Perfil completo de relacionamento."),
  component: PersonPage,
});

const KINDS: Record<string, string> = { reuniao: "Reunião", ligacao: "Ligação", mensagem: "Mensagem", nota: "Nota" };

function PersonPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [edit, setEdit] = useState(false);
  const person = useQuery({ queryKey: ["person", id], queryFn: () => livePeople.get(id) });
  const contacts = useQuery({ queryKey: ["contacts", id], queryFn: () => livePeople.contacts(id), enabled: !!person.data });
  const inter = useQuery({ queryKey: ["interactions", id], queryFn: () => liveInteractions.listByPerson(id), enabled: !!person.data });

  const update = useMutation({
    mutationFn: (v: Parameters<typeof livePeople.update>[1]) => livePeople.update(id, v),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["person", id] });
      qc.invalidateQueries({ queryKey: ["people"] });
      toast.success("Alterações salvas.");
      setEdit(false);
    },
    onError: (e) => toast.error(`Não foi possível salvar: ${e.message}`),
  });

  const [ck, setCk] = useState("whatsapp");
  const [cv, setCv] = useState("");
  const addContact = useMutation({
    mutationFn: () => livePeople.addContact(id, ck, cv),
    onSuccess: () => { setCv(""); qc.invalidateQueries({ queryKey: ["contacts", id] }); },
    onError: (e) => toast.error(e.message),
  });

  const [ik, setIk] = useState("reuniao");
  const [it, setIt] = useState("");
  const [idate, setIdate] = useState(() => new Date().toISOString().slice(0, 10));
  const addInter = useMutation({
    mutationFn: () => liveInteractions.create({ person_id: id, kind: ik, summary: it.trim(), occurred_at: new Date(idate).toISOString() }),
    onSuccess: () => {
      setIt("");
      qc.invalidateQueries({ queryKey: ["interactions", id] });
      qc.invalidateQueries({ queryKey: ["person", id] });
      toast.success("Interação registrada.");
    },
    onError: (e) => toast.error(e.message),
  });

  if (person.isLoading) return <p className="p-6 text-center text-sm text-muted-foreground">Carregando…</p>;
  if (person.isError || !person.data)
    return (
      <EmptyState
        title="Pessoa não encontrada"
        text="Ela pode ter sido removida ou você não tem acesso."
        action={<Button asChild variant="secondary"><Link to="/pessoas">Voltar para Pessoas</Link></Button>}
      />
    );
  const p = person.data;

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <Link to="/pessoas" className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Pessoas
      </Link>
      <div className="flex flex-wrap items-start gap-4">
        <Avatar name={p.name} className="h-14 w-14 text-lg" />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold">{p.name}</h1>
          <p className="text-sm text-muted-foreground">
            {[p.relationship_type, p.role, p.company, p.city].filter(Boolean).join(" · ") || "Sem detalhes"}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <LevelBadge level={p.proximity} />
            <PriorityBadge p={p.priority} />
          </div>
        </div>
        <Button variant="secondary" className="h-11" onClick={() => setEdit(true)}>
          <Pencil className="h-4 w-4" /> Editar
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Contexto">
          <p className="whitespace-pre-wrap text-sm">{p.context || "—"}</p>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <dt className="text-muted-foreground">Próxima ação</dt><dd>{p.next_action || "—"}</dd>
            <dt className="text-muted-foreground">Última interação</dt><dd>{fmtDate(p.last_interaction_at)}</dd>
          </dl>
        </Panel>
        <Panel title="Contatos">
          <ul className="space-y-1 text-sm">
            {(contacts.data ?? []).map((c) => (
              <li key={c.id}><span className="text-muted-foreground">{c.kind}:</span> {c.value_raw}</li>
            ))}
            {contacts.data?.length === 0 && <li className="text-muted-foreground">Nenhum contato.</li>}
          </ul>
          <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (cv.trim()) addContact.mutate(); }}>
            <Select value={ck} onValueChange={setCk}>
              <SelectTrigger className="h-11 w-32" aria-label="Tipo de contato"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="telefone">Telefone</SelectItem>
                <SelectItem value="email">E-mail</SelectItem>
              </SelectContent>
            </Select>
            <Input value={cv} onChange={(e) => setCv(e.target.value)} className="h-11" aria-label="Contato" />
            <Button type="submit" className="h-11" aria-label="Adicionar contato" disabled={addContact.isPending}><Plus className="h-4 w-4" /></Button>
          </form>
        </Panel>
        <Panel title="Dores / necessidades">
          <Chips items={p.needs} />
        </Panel>
        <Panel title="Habilidades / recursos">
          <Chips items={p.skills} />
        </Panel>
      </div>

      <Panel title="Histórico de interações">
        <form className="mb-4 grid gap-2 sm:grid-cols-[140px_150px_1fr_auto]" onSubmit={(e) => { e.preventDefault(); if (it.trim()) addInter.mutate(); }}>
          <Select value={ik} onValueChange={setIk}>
            <SelectTrigger className="h-11" aria-label="Tipo"><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(KINDS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
          </Select>
          <Input type="date" value={idate} onChange={(e) => setIdate(e.target.value)} className="h-11" aria-label="Data" />
          <Textarea value={it} onChange={(e) => setIt(e.target.value)} placeholder="Resumo da interação" className="min-h-11" />
          <Button type="submit" className="h-11" disabled={addInter.isPending}>Registrar</Button>
        </form>
        {(inter.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma interação registrada.</p>
        ) : (
          <ol className="space-y-3 border-l pl-4">
            {inter.data!.map((i) => (
              <li key={i.id}>
                <p className="text-xs text-muted-foreground">{fmtDate(i.occurred_at)} · {KINDS[i.kind ?? ""] ?? i.kind}</p>
                <p className="whitespace-pre-wrap text-sm">{i.summary}</p>
              </li>
            ))}
          </ol>
        )}
      </Panel>

      <PersonFormDialog open={edit} onOpenChange={setEdit} initial={p} busy={update.isPending} onSubmit={(v) => update.mutate(v)} />
    </div>
  );
}

function Chips({ items }: { items: string[] }) {
  if (!items.length) return <p className="text-sm text-muted-foreground">—</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((s) => <span key={s} className="rounded-full border px-2.5 py-1 text-xs">{s}</span>)}
    </div>
  );
}
