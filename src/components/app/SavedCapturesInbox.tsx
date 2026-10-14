import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, CheckCircle2, ChevronDown, ChevronUp, ExternalLink, FileText, Loader2, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { liveCaptures } from "@/services/live";
import { CaptureAnalysisPanel } from "@/components/app/CaptureAnalysisPanel";
import { PdfTextPreparation } from "@/components/app/PdfTextPreparation";

/**
 * Saved records are read from Supabase on every page load, not a local queue.
 * No Google, Gmail, OpenAI or paid gateway is required.
 */
export function SavedCapturesInbox() {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const captures = useQuery({ queryKey: ["captures-inbox"], queryFn: liveCaptures.list });
  const reviewed = useMutation({
    mutationFn: liveCaptures.markReviewed,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["captures-inbox"] });
      toast.success("Captura marcada como revisada no banco.");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  async function openFile(id: string, path: string) {
    // Open window before awaiting signed URL to avoid the popup blocker.
    const target = window.open("", "_blank");
    setOpening(id);
    try {
      const url = await liveCaptures.signedDownloadUrl(path);
      if (target) {
        target.opener = null;
        target.location.href = url;
      } else window.location.assign(url);
    } catch(e) {
      target?.close();
      toast.error(e instanceof Error ? e.message : "Não foi possível abrir o arquivo.");
    } finally { setOpening(null); }
  }
  const rows = captures.data ?? [];
  const pending = rows.filter(r => r.status === "revisar").length;
  return (
    <section id="registros-salvos" className="mt-5 rounded-2xl border bg-card p-4 space-y-3" aria-label="Capturas salvas">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 font-semibold"><Archive className="h-4 w-4 text-primary"/> Registros salvos no banco</h2>
          <p className="text-xs text-muted-foreground">Permanecem aqui ao atualizar a página · {pending} aguardando revisão · até 80 registros recentes.</p>
        </div>
        <Button type="button" size="sm" variant="outline" disabled={captures.isFetching}
          onClick={()=>void captures.refetch()}>
          {captures.isFetching?<Loader2 className="h-4 w-4 animate-spin"/>:<RefreshCcw className="h-4 w-4"/>}
          Atualizar
        </Button>
      </div>
      {captures.isError&&<p role="alert" className="text-sm text-destructive">Não foi possível carregar o histórico: {captures.error.message}</p>}
      {captures.isLoading&&<p className="text-sm text-muted-foreground">Consultando seus registros...</p>}
      {!captures.isLoading&&!captures.isError&&rows.length===0&&<p className="text-sm text-muted-foreground">Nenhuma captura salva ainda. Grave um áudio, anexe um arquivo ou escreva uma nota acima.</p>}
      <ul className="space-y-2">
        {rows.map(c=><li key={c.id} className="rounded-xl border p-3 space-y-2">
          <div className="flex gap-3 justify-between">
            <div className="min-w-0 flex-1">
              <p className="break-words text-sm font-semibold">{c.title ?? "Registro sem título"}</p>
              <p className="text-xs text-muted-foreground">
                {c.kind} · {c.status} · {new Date(c.received_at).toLocaleString("pt-BR")}
              </p>
            </div>
            {c.status==="concluido"&&<CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-label="Marcado como revisado"/>}
          </div>
          {c.status==="erro"&&<p role="alert" className="text-xs text-destructive">{c.error ?? "Erro no envio"}</p>}
          <div className="flex flex-wrap gap-2">
            {c.note&&<Button type="button" size="sm" variant="outline" onClick={()=>setExpanded(v=>v===c.id?null:c.id)}>
              <FileText className="h-4 w-4"/>{expanded===c.id?"Ocultar nota":"Ler nota"} {expanded===c.id?<ChevronUp className="h-4 w-4"/>:<ChevronDown className="h-4 w-4"/>}
            </Button>}
            {c.storage_path&&<Button type="button" size="sm" variant="outline" disabled={opening===c.id}
              onClick={()=>void openFile(c.id,c.storage_path!)}>
              <ExternalLink className="h-4 w-4"/> Abrir arquivo privado
            </Button>}
            {c.external_id?.startsWith("gdrive:")&&<span className="text-xs text-muted-foreground self-center">
              Arquivo no Drive — acesso pelo aplicativo ainda em implantação
            </span>}
            {c.status==="revisar"&&<Button type="button" size="sm" disabled={reviewed.isPending}
              onClick={()=>reviewed.mutate(c.id)}>
              <CheckCircle2 className="h-4 w-4"/> Marcar como revisado
            </Button>}
          </div>
          {c.mime==="application/pdf" && c.storage_path && !c.note?.trim() &&
            <PdfTextPreparation captureId={c.id} storagePath={c.storage_path}/>}
          {c.note&&c.note.length>=40&&<CaptureAnalysisPanel captureId={c.id}/>}
          {c.note&&c.note.trim().length>0&&c.note.trim().length<40&&
            <p className="text-xs text-muted-foreground">Texto salvo, mas insuficiente para análise (mínimo 40 caracteres).</p>}
          {c.note&&expanded===c.id&&
            <div className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-muted/40 p-3 text-xs">
              {c.note}
            </div>}
        </li>)}
      </ul>
    </section>
  );
}
