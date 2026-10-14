import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BrainCircuit, CheckCircle2, ListChecks, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  analyzeTextCapture,approveCapturePerson,extractCaptureTasks,approveCaptureTask,getCaptureAnalysis,searchExistingCapturePeople,
} from "@/lib/captureIntelligence.functions";

type Proposal=Awaited<ReturnType<typeof getCaptureAnalysis>>["people"][number];
function ReviewPerson({item,captureId,onApproved}:{
  item:Proposal;captureId:string;onApproved:()=>void;
}) {
  const [selected,setSelected]=useState(item.matches.length===1?item.matches[0]!.id:"");
  const [searchText,setSearchText]=useState("");
  const [searchedText,setSearchedText]=useState("");
  const results=useQuery({
    queryKey:["candidate-person-search",captureId,item.index,searchedText],
    queryFn:()=>searchExistingCapturePeople({data:{
      captureId,personIndex:item.index,query:searchedText,
    }}),
    enabled:searchedText.length>=2 && !item.approvedPersonId,
    retry:false,
  });
  const options=[
    ...item.matches.map(m=>({id:m.id,name:m.name,detail:"coincidência por "+m.method})),
    ...(results.data??[]).map(p=>({id:p.id,name:p.name,detail:[p.role,p.company].filter(Boolean).join(" · ")})),
  ].filter((person,index,arr)=>arr.findIndex(p=>p.id===person.id)===index);
  const apply=useMutation({
    mutationFn:()=>approveCapturePerson({data:{
      captureId,personIndex:item.index,
      personId:selected||null,
    }}),
    onSuccess:()=>{toast.success("Pessoa e fatos atualizados com origem registrada.");onApproved();},
    onError:(err:Error)=>toast.error(err.message),
  });
  const person=item.person;
  return <div className="space-y-2 rounded-lg border bg-card p-3">
    <p className="text-sm font-semibold">{person.name}</p>
    {(person.organization||person.role)&&<p className="text-xs text-muted-foreground">
      {[person.role,person.organization].filter(Boolean).join(" · ")}
    </p>}
    {person.email&&<p className="text-xs text-muted-foreground">E-mail citado: {person.email}</p>}
    {person.phone&&<p className="text-xs text-muted-foreground">Telefone citado: {person.phone}</p>}
    <div className="space-y-2">
      {person.facts.length ? person.facts.map((fact,i)=><div key={i} className="rounded-md bg-muted/40 p-2">
        <p className="text-xs font-semibold">{fact.kind}: {fact.text}</p>
        <p className="mt-1 text-xs text-muted-foreground">Trecho da fonte: “{fact.evidence}”</p>
      </div>):<p className="text-xs text-muted-foreground">Não há fatos com evidência literal validada no documento.</p>}
    </div>
    {item.approvedPersonId ? <p className="flex items-center gap-2 text-xs text-success">
      <CheckCircle2 className="h-4 w-4"/> Revisado e vinculado à ficha.
    </p> : <>
      <div className="space-y-2">
        <p className="text-xs font-medium">Verificar se a pessoa já existe no CRM</p>
        <div className="flex gap-2">
          <Input aria-label="Buscar contato existente" value={searchText}
            placeholder="Pesquisar outro nome no CRM" maxLength={80}
            onChange={e=>setSearchText(e.target.value)}/>
          <Button size="sm" variant="outline" disabled={searchText.trim().length<2||results.isFetching}
            onClick={()=>setSearchedText(searchText.trim())}>Buscar</Button>
        </div>
        {results.isError&&<p role="alert" className="text-xs text-destructive">{results.error.message}</p>}
        {options.length>0&&<label className="block text-xs">
          Selecione a ficha que você reconhece:
          <select className="mt-1 w-full rounded-md border bg-background p-2" value={selected}
            onChange={e=>setSelected(e.target.value)}>
            <option value="">Ainda não identifiquei esta pessoa</option>
            {options.map(m=><option key={m.id} value={m.id}>{m.name} ({m.detail})</option>)}
          </select>
        </label>}
      </div>
      <Button size="sm" variant={selected?"default":"secondary"}
        disabled={apply.isPending||(item.matches.length>0&&!selected)}
        onClick={()=>{
          if(!selected&&!window.confirm("Você verificou se essa pessoa já existe? Criar ficha nova pode causar duplicidade."))return;
          apply.mutate();
        }}>
        {apply.isPending&&<Loader2 className="h-4 w-4 animate-spin"/>}
        {selected?"Confirmar vínculo e registrar fatos":"Criar nova pessoa e registrar fatos"}
      </Button>
      {!options.length&&<p className="text-xs text-muted-foreground">
        Sem correspondência exata. Pesquise também por outros nomes conhecidos antes de criar uma ficha.
      </p>}
    </>}
  </div>;
}

type TaskProposal=Awaited<ReturnType<typeof getCaptureAnalysis>>["tasks"][number];
function ReviewTask({item,captureId,people,onDone}:{
  item:TaskProposal;captureId:string;people:{id:string;name:string}[];onDone:()=>void;
}) {
  const t=item.task;
  const guess=people.find(p=>t.person_name&&p.name.toLowerCase().includes(t.person_name.toLowerCase()));
  const [title,setTitle]=useState(t.title);
  const [due,setDue]=useState(t.due_date??"");
  const [personId,setPersonId]=useState(guess?.id??"");
  const create=useMutation({
    mutationFn:()=>approveCaptureTask({data:{captureId,taskIndex:item.index,title:title.trim(),
      dueDate:due||null,personId:personId||null}}),
    onSuccess:()=>{toast.success("Tarefa criada em Tarefas.");onDone();},
    onError:(e:Error)=>toast.error(e.message),
  });
  return <div className="space-y-2 rounded-lg border bg-card p-3">
    <span className={"inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold "+(t.responsible==="cliente"?"bg-muted text-foreground":"bg-primary/15 text-primary")}>
      {t.responsible==="cliente"?"Com o cliente":"Nossa equipe"}{t.person_name?` · ${t.person_name}`:""}
    </span>
    <p className="text-xs text-muted-foreground">Trecho da fonte: “{t.evidence}”</p>
    {item.createdTaskId ? <p className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-success"/>{t.title} — criada.</p> : <>
      <Input aria-label="Título da tarefa" value={title} maxLength={200} onChange={e=>setTitle(e.target.value)}/>
      <div className="grid gap-2 sm:grid-cols-2">
        <Input aria-label="Prazo" type="date" value={due} onChange={e=>setDue(e.target.value)}/>
        <select aria-label="Pessoa vinculada" className="rounded-md border bg-background p-2 text-sm" value={personId} onChange={e=>setPersonId(e.target.value)}>
          <option value="">Sem pessoa vinculada</option>
          {people.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <Button size="sm" disabled={create.isPending||title.trim().length<4} onClick={()=>create.mutate()}>
        {create.isPending&&<Loader2 className="h-4 w-4 animate-spin"/>}
        {t.responsible==="cliente"?"Criar tarefa (aguardando cliente)":"Criar tarefa"}
      </Button>
    </>}
  </div>;
}

/** Review UI is intentionally opt-in: AI output is never treated as identity proof. */
export function CaptureAnalysisPanel({captureId}:{captureId:string}) {
  const [expanded,setExpanded]=useState(false);
  const qc=useQueryClient();
  const key=["capture-analysis",captureId];
  const details=useQuery({
    queryKey:key,queryFn:()=>getCaptureAnalysis({data:{captureId}}),
    enabled:expanded,retry:false,
  });
  const analyze=useMutation({
    mutationFn:()=>analyzeTextCapture({data:{captureId}}),
    onSuccess:async()=>{
      await qc.invalidateQueries({queryKey:key});
      toast.success("Reunião analisada. Revise as pessoas e evidências antes de atualizar o CRM.");
    },
    onError:(err:Error)=>toast.error(err.message),
  });
  const tasksMut=useMutation({
    mutationFn:()=>extractCaptureTasks({data:{captureId}}),
    onSuccess:async()=>{await qc.invalidateQueries({queryKey:key});},
    onError:(err:Error)=>toast.error(err.message),
  });
  return <div className="space-y-2">
    <Button size="sm" variant="outline" onClick={()=>setExpanded(v=>!v)}>
      <BrainCircuit className="h-4 w-4"/> {expanded?"Fechar análise do SID":"Analisar pessoas e fatos com SID"}
    </Button>
    {expanded&&<div className="space-y-3 rounded-lg border p-3">
      {details.isFetching&&<p className="text-xs text-muted-foreground">Consultando a análise...</p>}
      {details.isError&&<p role="alert" className="text-xs text-destructive">{details.error.message}</p>}
      {!details.isFetching&&!details.data?.analysis&&<div className="space-y-2">
        <p className="text-xs text-muted-foreground">
          O SID vai interpretar este texto pela IA configurada no servidor.
          Isso pode consumir a cota do seu provedor. Se a IA estiver sem acesso, a captura continuará salva.
        </p>
        <Button size="sm" disabled={analyze.isPending} onClick={()=>analyze.mutate()}>
          {analyze.isPending&&<Loader2 className="h-4 w-4 animate-spin"/>}
          Iniciar análise desta reunião
        </Button>
      </div>}
      {details.data?.analysis&&<>
        <div className="flex gap-2 text-xs font-semibold"><ShieldCheck className="h-4 w-4 text-primary"/>
          Análise aguardando validação humana
        </div>
        <p className="whitespace-pre-wrap text-sm">{details.data.analysis.summary}</p>
        {!details.data.people.length&&<p className="text-xs text-muted-foreground">
          Nenhuma pessoa identificada com segurança no texto; nada será criado automaticamente.
        </p>}
        {details.data.people.map(item=><ReviewPerson
          key={item.index} item={item} captureId={captureId}
          onApproved={()=>void qc.invalidateQueries({queryKey:key})}
        />)}
        <div className="space-y-2 border-t pt-3">
          <p className="flex items-center gap-2 text-sm font-semibold"><ListChecks className="h-4 w-4 text-primary"/>Tarefas combinadas na reunião</p>
          {!details.data.analysis.tasksExtracted ? <>
            <p className="text-xs text-muted-foreground">O SID procura próximos passos da nossa equipe e do cliente. Nada é criado sem a sua confirmação.</p>
            <Button size="sm" variant="outline" disabled={tasksMut.isPending} onClick={()=>tasksMut.mutate()}>
              {tasksMut.isPending&&<Loader2 className="h-4 w-4 animate-spin"/>}Identificar tarefas
            </Button>
          </> : !details.data.tasks.length ? <p className="text-xs text-muted-foreground">Nenhuma tarefa com evidência clara foi encontrada no texto.</p>
          : details.data.tasks.map(item=><ReviewTask key={item.index} item={item} captureId={captureId}
              people={details.data!.people.filter(p=>p.approvedPersonId).map(p=>({id:p.approvedPersonId!,name:p.person.name}))}
              onDone={()=>{void qc.invalidateQueries({queryKey:key});void qc.invalidateQueries({queryKey:["tasks"]});}}/>)}
        </div>
      </>}
    </div>}
  </div>;
}
