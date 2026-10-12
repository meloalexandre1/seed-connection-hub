import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bell, BellRing, Loader2, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { alertsService } from "@/services/alerts";

export function AlertsBell(){
  const [open,setOpen]=useState(false);
  const alerts=useQuery({
    queryKey:["seed-alerts"],queryFn:alertsService.list,
    refetchInterval:120000,refetchOnWindowFocus:true,retry:1,
  });
  const entries=alerts.data?.alerts??[];
  const urgent=entries.some(a=>a.urgent);
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild>
      <button type="button" aria-label="Notificações do Seed Connection"
        title="Notificações" className="relative grid h-11 w-11 shrink-0 place-items-center rounded-xl hover:bg-secondary">
        {urgent?<BellRing className="h-5 w-5 text-warning"/>:<Bell className="h-5 w-5"/>}
        {entries.length>0&&<span className="absolute right-0 top-0 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
          {entries.length>99?"99+":entries.length}
        </span>}
      </button>
    </PopoverTrigger>
    <PopoverContent align="end" className="z-50 w-[min(92vw,390px)] space-y-3 p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">Notificações</p>
          <p className="text-xs text-muted-foreground">Tarefas, agenda interna e alterações</p>
        </div>
        <Button type="button" size="sm" variant="outline" disabled={alerts.isFetching}
          onClick={()=>void alerts.refetch()} aria-label="Atualizar notificações">
          {alerts.isFetching?<Loader2 className="size-4 animate-spin"/>:<RefreshCcw className="size-4"/>}
        </Button>
      </div>
      {alerts.isError&&<p role="alert" className="text-xs text-destructive">{alerts.error.message}</p>}
      <div className="max-h-80 space-y-2 overflow-y-auto">
        {alerts.isLoading&&<p className="text-sm text-muted-foreground">Buscando avisos...</p>}
        {!alerts.isLoading&&!alerts.isError&&!entries.length&&<p className="p-2 text-sm text-muted-foreground">Nenhuma tarefa ou retorno próximo do vencimento.</p>}
        {entries.map(a=><Link key={a.id} to={a.href} onClick={()=>setOpen(false)}
          className="block rounded-lg border p-2 hover:bg-secondary">
          <div className="flex items-start justify-between gap-2">
            <span className="text-sm font-semibold">{a.title}</span>
            <span className="text-[10px] text-muted-foreground">{a.kind}</span>
          </div>
          <p className={a.urgent?"mt-1 text-xs text-warning":"mt-1 text-xs text-muted-foreground"}>{a.detail}</p>
        </Link>)}
      </div>
      <p className="border-t pt-2 text-xs text-muted-foreground">
        A central consulta os dados a cada 2 minutos enquanto o aplicativo está aberto.
        Notificações com o app fechado e menções @ ainda não foram implementadas.
      </p>
    </PopoverContent>
  </Popover>;
}
