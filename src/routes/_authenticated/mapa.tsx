import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { RefreshCw, Search, Network } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { PageHeader, LevelBadge } from "@/components/app/ui-bits";
import { PROXIMITY } from "@/services";
import { liveNetwork } from "@/services/live";
import { buildNetworkEdges, networkNameLines } from "@/lib/network";
import { cn } from "@/lib/utils";
import { pageHead } from "@/lib/seo";

const networkQuery = queryOptions({ queryKey: ["network", "live"], queryFn: liveNetwork.list, staleTime: 0, refetchInterval: 60_000 });
export const Route = createFileRoute("/_authenticated/mapa")({
  head: () => pageHead("Mapa da rede", "Pessoas cadastradas, vínculos registrados e possíveis conexões com base em dados reais."),
  loader: ({ context }) => context.queryClient.ensureQueryData(networkQuery),
  pendingComponent: () => <p role="status" className="py-12 text-center text-muted-foreground">Carregando sua rede…</p>,
  errorComponent: MapError,
  component: MapPage,
});

function MapError() {
  const router = useRouter();
  return <div role="alert" className="space-y-4 py-12 text-center"><p>Não foi possível carregar sua rede. Nenhum dado de exemplo será exibido.</p><Button variant="outline" onClick={() => router.invalidate()}>Tentar novamente</Button></div>;
}

function MapPage() {
  const query = useSuspenseQuery(networkQuery);
  const { people, relationships } = query.data;
  const [sphere, setSphere] = useState("todos");
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const spheres = [...new Set(people.map((p) => p.sphere?.trim() || "Sem esfera"))].sort();
  const shown = people.filter((p) => (sphere === "todos" || (p.sphere?.trim() || "Sem esfera") === sphere) && p.name.toLocaleLowerCase("pt-BR").includes(search.trim().toLocaleLowerCase("pt-BR")));
  const edges = buildNetworkEdges(shown, relationships).filter((e) => suggestions || e.confirmed);
  const current = shown.find((p) => p.id === selected);
  const currentEdges = edges.filter((e) => e.a === current?.id || e.b === current?.id);
  const columns = Math.max(1, Math.ceil(Math.sqrt(shown.length)));
  const width = Math.max(620, columns * 170 + 70);
  const rowHeight = Math.max(145, ...shown.map((p) => 85 + networkNameLines(p.name).length * 16));
  const height = Math.max(390, Math.ceil(shown.length / columns) * rowHeight + 70);
  const positions = new Map(shown.map((p, i) => [p.id, { x: 120 + (i % columns) * 170, y: 70 + Math.floor(i / columns) * rowHeight }]));
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader eyebrow="Rede" title="Mapa da rede" />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-48 flex-1"><Search aria-hidden className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label="Buscar pessoa no mapa" placeholder="Buscar pessoa" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>
        <label className="flex items-center gap-2 text-sm">Esfera<select aria-label="Filtrar esfera" className="h-10 max-w-40 rounded-md border bg-card px-2" value={sphere} onChange={(e) => setSphere(e.target.value)}><option value="todos">Todas</option>{spheres.map((s) => <option key={s}>{s}</option>)}</select></label>
        <Button variant="outline" size="icon" aria-label="Atualizar mapa" title="Atualizar mapa" disabled={query.isFetching} onClick={() => query.refetch()}><RefreshCw className={cn("h-4 w-4", query.isFetching && "animate-spin")} /></Button>
      </div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-sm">
        <p className="text-muted-foreground">{shown.length} pessoas · {edges.filter((e) => e.confirmed).length} vínculos registrados · {edges.filter((e) => !e.confirmed).length} possíveis conexões</p>
        <label className="flex min-h-11 items-center gap-2"><Switch checked={suggestions} onCheckedChange={setSuggestions} aria-label="Mostrar possíveis conexões" />Possíveis conexões</label>
      </div>
      {query.isRefetchError && <p role="alert" className="mb-4 text-warning">Não foi possível atualizar. Exibindo a última leitura; tente novamente.</p>}
      {!people.length ? <div className="space-y-4 py-16 text-center"><Network className="mx-auto h-10 w-10 text-muted-foreground" /><h2 className="text-lg font-semibold">Sua rede ainda não tem pessoas cadastradas</h2><Button asChild><Link to="/pessoas">Ir para Pessoas</Link></Button></div> : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap gap-4 text-xs text-muted-foreground"><span className="flex items-center gap-2"><span className="w-6 border-t-2 border-primary" />Vínculo registrado</span><span className="flex items-center gap-2"><span className="w-6 border-t-2 border-dashed border-info" />Possível conexão · não confirmada</span></div>
            {!shown.length ? <p className="py-12 text-center text-muted-foreground">Nenhuma pessoa encontrada com esses filtros.</p> : <div className="overflow-auto rounded-lg border bg-card" tabIndex={0} aria-label="Mapa de pessoas cadastradas">
              <svg width={width} height={height} role="group" aria-label="Rede de pessoas cadastradas" className="block">
                {edges.map((e) => {
                  const a = positions.get(e.a), b = positions.get(e.b);
                  if (!a || !b) return null;
                  return <line key={e.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} strokeWidth={selected && (e.a === selected || e.b === selected) ? 2.5 : 1.3} strokeDasharray={e.confirmed ? undefined : "5 5"} className={cn(e.confirmed ? "stroke-primary" : "stroke-info", selected && e.a !== selected && e.b !== selected && "opacity-20")}><title>{e.reasons.join("; ")}</title></line>;
                })}
                {shown.map((p) => {
                  const position = positions.get(p.id);
                  if (!position) return null;
                  const radius = 15 + Math.max(0, PROXIMITY.findIndex((l) => l.key === p.proximity)) * 3;
                  return <g key={p.id} role="button" tabIndex={0} aria-label={p.name} aria-pressed={selected === p.id} onClick={() => setSelected(p.id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelected(p.id); } }} className="cursor-pointer outline-none [&:focus-visible_circle]:stroke-ring">
                    <title>{p.name}</title><circle cx={position.x} cy={position.y} r={Math.max(radius, 24)} className="fill-card stroke-background" strokeWidth={3} />
                    <circle cx={position.x} cy={position.y} r={radius} className={cn(selected === p.id ? "fill-primary stroke-primary" : "fill-n2 stroke-border")} strokeWidth={2} />
                    {networkNameLines(p.name).map((line, i) => <text key={i} x={position.x} y={position.y + 42 + i * 16} textAnchor="middle" className="fill-foreground text-[12px]">{line}</text>)}
                  </g>;
                })}
              </svg>
            </div>}
          </div>
          <aside className="min-w-0 space-y-4 border-t pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
            <h2 className="font-semibold">{current ? current.name : "Pessoa selecionada"}</h2>
            {current ? <><LevelBadge level={current.proximity} />{current.company && <p className="break-words text-sm text-muted-foreground">{current.company}</p>}<Button asChild size="sm"><Link to="/pessoas/$id" params={{ id: current.id }}>Abrir perfil</Link></Button>
              <h3 className="pt-3 text-sm font-semibold">Conexões</h3>
              {!currentEdges.length && <p className="text-sm text-muted-foreground">Nenhum vínculo ou possível conexão encontrado nos dados cadastrados.</p>}
              <ul className="space-y-4">{currentEdges.map((edge) => {
                const other = shown.find((p) => p.id === (edge.a === current.id ? edge.b : edge.a));
                if (!other) return null;
                return <li key={edge.id} className="border-b pb-3"><Button variant="link" className="h-auto max-w-full whitespace-normal p-0 text-left" onClick={() => setSelected(other.id)}>{other.name}</Button><p className={cn("mt-1 text-xs", edge.confirmed ? "text-primary" : "text-info")}>{edge.confirmed ? "Vínculo registrado" : "Possível conexão · não confirmada"}</p><ul className="mt-2 space-y-1 text-xs text-muted-foreground">{edge.reasons.map((reason) => <li key={reason} className="break-words">{reason}</li>)}</ul></li>;
              })}</ul>
            </> : <p className="text-sm text-muted-foreground">Nenhuma pessoa selecionada.</p>}
          </aside>
        </div>
      )}
    </div>
  );
}
