import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PROXIMITY } from "@/services";
import type { PersonInsert, PersonRow } from "@/services/live";
import type { Priority, Proximity } from "@/types/domain";

type Values = Omit<PersonInsert, "owner_id">;
const split = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

export function PersonFormDialog({
  open,
  onOpenChange,
  onSubmit,
  busy,
  initial,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (v: Values, contacts: { kind: string; value: string }[]) => void;
  busy?: boolean;
  initial?: PersonRow;
}) {
  const [f, setF] = useState({
    name: "", relationship_type: "", company: "", role: "", city: "", phone: "", email: "",
    context: "", needs: "", skills: "", next_action: "",
    proximity: "multidao" as Proximity, priority: "media" as Priority,
  });
  useEffect(() => {
    if (open)
      setF({
        name: initial?.name ?? "", relationship_type: initial?.relationship_type ?? "",
        company: initial?.company ?? "", role: initial?.role ?? "", city: initial?.city ?? "",
        phone: "", email: "", context: initial?.context ?? "",
        needs: initial?.needs.join(", ") ?? "", skills: initial?.skills.join(", ") ?? "",
        next_action: initial?.next_action ?? "",
        proximity: initial?.proximity ?? "multidao", priority: initial?.priority ?? "media",
      });
  }, [open, initial]);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const field = (k: keyof typeof f, label: string, type = "text") => (
    <div className="grid gap-1.5">
      <Label htmlFor={`pf-${k}`}>{label}</Label>
      <Input id={`pf-${k}`} type={type} value={f[k]} onChange={set(k)} className="h-11" />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar pessoa" : "Nova pessoa"}</DialogTitle>
          <DialogDescription>Só o nome é obrigatório. O resto pode ser enriquecido depois.</DialogDescription>
        </DialogHeader>
        <form
          id="pf"
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!f.name.trim()) { toast.error("Informe o nome."); return; }
            onSubmit(
              {
                name: f.name.trim(),
                relationship_type: f.relationship_type || null,
                company: f.company || null,
                role: f.role || null,
                city: f.city || null,
                context: f.context || null,
                needs: split(f.needs),
                skills: split(f.skills),
                next_action: f.next_action || null,
                proximity: f.proximity,
                priority: f.priority,
              },
              [
                { kind: "whatsapp", value: f.phone },
                { kind: "email", value: f.email },
              ],
            );
          }}
        >
          {field("name", "Nome")}
          {field("relationship_type", "Tipo de relacionamento (ex.: cliente, parceiro, mentor)")}
          <div className="grid grid-cols-2 gap-3">
            {field("company", "Empresa")}
            {field("role", "Cargo")}
          </div>
          {field("city", "Cidade")}
          {!initial && (
            <div className="grid grid-cols-2 gap-3">
              {field("phone", "WhatsApp/telefone", "tel")}
              {field("email", "E-mail", "email")}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Proximidade</Label>
              <Select value={f.proximity} onValueChange={(v) => setF({ ...f, proximity: v as Proximity })}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROXIMITY.map((p) => <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Prioridade estratégica</Label>
              <Select value={f.priority} onValueChange={(v) => setF({ ...f, priority: v as Priority })}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="baixa">Baixa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="pf-context">Contexto / resumo</Label>
            <Textarea id="pf-context" value={f.context} onChange={set("context")} />
          </div>
          {field("needs", "Dores/necessidades (separe por vírgula)")}
          {field("skills", "Habilidades/recursos (separe por vírgula)")}
          {field("next_action", "Próxima ação")}
        </form>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button type="submit" form="pf" disabled={busy}>{busy ? "Salvando…" : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
