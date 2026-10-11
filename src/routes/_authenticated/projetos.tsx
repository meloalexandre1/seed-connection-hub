import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery,useMutation,useQueryClient } from "@tanstack/react-query";
import { Plus,AlertTriangle,Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet,SheetContent,SheetHeader,SheetTitle } from "@/components/ui/sheet";
import { PageHeader,EmptyState } from "@/components/app/ui-bits";
import { liveProjects,type RealProject } from "@/services/live-features";
import { pageHead } from "@/lib/seo";
export const Route=createFileRoute("/_authenticated/projetos")({head:()=>pageHead("Projetos","Gestão real dos projetos"),component:ProjectsPage});
const empty=():RealProject=>({id:"",name:"",goal:"",status:"ativo",progress:0,owner:"",visibility:"equipe"});
function ProjectsPage(){
 const qc=useQueryClient();
 const q=useQuery({queryKey:["projects-real"],queryFn:liveProjects.list});
 const [f,setF]=useState("todos"),[edit,setEdit]=useState<RealProject|null>(null);
 const save=useMutation({mutationFn:liveProjects.save,onSuccess:()=>{qc.invalidateQueries({queryKey:["projects-real"]});setEdit(null);toast.success("Projeto salvo.");},onError:(e:Error)=>toast.error(e.message)});
 const remove=useMutation({mutationFn:liveProjects.remove,onSuccess:()=>{qc.invalidateQueries({queryKey:["projects-real"]});setEdit(null);toast.success("Projeto removido.");},onError:(e:Error)=>toast.error(e.message)});
 const shown=(q.data??[]).filter(p=>f==="todos"||p.status===f);
 return <div className="mx-auto max-w-5xl"><PageHeader eyebrow="Execução" title="Projetos" actions={<Button onClick={()=>setEdit(empty())}><Plus className="h-4 w-4"/> Novo projeto</Button>}>Projetos e resultados, salvos no banco.</PageHeader>
  <div className="mb-4 flex gap-2 overflow-x-auto">{[["todos","Todos"],["ativo","Ativos"],["pausado","Pausados"],["concluido","Concluídos"]].map(([k,l])=><Button key={k} variant={f===k?"default":"secondary"} onClick={()=>setF(k)}>{l}</Button>)}</div>
  {q.isLoading&&<p>Carregando projetos reais...</p>}{q.isError&&<p role="alert" className="text-destructive">{(q.error as Error).message}</p>}
  {!q.isLoading&&shown.length===0&&<EmptyState title="Nenhum projeto" text="Crie o primeiro projeto para acompanhar a execução."/>}
  <ul className="grid gap-3 md:grid-cols-2">{shown.map(p=><li key={p.id}><button onClick={()=>setEdit(p)} className="w-full rounded-2xl border bg-card p-4 text-left hover:border-primary"><b>{p.name}</b><p className="mt-1 text-sm text-muted-foreground">{p.goal}</p><div className="mt-3 h-2 rounded-full bg-surface-2"><div className="h-full rounded-full bg-primary" style={{width:`${p.progress}%`}}/></div><p className="mt-1 text-xs">{p.progress}% · {p.status}</p>{p.risk&&<p className="mt-2 flex items-center gap-1 text-xs text-warning"><AlertTriangle className="h-4 w-4"/>{p.risk}</p>}</button></li>)}</ul>
  <Sheet open={!!edit} onOpenChange={v=>!v&&setEdit(null)}><SheetContent className="w-full overflow-y-auto sm:max-w-lg">{edit&&<Edit key={edit.id||"new"} initial={edit} busy={save.isPending} onSave={p=>save.mutate(p)} onDelete={edit.id?()=>{if(window.confirm("Remover este projeto?"))remove.mutate(edit.id);}:undefined}/>}</SheetContent></Sheet>
 </div>;
}
function Edit({initial,busy,onSave,onDelete}:{initial:RealProject;busy:boolean;onSave:(p:RealProject)=>void;onDelete?:()=>void}){
 const [p,setP]=useState(initial);
 return <><SheetHeader><SheetTitle>{initial.id?"Editar projeto":"Novo projeto"}</SheetTitle></SheetHeader><div className="grid gap-3 px-4 pb-8">
 <div><Label>Nome</Label><Input value={p.name} onChange={e=>setP({...p,name:e.target.value})}/></div>
 <div><Label>Objetivo</Label><Textarea value={p.goal} onChange={e=>setP({...p,goal:e.target.value})}/></div>
 <div><Label>Status</Label><select className="w-full rounded-lg border bg-background p-3" value={p.status} onChange={e=>setP({...p,status:e.target.value as RealProject["status"]})}>{["ativo","pausado","concluido"].map(x=><option key={x} value={x}>{x}</option>)}</select></div>
 <div><Label>Progresso: {p.progress}%</Label><input type="range" className="w-full" min="0" max="100" step="5" value={p.progress} onChange={e=>setP({...p,progress:Number(e.target.value)})}/></div>
 <div><Label>Riscos</Label><Textarea value={p.risk??""} onChange={e=>setP({...p,risk:e.target.value})}/></div>
 <div><Label>Visibilidade</Label><select className="w-full rounded-lg border bg-background p-3" value={p.visibility} onChange={e=>setP({...p,visibility:e.target.value as RealProject["visibility"]})}><option value="equipe">Equipe</option><option value="privado">Privado</option></select></div>
 <Button disabled={busy||!p.name.trim()} onClick={()=>onSave(p)}>{busy?"Salvando...":"Salvar no banco"}</Button>
 {onDelete&&<Button variant="destructive" onClick={onDelete}><Trash2 className="h-4 w-4"/> Excluir</Button>}
 </div></>;
}