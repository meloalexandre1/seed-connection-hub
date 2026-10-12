/**
 * Browser resumable transfer to an already-authorized Google Drive session URL.
 * The URL is a short-lived upload capability; never log or persist it.
 * No OAuth bearer token is required in browser requests.
 */
type DriveFileCreated = { id: string };

function readCreatedId(response: Response): Promise<string> {
  return response.json().then((data: DriveFileCreated) => {
    if (!data || typeof data.id !== "string" || !/^[\w-]{8,250}$/.test(data.id)) {
      throw new Error("O Google Drive não confirmou o identificador do arquivo.");
    }
    return data.id;
  });
}
function offsetFrom308(response: Response, attemptedOffset: number): number {
  const range = response.headers.get("Range");
  if (!range) {
    if (attemptedOffset === 0) return 0;
    throw new Error("Não foi possível recuperar o progresso do upload no Drive.");
  }
  const m = /^bytes=0-(\d+)$/.exec(range);
  const end = m ? Number(m[1]) + 1 : NaN;
  if (!Number.isSafeInteger(end) || end < 0) {
    throw new Error("O Google Drive retornou um intervalo inválido.");
  }
  return end;
}
function retryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}
function delay(ms: number) { return new Promise<void>(r => setTimeout(r, ms)); }

export async function uploadDriveResumable(
  sessionUrl: string, file: Blob, mime: string,
  transport: typeof fetch = fetch,
  pause: (ms: number) => Promise<void> = delay,
): Promise<string> {
  if (!/^https:\/\/www\.googleapis\.com\/upload\/drive\/v3\/files\?/.test(sessionUrl)) {
    throw new Error("Sessão de upload do Google Drive inválida.");
  }
  if (!file.size) throw new Error("Arquivo vazio não pode ser enviado.");
  const step = 8 * 1024 * 1024; // multiple of 256 KiB
  let offset = 0;
  let retries = 0;
  while (offset < file.size) {
    const end = Math.min(file.size, offset + step);
    try {
      const response = await transport(sessionUrl, {
        method: "PUT",
        headers: {
          "Content-Type": mime,
          "Content-Range": `bytes ${offset}-${end - 1}/${file.size}`,
        },
        body: file.slice(offset, end),
      });
      if (response.status === 200 || response.status === 201) {
        return readCreatedId(response);
      }
      if (response.status === 308) {
        const next = offsetFrom308(response, offset);
        if (next > file.size || next > end || next < offset) {
          throw new Error("O Google Drive informou progresso inconsistente.");
        }
        if (next === offset && ++retries > 3) throw new Error("Upload do Google Drive sem progresso.");
        if (next > offset) retries = 0;
        offset = next;
        continue;
      }
      if (!retryableStatus(response.status)) {
        throw new Error(`Falha permanente no Google Drive (HTTP ${response.status}).`);
      }
    } catch (e) {
      if (e instanceof Error && /Falha permanente|progresso inconsistente|intervalo inválido|sem progresso/.test(e.message)) throw e;
      // An aborted fetch can mean Google received the chunk. Probe before retrying.
    }
    if (++retries > 3) throw new Error("Falha de comunicação. O upload pode ser retomado posteriormente.");
    await pause(retries * 400);
    try {
      const status = await transport(sessionUrl, {
        method: "PUT",
        headers: { "Content-Range": `bytes */${file.size}` },
      });
      if (status.status === 200 || status.status === 201) return readCreatedId(status);
      if (status.status !== 308) {
        if (!retryableStatus(status.status)) throw new Error("Sessão Google Drive inválida ou expirada.");
        continue;
      }
      const next = offsetFrom308(status, offset);
      if (next > file.size || next < offset) throw new Error("Progresso inconsistente ao retomar.");
      offset = next;
    } catch (e) {
      if (e instanceof Error && /inválida|inconsistente/.test(e.message)) throw e;
      if (retries >= 3) throw new Error("Não foi possível consultar o progresso do upload.");
    }
  }
  throw new Error("O arquivo não foi confirmado pelo Google Drive.");
}
