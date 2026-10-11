import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Mic, Square, Paperclip, Camera, PenLine, FileAudio, AlertTriangle, Loader2, CheckCircle2, RotateCcw, Trash2, Smartphone, Clock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { PageHeader, Panel, DemoNotice, EmptyState } from "@/components/app/ui-bits";
import type { CaptureKind, CaptureStatus } from "@/types/domain";
import { cn } from "@/lib/utils";
import { pageHead } from "@/lib/seo";

type Modo = "audio" | "arquivo" | "foto" | "nota" | "plaud";
export const Route = createFileRoute("/capturar")({
  validateSearch: (s: Record<string, unknown>): { modo?: Modo | undefined } => ({
    modo: ["audio", "arquivo", "foto", "nota", "plaud"].includes(String(s["modo"])) ? (s["modo"] as Modo) : undefined,
  }),
  head: () => pageHead("Central de Captura", "Grave áudio, fotografe, anexe arquivos, escreva notas e importe materiais."),
  component: CapturePage,
});

interface Item { id: string; kind: CaptureKind; label: string; status: CaptureStatus; url?: string; mime?: string }

const STATUS: Record<CaptureStatus, { label: string; cls: string }> = {
  esperando: { label: "Esperando envio", cls: "text-muted-foreground" },
  gravando: { label: "Gravando", cls: "text-destructive" },
  enviando: { label: "Enviando (simulado)", cls: "text-info" },
  processando: { label: "Processando (simulado)", cls: "text-info" },
  revisar: { label: "Precisa revisar", cls: "text-warning" },
  concluido: { label: "Concluído (demo, não salvo)", cls: "text-success" },
  erro: { label: "Falha no envio", cls: "text-destructive" },
};

const TABS: { key: Modo; label: string; icon: typeof Mic }[] = [
  { key: "audio", label: "Gravar áudio", icon: Mic },
  { key: "foto", label: "Fotografar", icon: Camera },
  { key: "arquivo", label: "Anexar", icon: Paperclip },
  { key: "nota", label: "Nota", icon: PenLine },
  { key: "plaud", label: "PLAUD", icon: FileAudio },
];

function CapturePage() {
  const { modo } = Route.useSearch();
  const [tab, setTab] = useState<Modo>(modo ?? "audio");
  const [items, setItems] = useState<Item[]>([]);
  const [review, setReview] = useState<Item | null>(null);
  useEffect(() => { if (modo) setTab(modo); }, [modo]);

  const add = (it: Omit<Item, "id" | "status">) => setItems((x) => [{ ...it, id: crypto.randomUUID(), status: "esperando" }, ...x]);
  const setStatus = (id: string, status: CaptureStatus) => setItems((x) => x.map((i) => (i.id === id ? { ...i, status } : i)));
  const send = (id: string) => {
    setStatus(id, "enviando");
    setTimeout(() => {
      if (!navigator.onLine) return setStatus(id, "erro");
      setStatus(id, "processando");
      setTimeout(() => setStatus(id, "revisar"), 1500);
    }, 1200);
  };

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader eyebrow="Central de Captura" title="Capturar">Tudo vira um registro de entrada com origem, data e estado de processamento.</PageHeader>
      <div className="mb-4"><DemoNotice>Sem backend conectado: envio e processamento são <b>simulados localmente</b>. Nenhum arquivo sai do seu aparelho e nada é transcrito por IA.</DemoNotice></div>

      <div role="tablist" className="mb-4 grid grid-cols-5 gap-2">
        {TABS.map(({ key, label, icon: I }) => (
          <button key={key} role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
            className={cn("flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl border bg-card text-[11px] font-semibold sm:text-xs", tab === key && "border-lime-line bg-lime-deep text-primary")}>
            <I className="h-5 w-5" aria-hidden />{label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div>
          {tab === "audio" && <AudioRecorder onDone={(url, mime) => add({ kind: "audio", label: `Áudio gravado ${new Date().toLocaleTimeString("pt-BR")}`, url, mime })} />}
          {tab === "foto" && <FilePicker kind="foto" accept="image/*" capture title="Fotografar" hint="Abre a câmera no celular; no desktop, escolha uma imagem." onPick={add} />}
          {tab === "arquivo" && <FilePicker kind="arquivo" accept="audio/*,video/*,image/*,application/pdf" title="Anexar áudio, vídeo, imagem ou PDF" hint="Prévia local antes do envio." onPick={add} />}
          {tab === "nota" && <NoteForm onSave={(t) => add({ kind: "nota", label: t.slice(0, 60) })} />}
          {tab === "plaud" && <PlaudPanel onPick={add} />}
        </div>

        <Panel title="Fila de capturas">
          {items.length === 0 ? <EmptyState title="Nada capturado ainda" text="Grave, anexe ou escreva para ver os estados de processamento aqui." /> : (
            <ul className="space-y-2">
              {items.map((it) => (
                <li key={it.id} className="rounded-xl border p-3">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{it.label}</p>
                      <p className={cn("flex items-center gap-1 text-xs", STATUS[it.status].cls)}>
                        {(it.status === "enviando" || it.status === "processando") && <Loader2 className="h-3 w-3 animate-spin" />}
                        {it.status === "erro" && <AlertTriangle className="h-3 w-3" />}{it.status === "concluido" && <CheckCircle2 className="h-3 w-3" />}
                        {STATUS[it.status].label}</p></div>
                    <Button size="icon" variant="ghost" aria-label="Descartar" onClick={() => setItems((x) => x.filter((y) => y.id !== it.id))}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                  {it.url && it.mime?.startsWith("image") && <img src={it.url} alt="Prévia" className="mt-2 max-h-32 rounded-lg" />}
                  {it.url && it.mime?.startsWith("audio") && <audio controls src={it.url} className="mt-2 w-full" />}
                  {it.url && it.mime?.startsWith("video") && <video controls src={it.url} className="mt-2 max-h-40 w-full rounded-lg" />}
                  <div className="mt-2 flex gap-2">
                    {it.status === "esperando" && <Button size="sm" onClick={() => send(it.id)}>Enviar (simular)</Button>}
                    {it.status === "erro" && <Button size="sm" variant="secondary" onClick={() => send(it.id)}><RotateCcw className="h-3 w-3" />Tentar de novo</Button>}
                    {it.status === "revisar" && <Button size="sm" onClick={() => setReview(it)}>Revisar sugestões</Button>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel className="mt-4" title={<span className="flex items-center gap-2"><Smartphone className="h-4 w-4 text-primary" />Sobre gravações longas</span>}>
        <p className="text-sm text-muted-foreground">No navegador, a gravação pode parar ao bloquear a tela, trocar de app ou receber uma ligação. Gravação longa em segundo plano, com checkpoints e recuperação, exigirá um <b className="text-foreground">aplicativo híbrido/nativo</b> validado em Android e iPhone. Esta versão web não promete isso.</p>
      </Panel>

      <Dialog open={!!review} onOpenChange={(o) => !o && setReview(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Revisar sugestões</DialogTitle><DialogDescription>{review?.label}</DialogDescription></DialogHeader>
          <DemoNotice>Nenhuma IA analisou este material. Com o backend, aqui apareceriam transcrição, resumo, pessoas encontradas, necessidades e tarefas propostas — cada uma para aprovar, editar, ignorar ou adiar.</DemoNotice>
          <ul className="space-y-2 text-sm">
            {["Transcrição / extração", "Pessoas mencionadas (correspondências incertas)", "Necessidades e tarefas propostas"].map((s) => (
              <li key={s} className="flex items-center gap-2 rounded-xl border border-dashed p-3 text-muted-foreground"><Clock className="h-4 w-4" />{s}: aguardando backend</li>
            ))}
          </ul>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setReview(null)}>Adiar</Button>
            <Button onClick={() => { if (review) setStatus(review.id, "concluido"); setReview(null); toast.warning("Demonstração: marcado como concluído só nesta tela."); }}>Marcar como revisado</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AudioRecorder({ onDone }: { onDone: (url: string, mime: string) => void }) {
  const [state, setState] = useState<"idle" | "pedindo" | "gravando" | "indisponivel" | "negado">("idle");
  const [secs, setSecs] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const discard = useRef(false);

  useEffect(() => {
    if (state !== "gravando") return;
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [state]);

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") return setState("indisponivel");
    setState("pedindo");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const r = new MediaRecorder(stream);
      chunks.current = []; discard.current = false;
      r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      r.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (!discard.current) { const b = new Blob(chunks.current, { type: r.mimeType }); onDone(URL.createObjectURL(b), r.mimeType || "audio/webm"); }
        setState("idle"); setSecs(0);
      };
      r.start(1000); rec.current = r; setState("gravando");
    } catch { setState("negado"); }
  };
  const mm = `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;

  return (
    <Panel title="Gravar áudio">
      <div className="flex flex-col items-center gap-4 py-6">
        <div className={cn("font-mono text-4xl tabular-nums", state === "gravando" && "text-destructive")} aria-live="polite">{mm}</div>
        {state === "gravando" ? (
          <div className="flex gap-3">
            <Button variant="secondary" className="h-14 px-5" onClick={() => setConfirm(true)}><Trash2 className="h-5 w-5" />Descartar</Button>
            <Button className="h-14 px-6" onClick={() => rec.current?.stop()}><Square className="h-5 w-5" />Parar e guardar</Button>
          </div>
        ) : (
          <button onClick={start} disabled={state === "pedindo"} aria-label="Iniciar gravação" className="grid h-24 w-24 place-items-center rounded-full bg-primary text-primary-foreground shadow-capture disabled:opacity-60">
            {state === "pedindo" ? <Loader2 className="h-9 w-9 animate-spin" /> : <Mic className="h-10 w-10" />}
          </button>
        )}
        <p className="text-center text-xs text-muted-foreground">{state === "gravando" ? "Gravando no navegador. Mantenha esta tela aberta." : "O áudio fica só no seu aparelho até o envio."}</p>
        {state === "indisponivel" && <p role="alert" className="flex items-center gap-2 text-sm text-warning"><AlertTriangle className="h-4 w-4" />Este navegador não oferece gravação de áudio. Use “Anexar”.</p>}
        {state === "negado" && <p role="alert" className="flex items-center gap-2 text-sm text-destructive"><AlertTriangle className="h-4 w-4" />Acesso ao microfone negado ou indisponível. Nada foi gravado.</p>}
      </div>
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Descartar gravação?</AlertDialogTitle><AlertDialogDescription>Este áudio ainda não foi enviado e será perdido.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Continuar gravando</AlertDialogCancel>
            <AlertDialogAction onClick={() => { discard.current = true; rec.current?.stop(); }}>Descartar</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Panel>
  );
}

function FilePicker({ kind, accept, capture, title, hint, onPick }: { kind: CaptureKind; accept: string; capture?: boolean; title: string; hint: string; onPick: (i: Omit<Item, "id" | "status">) => void }) {
  return (
    <Panel title={title}>
      <label className="flex min-h-48 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-6 text-center hover:border-lime-line">
        {kind === "foto" ? <Camera className="h-9 w-9 text-primary" /> : <Paperclip className="h-9 w-9 text-primary" />}
        <span className="font-semibold">Toque para escolher</span><span className="text-xs text-muted-foreground">{hint}</span>
        <input type="file" accept={accept} {...(capture ? { capture: "environment" as const } : {})} className="sr-only" onChange={(e) => {
          const f = e.target.files?.[0]; if (!f) return;
          onPick({ kind, label: f.name, url: URL.createObjectURL(f), mime: f.type });
          e.target.value = "";
        }} />
      </label>
    </Panel>
  );
}

function NoteForm({ onSave }: { onSave: (t: string) => void }) {
  const [t, setT] = useState("");
  return (
    <Panel title="Nota rápida">
      <Textarea value={t} onChange={(e) => setT(e.target.value)} rows={7} placeholder="Ex.: Conversei com… ele precisa de… combinei de…" aria-label="Texto da nota" />
      <div className="mt-3 flex justify-end"><Button className="h-11" disabled={!t.trim()} onClick={() => { onSave(t); setT(""); }}>Adicionar à fila</Button></div>
    </Panel>
  );
}

function PlaudPanel({ onPick }: { onPick: (i: Omit<Item, "id" | "status">) => void }) {
  return (
    <Panel title="Importar do PLAUD">
      <div className="mb-3 rounded-xl border bg-secondary p-3 text-sm">
        <p className="font-semibold">Canal futuro · não conectado</p>
        <p className="mt-1 text-muted-foreground">Você ainda não possui um PLAUD. Quando tiver, poderá exportar áudio (MP3/WAV), transcrição (TXT/SRT/DOCX/PDF) ou resumo e importar aqui manualmente. Exportar não equivale a sincronização automática.</p>
      </div>
      <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed p-4 text-center hover:border-lime-line">
        <FileAudio className="h-7 w-7 text-primary" /><span className="text-sm font-semibold">Entrada manual de arquivo exportado</span>
        <input type="file" accept=".mp3,.wav,.txt,.srt,.docx,.pdf,.md" className="sr-only" onChange={(e) => {
          const f = e.target.files?.[0]; if (f) onPick({ kind: "plaud", label: `PLAUD (manual): ${f.name}`, url: URL.createObjectURL(f), mime: f.type });
        }} />
      </label>
    </Panel>
  );
}
