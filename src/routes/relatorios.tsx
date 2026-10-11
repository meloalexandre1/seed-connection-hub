import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, EmptyState, DemoNotice } from "@/components/app/ui-bits";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/relatorios")({
  head: () => pageHead("Relatórios", "Relatórios diários e inteligência de conexões baseados em registros reais."),
  component: ReportsPage,
});

const SECTIONS: [string, string][] = [
  ["Relatório diário", "Agenda planejada × realizada, capturas, decisões, compromissos, bloqueios e prioridades de amanhã."],
  ["Inteligência de conexões", "Necessidades abertas, soluções na rede, apresentações realizadas e oportunidades paradas."],
  ["Pessoas estratégicas sem contato", "Quem tem prioridade alta e nenhuma interação recente confirmada."],
  ["Fila de revisão", "Registros com baixa confiança, ambíguos ou conflitantes aguardando decisão."],
];

function ReportsPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader eyebrow="Gestão" title="Relatórios">Fatos, hipóteses e recomendações sempre separados.</PageHeader>
      <div className="mb-4"><DemoNotice>Relatórios só são gerados a partir de registros reais. Como não há backend conectado, nenhum número é exibido — evitamos métricas inventadas.</DemoNotice></div>
      <div className="grid gap-4 md:grid-cols-2">
        {SECTIONS.map(([t, d]) => <Panel key={t} title={t}><EmptyState title="Sem dados reais" text={d} /></Panel>)}
      </div>
    </div>
  );
}
