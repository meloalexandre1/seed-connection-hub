import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel, LevelBadge, DemoNotice } from "@/components/app/ui-bits";
import { PROXIMITY, peopleService } from "@/services";
import { cn } from "@/lib/utils";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/mapa")({
  head: () => pageHead("Mapa da rede", "Visualização relacional das pessoas e conexões."),
  component: MapPage,
});

function MapPage() {
  const people = peopleService.list();
  const spheres = [...new Set(people.map((p) => p.sphere))];
  const [on, setOn] = useState<string[]>(spheres);
  const [sel, setSel] = useState<string | null>(null);
  const shown = people.filter((p) => on.includes(p.sphere));
  const pos: Record<string, { x: number; y: number }> = Object.fromEntries(shown.map((p, i) => {
    const a = (i / shown.length) * Math.PI * 2 - Math.PI / 2;
    return [p.id, { x: 200 + Math.cos(a) * 130, y: 160 + Math.sin(a) * 110 }];
  }));
  const P = (id: string) => pos[id] ?? { x: 0, y: 0 };
  const lvl = (k: string) => PROXIMITY.findIndex((x) => x.key === k) + 1;
  const current = sel ? peopleService.get(sel) : null;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader eyebrow="Rede" title="Mapa da rede">Tamanho do nó = proximidade. Toque para ver a pessoa.</PageHeader>
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <div className="rounded-2xl border bg-card bg-glow p-2">
          <svg viewBox="0 0 400 320" className="h-auto w-full" role="img" aria-label="Grafo de relacionamentos fictício">
            {shown.flatMap((p) => p.connections.filter((c) => pos[c] && c > p.id).map((c) => (
              <line key={p.id + c} x1={P(p.id).x} y1={P(p.id).y} x2={P(c).x} y2={P(c).y} className="stroke-border" strokeWidth={1.5} />
            )))}
            {shown.map((p) => (
              <g key={p.id} role="button" tabIndex={0} aria-label={p.name} onClick={() => setSel(p.id)} onKeyDown={(e) => e.key === "Enter" && setSel(p.id)} className="cursor-pointer">
                <circle cx={P(p.id).x} cy={P(p.id).y} r={8 + lvl(p.proximity) * 3} className={cn(sel === p.id ? "fill-primary" : "fill-n3", "stroke-background")} strokeWidth={3} />
                <text x={P(p.id).x} y={P(p.id).y + 30} textAnchor="middle" className="fill-foreground text-[10px]">{p.name.split(" ")[0]}</text>
              </g>
            ))}
          </svg>
        </div>
        <div className="space-y-4">
          <Panel title="Esferas">
            <div className="flex flex-wrap gap-2">{spheres.map((s) => (
              <button key={s} aria-pressed={on.includes(s)} onClick={() => setOn((x) => (x.includes(s) ? x.filter((y) => y !== s) : [...x, s]))}
                className={cn("min-h-9 rounded-full border px-3 text-xs text-areia", on.includes(s) && "border-lime-line bg-lime-deep text-primary")}>{s}</button>
            ))}</div>
          </Panel>
          <Panel title="Selecionado">
            {current ? (<div className="space-y-2"><p className="font-semibold">{current.name}</p><LevelBadge level={current.proximity} /><p className="text-sm text-muted-foreground">{current.company}</p><Button asChild size="sm"><Link to="/pessoas/$id" params={{ id: current.id }}>Abrir perfil</Link></Button></div>)
              : <p className="text-sm text-muted-foreground">Nenhuma pessoa selecionada.</p>}
          </Panel>
          <DemoNotice>Mapa com {shown.length} pessoas fictícias. O mapa real (RF-14) será alimentado pelo banco.</DemoNotice>
        </div>
      </div>
    </div>
  );
}
