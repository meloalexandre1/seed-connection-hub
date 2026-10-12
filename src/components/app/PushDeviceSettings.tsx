import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, Loader2, Smartphone, BellOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { pushSetup, savePushDevice, deletePushDevice } from "@/lib/push.functions";

function toUint8Array(b64url:string):Uint8Array{
  const b64=b64url.replace(/-/g,"+").replace(/_/g,"/");
  const decoded=atob(b64.padEnd(Math.ceil(b64.length/4)*4,"="));
  return Uint8Array.from(decoded,c=>c.charCodeAt(0));
}
function fromBuffer(buffer:ArrayBuffer|null):string{
  if(!buffer)throw new Error("Dispositivo sem chaves push.");
  const bytes=Array.from(new Uint8Array(buffer));
  const base64=btoa(String.fromCharCode(...bytes));
  return base64.replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
const iphone=()=>/iPhone|iPad|iPod/.test(navigator.userAgent);
const standalone=()=>window.matchMedia("(display-mode: standalone)").matches||
  Boolean((navigator as Navigator&{standalone?:boolean}).standalone);

export function PushDeviceSettings(){
  const qc=useQueryClient();
  const setup=useQuery({queryKey:["push-setup"],queryFn:()=>pushSetup(),retry:false});
  const [working,setWorking]=useState(false);
  const supported=typeof window!=="undefined"&&"serviceWorker" in navigator&&
    "PushManager" in window&&"Notification" in window&&window.isSecureContext;
  const iosNeedsInstall=supported&&iphone()&&!standalone();

  async function enable(){
    setWorking(true);
    try {
      if(!supported)throw new Error("Este navegador não suporta Web Push neste modo. Use o navegador atualizado.");
      if(iosNeedsInstall)throw new Error("No iPhone, abra no Safari, toque Compartilhar → Adicionar à Tela de Início e abra o Seed pelo ícone criado.");
      const {publicKey,ready}=await pushSetup();
      if(!ready||!publicKey)throw new Error("A chave pública de notificações ainda não foi configurada pelo administrador.");
      const reg=await navigator.serviceWorker.register("/sw.js",{scope:"/"});
      const permission=await Notification.requestPermission();
      if(permission!=="granted")throw new Error("Permissão de notificações negada. Habilite-a nas configurações do celular.");
      let sub=await reg.pushManager.getSubscription();
      if(!sub)sub=await reg.pushManager.subscribe({
        userVisibleOnly:true,applicationServerKey:toUint8Array(publicKey) as BufferSource,
      });
      const p256dh=fromBuffer(sub.getKey("p256dh"));
      const auth=fromBuffer(sub.getKey("auth"));
      await savePushDevice({data:{endpoint:sub.endpoint,p256dh,auth}});
      await qc.invalidateQueries({queryKey:["push-setup"]});
      toast.success("Celular registrado para notificações de tarefas e retornos.");
    }catch(e){toast.error(e instanceof Error?e.message:"Não foi possível ativar as notificações.");}
    finally{setWorking(false);}
  }
  async function disable(){
    setWorking(true);
    try{
      const reg=await navigator.serviceWorker.ready;
      const sub=await reg.pushManager.getSubscription();
      if(sub){
        await deletePushDevice({data:{endpoint:sub.endpoint}});
        await sub.unsubscribe();
      }
      await qc.invalidateQueries({queryKey:["push-setup"]});
      toast.success("Notificações desligadas neste dispositivo.");
    }catch(e){toast.error(e instanceof Error?e.message:"Não foi possível desligar as notificações.");}
    finally{setWorking(false);}
  }
  return <li className="rounded-xl border p-3 space-y-2">
    <div className="flex items-start gap-3">
      <Smartphone className="h-5 w-5 shrink-0 text-primary"/>
      <div>
        <p className="text-sm font-semibold">Notificações no celular (com o app fechado)</p>
        <p className="text-xs text-muted-foreground">
          {setup.isLoading?"Verificando...":setup.isError?"Não foi possível consultar o serviço.":
          setup.data?.ready?`Serviço configurado · ${setup.data.devices} dispositivo(s) ativo(s)`:
          "Aguardando configuração da chave de envio pelo administrador"}
        </p>
      </div>
    </div>
    {iosNeedsInstall&&<p className="rounded-lg bg-warning/10 p-2 text-xs">
      iPhone: abra este site no Safari → Compartilhar → Adicionar à Tela de Início.
      Use o ícone instalado para permitir notificações push.
    </p>}
    <div className="flex flex-wrap gap-2">
      <Button size="sm" onClick={()=>void enable()} disabled={working||!supported||!setup.data?.ready||iosNeedsInstall}>
        {working?<Loader2 className="h-4 w-4 animate-spin"/>:<BellRing className="h-4 w-4"/>}
        Ativar neste celular
      </Button>
      <Button size="sm" variant="outline" onClick={()=>void disable()} disabled={working||!supported}>
        <BellOff className="h-4 w-4"/> Desativar neste celular
      </Button>
    </div>
    <p className="text-xs text-muted-foreground">
      O envio funciona em segundo plano após você permitir as notificações e o administrador ativar a rotina agendada.
      Alertas resumidos não exibem conteúdo privado na tela bloqueada. As mensagens são enviadas pelo serviço de push do navegador.
      Nenhuma OpenAI ou Google Agenda é necessária.
    </p>
  </li>;
}
