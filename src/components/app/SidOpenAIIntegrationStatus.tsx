import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BrainCircuit, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { sidOpenAIStatus, verifySidOpenAIKey } from "@/lib/sidOpenAISetup.functions";

export function SidOpenAIIntegrationStatus() {
  const status = useQuery({ queryKey: ["sid-openai-setup"], queryFn: () => sidOpenAIStatus() });
  const [testing, setTesting] = useState(false);
  const s = status.data;
  async function verify() {
    setTesting(true);
    try {
      const result = await verifySidOpenAIKey();
      if (result.ok) toast.success(result.reason);
      else toast.warning(result.reason);
    } catch {
      toast.error("Não foi possível verificar a conexão.");
    } finally {
      setTesting(false);
    }
  }
  return <li className="flex flex-col gap-2 rounded-xl border p-3">
    <div className="flex items-start gap-3">
      <BrainCircuit className="h-5 w-5 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">SID — OpenAI API</p>
        {status.isLoading ? <p className="text-xs text-muted-foreground">Verificando configuração...</p> :
        status.isError ? <p role="alert" className="text-xs text-destructive">Falha ao verificar o serviço.</p> :
        <>
          <p className="text-xs text-muted-foreground">Provedor usado pelo SID: <strong>{s?.provider === "openai" ? "OpenAI direta" : "Lovable (atual)"}</strong></p>
          <p className="text-xs text-muted-foreground">Chave OpenAI: <strong>{s?.keyConfigured ? "cadastrada no servidor" : "não cadastrada"}</strong> · Modelo: {s?.model}</p>
        </>}
      </div>
    </div>
    <div className="flex flex-wrap gap-2">
      {s?.isAdmin && <Button size="sm" disabled={testing || !s.keyConfigured} onClick={()=>void verify()}>
        {testing && <Loader2 className="h-4 w-4 animate-spin" />} Verificar chave sem gerar respostas
      </Button>}
      <Button asChild size="sm" variant="outline"><a href="https://platform.openai.com/usage" target="_blank" rel="noopener noreferrer">Ver consumo na OpenAI</a></Button>
    </div>
    <p className="text-xs text-muted-foreground">A verificação consulta os metadados do modelo, sem gerar texto nem consumir tokens de inferência. Não confirma saldo. Salvar a chave não muda o provedor: a troca depende de ativar SID_AI_PROVIDER=openai após homologação.</p>
  </li>;
}
