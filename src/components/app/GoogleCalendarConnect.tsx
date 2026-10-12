import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck, Loader2, Unplug } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  completeGoogleCalendarConnection,
  disconnectGoogleCalendar,
  googleCalendarStatus,
  startGoogleCalendarConnect,
} from "@/lib/googleCalendar.functions";

const CONNECTOR_ID = "google_calendar";

function waitForOAuthCompletion(popup: Window) {
  return new Promise<string | null>((resolve, reject) => {
    let poll: number | undefined;
    const cleanup = () => {
      window.removeEventListener("message", onMessage);
      if (poll !== undefined) window.clearInterval(poll);
    };
    const onMessage = (event: MessageEvent) => {
      const type = event.data?.type;
      if (
        event.origin !== window.location.origin ||
        event.source !== popup ||
        event.data?.connectorId !== CONNECTOR_ID ||
        (type !== "appUserConnectorOAuthComplete" && type !== "appUserConnectorOAuthFailed")
      )
        return;
      cleanup();
      if (type === "appUserConnectorOAuthComplete") {
        resolve(typeof event.data?.code === "string" ? event.data.code : null);
        return;
      }
      popup.close();
      reject(new Error("A conexão com o Google não foi concluída."));
    };
    window.addEventListener("message", onMessage);
    poll = window.setInterval(() => {
      if (!popup.closed) return;
      cleanup();
      reject(new Error("Janela do Google fechada antes de concluir."));
    }, 500);
  });
}

export function GoogleCalendarConnect() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const status = useQuery({
    queryKey: ["google-calendar-status"],
    queryFn: () => googleCalendarStatus(),
  });

  const connect = async () => {
    const popup = window.open("", "lovable-oauth", "width=600,height=720");
    if (!popup) {
      toast.error("Pop-up bloqueado. Permita pop-ups e tente de novo.");
      return;
    }
    setBusy(true);
    try {
      const { authorizationUrl } = await startGoogleCalendarConnect();
      const completion = waitForOAuthCompletion(popup);
      popup.location.href = authorizationUrl;
      const code = await completion;
      if (code) await completeGoogleCalendarConnection({ data: { code } });
      await qc.invalidateQueries({ queryKey: ["google-calendar-status"] });
      await qc.invalidateQueries({ queryKey: ["google-events"] });
      toast.success("Google Agenda conectado.");
    } catch (e) {
      popup.close();
      toast.error(e instanceof Error ? e.message : "Falha ao conectar o Google Agenda.");
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setBusy(true);
    try {
      await disconnectGoogleCalendar();
      await qc.invalidateQueries({ queryKey: ["google-calendar-status"] });
      await qc.invalidateQueries({ queryKey: ["google-events"] });
      toast.success("Google Agenda desconectado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao desconectar.");
    } finally {
      setBusy(false);
    }
  };

  const connected = status.data?.connected === true;
  const reconnect = status.data && "reconnectRequired" in status.data && status.data.reconnectRequired;

  return (
    <li className="flex gap-3 rounded-xl border p-3">
      <CalendarCheck className="h-5 w-5 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">
          Google Agenda{" "}
          <span
            className={
              connected
                ? "ml-1 rounded-full border border-lime-line px-2 py-0.5 text-[10px] font-medium text-primary"
                : "ml-1 rounded-full border px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
            }
          >
            {connected ? "conectado" : "não conectado"}
          </span>
        </p>
        <p className="text-xs text-muted-foreground">
          {connected
            ? `Sua agenda pessoal aparece na tela Agenda (${status.data?.calendars?.length ?? 0} calendários).`
            : reconnect
              ? "Seu acesso ao Google precisa ser renovado."
              : "Cada pessoa conecta a própria conta Google. Nada é compartilhado com o time."}
        </p>
      </div>
      <Button
        size="sm"
        variant={connected ? "secondary" : "default"}
        disabled={busy || status.isLoading}
        onClick={() => void (connected ? disconnect() : connect())}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : connected ? (
          <>
            <Unplug className="h-4 w-4" /> Desconectar
          </>
        ) : reconnect ? (
          "Reconectar"
        ) : (
          "Conectar"
        )}
      </Button>
    </li>
  );
}
