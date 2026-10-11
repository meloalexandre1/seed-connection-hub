import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { PageHeader, Panel, EmptyState } from "@/components/app/ui-bits";
import { liveOpportunities, type RealOpportunity } from "@/services/live-features";
import { FACTORS, recommend } from "@/lib/opportunity";
import type { FactorKey, Recommendation } from "@/types/domain";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/oportunidades")({
  head: () => pageHead("Oportunidades", "Avaliação real de oportunidades."),
  component: OppPage,
});
const blank = (): RealOpportunity => ({
  id: "", title: "", need: "", resources: "", thirdParty: "",
  personIds: [], status: "aberta", recommendation: null, decision: null, reviewAt: null,
  scores: { retorno: 3, urgencia: 3, esforco: 3, complexidade: 3, custo_oportunidade: 3, capacidade: 3, conectar: 3 },
});
const TONE: Record<Recommendation,string> = {
  RESOLVER:"bg-primary text-primary-foreground", CONECTAR:"bg-info text-primary-foreground",
  ADIAR:"bg-warning text-primary-foreground", ENCERRAR:"bg-surface-2 text-foreground",
};
function OppPage() {
  const qc=useQueryClient();
  const q=useQuery({queryKey:["opportunities-real"],queryFn:liveOpportunities.list});
  const save=useMutation({mutationFn:liveOpportunities.save,onSuccess:()=>{qc.invalidateQueries({queryKey:["opportunities-real"]});setEdit(null);toast.success("Oportunidade salva no banco.");},onError:(e:Error)=>toast.error(e.message)});
  const remove=useMutation({mutationFn:liveOpportunities.remove,onSuccess:()=>{qc.invalidateQueries({queryKey:["opportunities-real"]});setEdit(null);toast.success("Oportunidade removida.");},onError:(e:Error)=>toast.error(e.message)});
  const [edit,setEdit]=useState<RealOpportunity|null>(null);
  return <div className="mx-auto max-w-5xl">
    <PageHeader eyebrow="Inteligência" title="Oportunidades" actions={<Button onClick={()=>setEdit(blank())}><Plus className="h-4 w-4"/> Nova avaliação</Button>}>Avalie necessidades e registre decisões com segurança.</PageHeader>
    {q.isLoading&&<p className="p-4 text-muted-foreground">Carregando registros reais...</p>}
    {q.isError&&<p role="alert" className="p-4 text-destructive">Erro ao consultar: {(q.error as Error).message}</p>}
    {q.data?.length===0&&<EmptyState title="Nenhuma oportunidade registrada" text="Crie sua primeira avaliação. Os dados serão salvos no banco."/>}
    <ul className="grid gap-3 md:grid-cols-2">
      {(q.data??[]).map(o=><li key={o.id}><button className="w-full rounded-2xl border bg-card p-4 text-left hover:border-primary" onClick={()=>setEdit(o)}>
        <div className="flex justify-between gap-2"><b>{o.title}</b><span className={`rounded-md px-2 py-1 text-xs ${TONE[recommend(o.scores).decision]}`}>{o.decision||recommend(o.scores).decision}</span></div>
        <p className="mt-2 text-sm text-muted-foreground">Necessidade: {o.need||"Não informada"}</p>
        <p className="text-sm text-muted-foreground">Possível parceiro: {o.thirdParty||"—"}</p>
      </button></li>)}
    </ul>
    <Sheet open={!!edit} onOpenChange={v=>!v&&setEdit(null)}><SheetContent className="w-full overflow-y-auto sm:max-w-lg">{edit&&<Evaluator key={edit.id||"new"} value={edit} saving={save.isPending} onSave={v=>save.mutate(v)} onDelete={edit.id?()=>{if(window.confirm("Remover esta oportunidade?")) remove.mutate(edit.id);}:undefined}/>}</SheetContent></Sheet>
  </div>;
}
function Evaluator({value,onSave,onDelete,saving}:{value:RealOpportunity;onSave:(x:RealOpportunity)=>void;onDelete?:()=>void;saving:boolean}) {
  const [v,setV]=useState(value); const decision=recommend(v.scores);
  return <><SheetHeader><SheetTitle>{value.id?"Editar oportunidade":"Nova oportunidade"}</SheetTitle><SheetDescription>Recomendação automática não é decisão humana.</SheetDescription></SheetHeader>
    <div className="grid gap-3 px-4 pb-6">
      {([["title","Título"],["need","Necessidade"],["resources","Recursos disponíveis"],["thirdParty","Terceiros capazes de ajudar"]] as const).map(([key,label])=><div key={key}><Label htmlFor={key}>{label}</Label><Input id={key} value={v[key]} onChange={e=>setV({...v,[key]:e.target.value})}/></div>)}
      {FACTORS.map(f=><div key={f.key}><div className="flex justify-between text-sm"><span>{f.label}</span><b>{v.scores[f.key]}</b></div><Slider min={1} max={5} step={1} value={[v.scores[f.key]]} onValueChange={([n])=>setV(o=>({...o,scores:{...o.scores,[f.key]:n??3}}))}/><p className="text-xs text-muted-foreground">{f.hint}</p></div>)}
      <Panel title="Sugestão explicável"><p className="font-bold text-primary">{decision.decision}</p>{decision.reasons.map((reason,i)=><p key={i} className="text-sm">{reason}</p>)}</Panel>
      <div><Label>Decisão humana</Label><select aria-label="Decisão humana" className="w-full rounded-lg border bg-background p-3" value={v.decision??""} onChange={e=>setV({...v,decision:(e.target.value||null) as Recommendation|null,status:e.target.value?"decidida":"em_decisao"})}><option value="">Ainda sem decisão</option>{(["RESOLVER","CONECTAR","ADIAR","ENCERRAR"] as const).map(x=><option key={x} value={x}>{x}</option>)}</select></div>
      <Button disabled={saving||!v.title.trim()} onClick={()=>onSave(v)}>{saving?"Salvando...":"Salvar no banco"}</Button>
      {onDelete&&<Button variant="destructive" disabled={saving} onClick={onDelete}><Trash2 className="h-4 w-4"/> Excluir</Button>}
    </div></>;
}