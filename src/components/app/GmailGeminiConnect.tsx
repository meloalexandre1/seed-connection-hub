import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, Loader2, Inbox, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { liveCaptures } from "@/services/live";
import {
  gmailGeminiStatus, beginGmailGeminiConnect, finishGmailGeminiConnect,
  disconnectGmailGemini, searchGmailMeetingSummaries,
  importGmailMeetingSummary,
} from "@/lib/gmailGemini.functions";

function waitForGmailPopup(popup: Window): Promise<{code:string;state:string}> {
  return new Promise((resolve,reject)=>{
    let done=false;
    const cleanup=()=>{
      window.removeEventListener("message",onMessage);
      clearInterval(interval);
      clearTimeout(timeout);
    };
    const onMessage=(event:MessageEvent)=>{
      if(event.origin!==location.origin || event.source!==popup || event.data?.type!=="seedGmailOAuth")return;
      done=true;cleanup();
      if(event.data.error || !event.data.code || !event.data.state)
        reject(new Error("Google Gmail não autorizou o acesso. Confira permissões e usuário de teste."));
      else resolve({code:event.data.code,state:event.data.state});
    };
    const interval=window.setInterval(()=>{
      if(!done && popup.closed){cleanup();reject(new Error("A janela do Google Gmail foi fechada."));}
    },500);
    const timeout=window.setTimeout(()=>{cleanup();reject(new Error("A autorização Gmail expirou. Tente novamente."));},120000);
    window.addEventListener("message",onMessage);
  });
}
export function GmailGeminiConnect() {
  const qc=useQueryClient();
  const status=useQuery({queryKey:["gmail-gemini-status"],queryFn:()=>gmailGeminiStatus()});
  const [busy,setBusy]=useState(false);
  const [query,setQuery]=useState('("Gemini" OR "notas da reunião" OR "meeting notes")');
  const [searched,setSearched]=useState(false);
  const [subject,setSubject]=useState("");
  const [body,setBody]=useState("");
  const [showManual,setShowManual]=useState(false);
  const messages=useQuery({
    queryKey:["gmail-meeting-search",query],
    queryFn:()=>searchGmailMeetingSummaries({data:{search:query}}),
    enabled:searched && !!status.data?.connected,
    retry:false,
  });
  const importing=useMutation({
    mutationFn:(id:string)=>importGmailMeetingSummary({data:{id}}),
    onSuccess:result=>{
      toast.success(result.alreadyImported?"Este resumo já estava salvo.":"Resumo importado como captura privada; aguardando revisão.");
      void qc.invalidateQueries({queryKey:["gmail-meeting-search"]});
    },
    onError:(e:Error)=>toast.error(e.message),
  });
  async function connect(){
    const popup=window.open("","seed-gmail","width=620,height=760");
    if(!popup){toast.error("Permita pop-ups para autorizar o Gmail.");return;}
    setBusy(true);
    try{
      const {authorizationUrl}=await beginGmailGeminiConnect();
      const wait=waitForGmailPopup(popup);
      popup.location.href=authorizationUrl;
      const result=await wait;
      await finishGmailGeminiConnect({data:result});
      await qc.invalidateQueries({queryKey:["gmail-gemini-status"]});
      toast.success("Gmail autorizado somente para leitura.");
    }catch(e){popup.close();toast.error(e instanceof Error?e.message:"Não foi possível autorizar o Gmail.");}
    finally{setBusy(false);}
  }
  async function disconnect(){
    if(!window.confirm("Desconectar Gmail? Os resumos já importados continuarão no Seed Connection."))return;
    setBusy(true);
    try{await disconnectGmailGemini();setSearched(false);await qc.invalidateQueries({queryKey:["gmail-gemini-status"]});toast.success("Conta Gmail desconectada do aplicativo.");}
    catch(e){toast.error(e instanceof Error?e.message:"Falha ao desconectar Gmail.");}
    finally{setBusy(false);}
  }
  async function saveManual(){
    if(!subject.trim() || body.trim().length < 20){toast.warning("Informe um título e pelo menos 20 caracteres do resumo.");return;}
    setBusy(true);
    try{
      await liveCaptures.createNote("Origem: Gemini (colado manualmente)\n\n"+body.trim(),subject.trim().slice(0,160));
      setBody("");setSubject("");setShowManual(false);
      toast.success("Resumo salvo no Supabase como captura privada para revisão.");
    }catch(e){toast.error(e instanceof Error?e.message:"Falha ao salvar o resumo.");}
    finally{setBusy(false);}
  }
  return <li className="rounded-xl border p-3 space-y-3">
    <div className="flex gap-3">
      <Mail className="h-5 w-5 shrink-0 text-primary"/>
      <div className="flex-1">
        <p className="text-sm font-semibold">Gmail / Gemini — resumos de reuniões</p>
        <p className="text-xs text-muted-foreground">
          {status.isLoading?"Conferindo ligação...":
            status.data?.connected?"Gmail conectado · leitura somente · importação sempre manual":
            status.data?.configured?"Aguardando autorização da sua conta Gmail":
            "Aguardando a configuração das credenciais Google para Gmail"}
        </p>
        <p className="text-xs text-muted-foreground">Cada resumo escolhido vira uma captura privada no Supabase, sem ações automáticas da IA.</p>
      </div>
    </div>
    <div className="flex flex-wrap gap-2">
      {status.data?.configured && !status.data.connected &&
        <Button size="sm" disabled={busy} onClick={()=>void connect()}>{busy&&<Loader2 className="h-4 w-4 animate-spin"/>} Conectar Gmail</Button>}
      {status.data?.connected &&
        <Button variant="outline" size="sm" disabled={busy} onClick={()=>void disconnect()}>Desconectar</Button>}
      <Button size="sm" variant="secondary" onClick={()=>setShowManual(v=>!v)}>
        {showManual?"Fechar importação manual":"Colar resumo do Gemini"}
      </Button>
      <Button size="sm" variant="outline" asChild><a href="https://mail.google.com/" target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4"/> Abrir Gmail</a></Button>
    </div>
    {showManual&&<div className="rounded-xl border bg-card p-3 space-y-2">
      <Label htmlFor="gemini-subject">Título da reunião</Label>
      <Input id="gemini-subject" value={subject} maxLength={160} placeholder="Ex.: Reunião com parceiro" onChange={e=>setSubject(e.target.value)}/>
      <Label htmlFor="gemini-body">Resumo recebido do Gemini</Label>
      <Textarea id="gemini-body" rows={5} value={body} maxLength={45000} placeholder="Cole aqui o conteúdo do e-mail ou do documento de reunião..." onChange={e=>setBody(e.target.value)}/>
      <Button size="sm" disabled={busy || !subject.trim() || body.trim().length<20} onClick={()=>void saveManual()}>Salvar como captura privada</Button>
    </div>}
    {status.data?.connected&&<div className="space-y-2 rounded-xl border p-3">
      <p className="flex gap-2 items-center text-sm font-semibold"><Inbox className="h-4 w-4"/> Localizar e importar reuniões</p>
      <Label htmlFor="gmail-search">Pesquisa Gmail (últimos 180 dias)</Label>
      <div className="flex gap-2">
        <Input id="gmail-search" value={query} maxLength={120} onChange={e=>{setQuery(e.target.value);setSearched(false)}}/>
        <Button size="sm" onClick={()=>{if(searched) void messages.refetch();else setSearched(true)}}>Buscar</Button>
      </div>
      {messages.isFetching&&<p className="text-xs text-muted-foreground">Consultando os e-mails...</p>}
      {messages.isError&&<p role="alert" className="text-xs text-destructive">{(messages.error as Error).message}</p>}
      {searched&&messages.data?.messages.length===0&&<p className="text-xs text-muted-foreground">Nenhum e-mail encontrado. Experimente outro assunto ou nome.</p>}
      <ul className="space-y-2">
        {(messages.data?.messages??[]).map(msg=><li key={msg.id} className="rounded-lg border p-2 space-y-1">
          <p className="text-sm font-semibold">{msg.subject}</p>
          <p className="text-xs text-muted-foreground">{msg.from} · {msg.date}</p>
          <p className="text-xs text-muted-foreground">{msg.snippet}</p>
          <Button size="sm" variant="secondary" disabled={importing.isPending} onClick={()=>importing.mutate(msg.id)}>Importar este resumo</Button>
        </li>)}
      </ul>
    </div>}
    <p className="text-xs text-muted-foreground">
      Gmail direto exige Gmail API ativada no Google Cloud, o escopo gmail.readonly e autorização OAuth. O Google pode exigir verificação adicional para uso fora de testes pessoais. Nenhuma mensagem é lida antes do consentimento.
    </p>
  </li>;
}
