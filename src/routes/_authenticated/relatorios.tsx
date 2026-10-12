import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageHeader,Panel,EmptyState } from "@/components/app/ui-bits";
import { liveReports } from "@/services/live-features";
import { pageHead } from "@/lib/seo";
export const Route=createFileRoute("/_authenticated/relatorios")({
 head:()=>pageHead("Relatórios","Painel com métricas dos registros reais acessíveis"),component:ReportsPage,
});
function ReportsPage(){
 const q=useQuery({queryKey:["reports-real"],queryFn:liveReports.get});
 if(q.isLoading)return <div className="mx-auto max-w-5xl"><PageHeader title="Relatórios"/>Carregando dados reais...</div>;
 if(q.isError)return <div className="mx-auto max-w-5xl"><PageHeader title="Relatórios"/><p role="alert" className="text-destructive">Não foi possível consultar os registros: {(q.error as Error).message}</p></div>;
 const d=q.data!;
 const today=new Date().toISOString().slice(0,10);
 const pending=d.tasks.filter(t=>t.status!=="feito");
 const overdue=pending.filter(t=>t.due_date&&t.due_date<today);
 const todayTasks=pending.filter(t=>t.due_date===today);
 const stale=d.people.filter(p=>p.priority==="alta"&&p.last_interaction_at&&Date.now()-new Date(p.last_interaction_at).getTime()>30*864e5);
 const review=d.captures.filter(c=>c.status==="revisar");
 const openOpp=d.opportunities.filter(o=>o.status!=="decidida");
 const total=[["Pessoas",d.people.length],["Tarefas pendentes",pending.length],["Oportunidades abertas",openOpp.length],["Capturas aguardando revisão",review.length]];
 return <div className="mx-auto max-w-5xl space-y-4">
 <PageHeader eyebrow="Gestão" title="Relatórios">Informações consultadas do banco, conforme suas permissões. Nenhuma métrica fictícia.</PageHeader>
 <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{total.map(([label,value])=><div key={label} className="rounded-2xl border bg-card p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-3xl font-bold text-primary">{value}</p></div>)}</div>
 <div className="grid gap-4 md:grid-cols-2">
 <Panel title="Prioridades de hoje"><p className="text-sm">Hoje: {todayTasks.length} tarefa(s) com vencimento · {overdue.length} atrasada(s).</p>{todayTasks.length===0&&overdue.length===0?<EmptyState title="Sem pendências com data para hoje" text="Tarefas sem data não entram nesta contagem."/>:<ul className="mt-3 space-y-2 text-sm">{[...overdue,...todayTasks].slice(0,15).map(t=><li key={t.id} className="rounded-lg border p-2">{t.title} · {t.due_date}{t.due_date&&t.due_date<today?" · atrasada":""}</li>)}</ul>}<Link className="mt-3 inline-block text-sm text-primary underline" to="/tarefas">Abrir tarefas</Link></Panel>
 <Panel title="Oportunidades para decisão">{openOpp.length===0?<EmptyState title="Nenhuma oportunidade aberta" text="Crie ou registre oportunidades para acompanhar."/>:<ul className="space-y-2">{openOpp.slice(0,12).map(o=><li className="rounded-lg border p-2 text-sm" key={o.id}>{o.title} · {o.recommendation||"sem avaliação"}</li>)}</ul>}<Link className="mt-3 inline-block text-sm text-primary underline" to="/oportunidades">Abrir oportunidades</Link></Panel>
 <Panel title="Pessoas estratégicas sem contato há 30 dias">{stale.length===0?<EmptyState title="Nenhuma encontrada" text="São consideradas somente pessoas de prioridade alta com última interação registrada."/>:<ul className="space-y-2">{stale.slice(0,12).map(p=><li className="rounded-lg border p-2 text-sm" key={p.id}><Link className="text-primary underline" to="/pessoas/$id" params={{id:p.id}}>{p.name}</Link> · última interação {new Date(p.last_interaction_at!).toLocaleDateString("pt-BR")}</li>)}</ul>}</Panel>
 <Panel title="Capturas e reuniões">{review.length===0?<EmptyState title="Fila de revisão vazia" text="Envie documentos e notas pela Central de Captura."/>:<p className="text-sm">{review.length} entrada(s) aguardando revisão.</p>}<Link to="/capturar" className="mt-3 inline-block text-sm text-primary underline">Abrir Central de Captura</Link></Panel>
 </div><p className="text-xs text-muted-foreground">Nota: este painel considera até 10.000 registros por categoria visíveis ao usuário. Relatórios completos e paginação virão após a homologação.</p>
 </div>;
}