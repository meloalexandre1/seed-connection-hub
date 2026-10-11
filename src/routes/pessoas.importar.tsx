import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, FileSpreadsheet, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, Panel, DemoNotice } from "@/components/app/ui-bits";
import { normalizePhone, peopleService } from "@/services";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/pessoas/importar")({
  head: () => pageHead("Importar contatos", "Importador CSV/XLSX com mapeamento, prévia e deduplicação (demonstração)."),
  component: ImportPage,
});

const FIELDS = ["ignorar", "nome", "telefone", "email", "empresa", "cidade"] as const;
type Field = (typeof FIELDS)[number];
type Action = "criar" | "mesclar" | "ignorar" | "revisar";

const SAMPLE = "Nome,Telefone,Email,Empresa,Cidade\nMarcelo Exemplo,(41) 90000-0001,,Construtora Fictícia,Curitiba\nCarla Teste,(21) 90000-0099,carla@exemplo.test,,Rio de Janeiro\nAna F.,,ana@exemplo.test,Instituto Horizonte,São Paulo";

function parseCsv(txt: string) {
  const lines = txt.trim().split(/\r?\n/).filter(Boolean);
  const sep = lines[0]?.includes(";") ? ";" : ",";
  return lines.map((l) => l.split(sep).map((c) => c.trim().replace(/^"|"$/g, "")));
}
function guess(h: string): Field {
  const s = h.toLowerCase();
  if (s.includes("nome")) return "nome";
  if (s.includes("tel") || s.includes("cel")) return "telefone";
  if (s.includes("mail")) return "email";
  if (s.includes("empresa")) return "empresa";
  if (s.includes("cidade")) return "cidade";
  return "ignorar";
}

function ImportPage() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [rows, setRows] = useState<string[][]>([]);
  const [map, setMap] = useState<Field[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [fileName, setFileName] = useState("");

  const load = (txt: string, name: string) => {
    const r = parseCsv(txt);
    if (r.length < 2 || !r[0]) { toast.error("O arquivo precisa de cabeçalho e ao menos uma linha."); return; }
    setRows(r); setMap(r[0].map(guess)); setFileName(name); setStep(2);
  };
  const body = rows.slice(1);
  const col = (row: string[], f: Field) => row[map.indexOf(f)] ?? "";
  const matchOf = (row: string[]) => {
    const name = col(row, "nome").toLowerCase(), phone = normalizePhone(col(row, "telefone")), email = col(row, "email").toLowerCase();
    for (const p of peopleService.list()) {
      const why: string[] = [];
      if (phone && p.phones.some((x) => normalizePhone(x) === phone)) why.push("telefone igual");
      if (email && p.emails.includes(email)) why.push("e-mail igual");
      if (name && p.name.toLowerCase().split(" ")[0] === name.split(" ")[0]) why.push("primeiro nome semelhante");
      if (why.length) return { p, why, strong: why.length >= 2 };
    }
    return null;
  };

  return (
    <div className="mx-auto max-w-5xl">
      <Link to="/pessoas" className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Pessoas</Link>
      <PageHeader eyebrow="Importador · DEMO" title="Importar contatos">Mapeie colunas, revise duplicidades e escolha a ação de cada linha.</PageHeader>
      <ol className="mb-4 flex gap-2 text-xs" aria-label="Etapas">
        {["Arquivo", "Mapear colunas", "Prévia e duplicidades", "Resultado"].map((s, i) => (
          <li key={s} className={`flex-1 rounded-full border px-3 py-1.5 text-center ${step === i + 1 ? "border-lime-line bg-lime-deep text-primary" : "text-muted-foreground"}`}>{i + 1}. <span className="hidden sm:inline">{s}</span></li>
        ))}
      </ol>

      {step === 1 && (
        <Panel>
          <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-6 text-center hover:border-lime-line">
            <Upload className="h-8 w-8 text-primary" aria-hidden />
            <span className="font-semibold">Selecione um arquivo CSV ou XLSX</span>
            <span className="text-xs text-muted-foreground">O arquivo é lido apenas no seu navegador; nada é enviado.</span>
            <input type="file" accept=".csv,.xlsx,.xls" className="sr-only" onChange={async (e) => {
              const f = e.target.files?.[0]; if (!f) return;
              if (/\.xlsx?$/i.test(f.name)) { toast.info("Leitura de XLSX será feita pelo backend. Usando a amostra fictícia nesta demonstração."); load(SAMPLE, `${f.name} (substituído por amostra)`); return; }
              load(await f.text(), f.name);
            }} />
          </label>
          <div className="mt-3 flex justify-center"><Button variant="secondary" onClick={() => load(SAMPLE, "amostra-ficticia.csv")}><FileSpreadsheet className="h-4 w-4" />Usar amostra fictícia</Button></div>
          <div className="mt-4"><DemoNotice>Evite usar planilhas com dados reais enquanto o backend não estiver conectado. Nenhuma linha será gravada.</DemoNotice></div>
        </Panel>
      )}

      {step === 2 && (
        <Panel title={`Mapear colunas · ${fileName}`}>
          <div className="grid gap-3 sm:grid-cols-2">
            {(rows[0] ?? []).map((h, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl border p-3">
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{h}</p><p className="truncate text-xs text-muted-foreground">ex.: {rows[1]?.[i] || "—"}</p></div>
                <Select value={map[i] ?? "ignorar"} onValueChange={(v) => setMap((m) => m.map((x, j) => (j === i ? (v as Field) : x)))}>
                  <SelectTrigger className="h-10 w-36" aria-label={`Campo para ${h}`}><SelectValue /></SelectTrigger>
                  <SelectContent>{FIELDS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Valores originais são preservados; telefones são normalizados só para comparação.</p>
          <div className="mt-4 flex justify-end gap-2"><Button variant="secondary" onClick={() => setStep(1)}>Voltar</Button>
            <Button onClick={() => { setActions(body.map((r) => { const m = matchOf(r); return m ? (m.strong ? "revisar" : "revisar") : "criar"; })); setStep(3); }}>Gerar prévia</Button></div>
        </Panel>
      )}

      {step === 3 && (
        <Panel title="Prévia e duplicidades">
          <ul className="space-y-2">
            {body.map((r, i) => {
              const m = matchOf(r);
              return (
                <li key={i} className="flex flex-col gap-2 rounded-xl border p-3 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{col(r, "nome") || "(sem nome)"}</p>
                    <p className="text-xs text-muted-foreground">{[col(r, "telefone"), col(r, "email"), col(r, "empresa")].filter(Boolean).join(" · ") || "sem contato"}</p>
                    {m && <p className="mt-1 text-xs text-warning">Possível duplicata de {m.p.name}: {m.why.join(", ")}. Nunca mesclado automaticamente.</p>}
                  </div>
                  <Select value={actions[i] ?? "revisar"} onValueChange={(v) => setActions((a) => a.map((x, j) => (j === i ? (v as Action) : x)))}>
                    <SelectTrigger className="h-10 w-40" aria-label="Ação"><SelectValue /></SelectTrigger>
                    <SelectContent>{(["criar", "mesclar", "ignorar", "revisar"] as Action[]).map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                  </Select>
                </li>
              );
            })}
          </ul>
          <div className="mt-4 flex justify-end gap-2"><Button variant="secondary" onClick={() => setStep(2)}>Voltar</Button><Button onClick={() => setStep(4)}>Simular importação</Button></div>
        </Panel>
      )}

      {step === 4 && (
        <Panel title="Resultado da simulação">
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(["criar", "mesclar", "ignorar", "revisar"] as Action[]).map((a) => (
              <li key={a} className="rounded-xl border p-3 text-center"><p className="text-2xl font-semibold text-primary">{actions.filter((x) => x === a).length}</p><p className="text-xs text-muted-foreground">{a}</p></li>
            ))}
          </ul>
          <div className="mt-4"><DemoNotice><b>Nada foi gravado.</b> Com o Supabase conectado, esta etapa criará um lote em <code>imports</code> e o resultado por linha em <code>import_rows</code>, com autor e horário.</DemoNotice></div>
          <div className="mt-4 flex justify-end gap-2"><Button variant="secondary" onClick={() => setStep(1)}>Nova importação</Button><Button asChild><Link to="/pessoas">Voltar às pessoas</Link></Button></div>
        </Panel>
      )}
    </div>
  );
}
