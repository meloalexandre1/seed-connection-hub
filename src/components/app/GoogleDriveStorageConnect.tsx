import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { HardDrive, Loader2, FolderOpen, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { describeGoogleDrivePopupError } from "@/lib/googleOAuthDiagnostics";
import {
  startGoogleDriveConnect, completeGoogleDriveConnect,
  googleDriveStorageStatus, googleDrivePickerCredentials,
} from "@/lib/googleDriveStorage.functions";

const TARGET = "https://drive.google.com/drive/folders/1jaWPGrByJdqDk5xXp5gBso0h-YSLug1c";

type PickerGlobal = {
  load: (name: string, cb: { callback: () => void; onerror?: () => void }) => void;
  picker: {
    DocsView: new (view: string) => {
      setSelectFolderEnabled: (v: boolean) => unknown;
    };
    ViewId: { FOLDERS: string };
    PickerBuilder: new () => {
      addView: (v: unknown) => any;
      setOAuthToken: (v: string) => any;
      setDeveloperKey: (v: string) => any;
      setAppId: (v: string) => any;
      setCallback: (cb: (event: any) => void) => any;
      build: () => { setVisible: (v: boolean) => void };
    };
  };
};
declare global { interface Window { google?: PickerGlobal } }

async function loadPicker() {
  if (!window.google) await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://apis.google.com/js/api.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Não foi possível carregar o seletor de pastas do Google."));
    document.head.appendChild(script);
  });
  await new Promise<void>((resolve, reject) => window.google!.load("picker", {
    callback: resolve, onerror: () => reject(new Error("O seletor do Google Drive falhou ao iniciar.")),
  }));
}

function waitForGooglePopup(popup: Window): Promise<{ code: string; state: string }> {
  return new Promise((resolve, reject) => {
    let finished = false;
    const cleanup = () => {
      window.removeEventListener("message", onMessage);
      window.clearInterval(interval);
    };
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== location.origin || event.source !== popup ||
          event.data?.type !== "seedGoogleDriveOAuth") return;
      finished = true;
      cleanup();
      if (event.data.error || !event.data.code || !event.data.state) {
        reject(new Error(describeGoogleDrivePopupError(String(event.data.error ?? ""))));
      } else resolve({ code: event.data.code, state: event.data.state });
    };
    const interval = window.setInterval(() => {
      if (finished || !popup.closed) return;
      cleanup(); reject(new Error("A janela do Google Drive foi fechada."));
    }, 400);
    window.addEventListener("message", onMessage);
  });
}

export function GoogleDriveStorageConnect() {
  const qc = useQueryClient();
  const [working, setWorking] = useState(false);
  const status = useQuery({ queryKey: ["google-drive-storage"], queryFn: () => googleDriveStorageStatus() });

  const connect = async () => {
    const popup = window.open("", "seed-google-drive", "width=620,height=760");
    if (!popup) { toast.error("Permita pop-ups para conectar o Drive."); return; }
    setWorking(true);
    try {
      const result = await startGoogleDriveConnect();
      const waiting = waitForGooglePopup(popup);
      popup.location.href = result.authorizationUrl;
      const { code, state } = await waiting;
      await completeGoogleDriveConnect({ data: { code, state } });
      await qc.invalidateQueries({ queryKey: ["google-drive-storage"] });
      toast.success("Conta Google autorizada. Verifique a permissão de acesso à pasta.");
    } catch (error) {
      popup.close();
      toast.error(error instanceof Error ? error.message : "Erro ao conectar o Google Drive.");
    } finally { setWorking(false); }
  };

  const pickFolder = async () => {
    setWorking(true);
    try {
      const { token, developerKey, appId, folderId } = await googleDrivePickerCredentials();
      await loadPicker();
      const picker = window.google!.picker;
      const view = new picker.DocsView(picker.ViewId.FOLDERS);
      view.setSelectFolderEnabled(true);
      new picker.PickerBuilder()
        .addView(view)
        .setOAuthToken(token)
        .setDeveloperKey(developerKey)
        .setAppId(appId)
        .setCallback((event: { action?: string; docs?: { id: string }[] }) => {
          if (event.action === "picked") {
            if (event.docs?.[0]?.id !== folderId) {
              toast.error("Selecione a pasta Seed Connection — Arquivos, não outra pasta.");
              return;
            }
            toast.success("Pasta selecionada. Verificando autorização...");
            void qc.invalidateQueries({ queryKey: ["google-drive-storage"] });
          }
        })
        .build().setVisible(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível abrir a seleção de pastas.");
    } finally { setWorking(false); }
  };

  const s = status.data;
  return (
    <li className="flex flex-col gap-2 rounded-xl border p-3">
      <div className="flex items-start gap-3">
        <HardDrive className="h-5 w-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Google Drive — armazenamento de arquivos</p>
          <p className="text-xs text-muted-foreground">Destino: Seed Connection — Arquivos (sua pasta existente, privada).</p>
          <p className="mt-1 text-xs font-medium">
            {status.isLoading ? "Conferindo conexão..." :
              s?.folderReady ? (s.enabled ? "Conectado · uploads no Drive ativos" : "Autorizado · aguardando habilitação dos uploads") :
              !s?.configured ? "Aguardando OAuth do Google no servidor" :
              s?.connected ? "Conta conectada; falta selecionar ou autorizar a pasta" :
              "Aguardando sua autorização Google"}
          </p>
        </div>
      </div>
      {status.isError && <p role="alert" className="text-xs text-destructive">Não foi possível verificar a conexão.</p>}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" asChild><a href={TARGET} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4"/> Abrir pasta</a></Button>
        {s?.isAdmin && s.configured && !s.connected && <Button size="sm" disabled={working} onClick={()=>void connect()}>{working&&<Loader2 className="h-4 w-4 animate-spin"/>} Autorizar Google</Button>}
        {s?.isAdmin && s.configured && s.connected && !s.folderReady && <Button size="sm" disabled={working} onClick={()=>void pickFolder()}><FolderOpen className="h-4 w-4"/> Selecionar esta pasta</Button>}
      </div>
      <p className="text-xs text-muted-foreground">
        Até o administrador ativar os uploads após os testes, os novos arquivos continuam no Supabase. A conexão do ChatGPT ao Drive não concede acesso automático ao aplicativo.
      </p>
    </li>
  );
}
