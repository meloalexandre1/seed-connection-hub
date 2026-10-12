import { useState } from "react";
import { Copy, ExternalLink, ShieldAlert, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GOOGLE_OAUTH_CALLBACKS } from "@/lib/integrationRepairInfo";

function Copyable({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }
  return <div className="space-y-1 rounded-lg bg-muted/30 p-2">
    <p className="text-xs font-medium">{label}</p>
    <div className="flex items-start gap-2">
      <code className="min-w-0 flex-1 break-all text-xs">{value}</code>
      <Button type="button" size="sm" variant="outline" onClick={()=>void copy()} aria-label={"Copiar " + label}>
        {copied ? <Check className="size-4"/> : <Copy className="size-4"/>}
      </Button>
    </div>
  </div>;
}

/** Administrative guidance only: no secrets are requested or exposed. */
export function IntegrationRepairGuide() {
  return <li className="rounded-xl border p-3">
    <details className="group">
      <summary className="cursor-pointer text-sm font-semibold">
        <span className="inline-flex items-center gap-2"><ShieldAlert className="size-4 text-warning"/> Corrigir Google e OpenAI — guia seguro</span>
      </summary>
      <div className="mt-3 space-y-4 text-xs text-muted-foreground">
        <section className="space-y-2">
          <p className="font-semibold text-foreground">1 · Agenda — Google bloqueia redirect_uri_mismatch</p>
          <p>No Lovable, abra <strong>Connectors → Google Calendar → App User OAuth client</strong> e identifique qual cliente OAuth foi vinculado. No Google Cloud, edite <strong>esse mesmo Client ID</strong> e adicione exatamente o callback do gateway Lovable:</p>
          <Copyable label="Authorized redirect URI do Calendar via Lovable" value={GOOGLE_OAUTH_CALLBACKS.calendarViaLovable}/>
          <p>O retorno interno <code>/api/oauth/google/return</code> não substitui o callback do gateway Lovable.</p>
        </section>
        <section className="space-y-2">
          <p className="font-semibold text-foreground">2 · Drive — invalid_client</p>
          <p>Em Google Cloud → OAuth Clients, abra o cliente <strong>Web application</strong> destinado ao Drive. Copie seu Client ID e o Client Secret correspondente diretamente para <code>GOOGLE_DRIVE_CLIENT_ID</code> e <code>GOOGLE_DRIVE_CLIENT_SECRET</code> em Cloud → Secrets. Se não possuir o segredo original completo, gere um novo. Atualize a publicação antes de testar.</p>
          <Copyable label="Authorized redirect URI do Drive direto" value={GOOGLE_OAUTH_CALLBACKS.driveDirect}/>
          <Copyable label="Authorized JavaScript origin do Drive" value={GOOGLE_OAUTH_CALLBACKS.origin}/>
          <p>Não altere a chave de criptografia <code>APP_USER_CONNECTION_KEY_SECRET</code> já criada pelo Lovable.</p>
        </section>
        <section className="space-y-2">
          <p className="font-semibold text-foreground">3 · OpenAI — erro 401 na verificação</p>
          <p>Na OpenAI Platform, confirme que a chave nova pertence ao projeto correto e está ativa. Substitua o valor completo de <code>OPENAI_API_KEY</code> em Cloud → Secrets, sem aspas, espaços ou prefixo <code>VITE_</code>. Publique novamente e clique em <strong>Verificar chave sem gerar respostas</strong>. Um erro 401 indica autenticação, não falta de saldo.</p>
          <p>Enquanto <code>SID_AI_PROVIDER</code> não for alterado para <code>openai</code>, o SID continua no provedor Lovable.</p>
        </section>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm"><a target="_blank" rel="noopener noreferrer" href="https://console.cloud.google.com/auth/clients"><ExternalLink className="size-4"/> Google OAuth Clients</a></Button>
          <Button asChild variant="outline" size="sm"><a target="_blank" rel="noopener noreferrer" href="https://platform.openai.com/api-keys"><ExternalLink className="size-4"/> OpenAI API Keys</a></Button>
        </div>
        <p className="font-medium text-foreground">Nunca envie API keys, Client Secrets, refresh tokens ou senhas pelo chat.</p>
      </div>
    </details>
  </li>;
}
