import {
  startDriveCapture,
  finishDriveCapture,
} from "@/server/googleDriveStorage";

/**
 * For a resumable session Google accepts 256 KiB-aligned chunks.
 * Uploads go browser -> Google directly (not through the app server).
 * A failed upload is never reported as complete in Supabase.
 */
export async function uploadCaptureToDrive(file: Blob, kind: "audio" | "video" | "foto" | "arquivo" | "plaud",
  name: string, mime: string): Promise<string> {
  const { uploadUrl, captureId } = await startDriveCapture({
    data: { name, mime, size: file.size, kind },
  });
  const step = 8 * 1024 * 1024;
  let offset = 0;
  let fileId = "";
  while (offset < file.size) {
    const end = Math.min(offset + step, file.size);
    let success = false;
    for (let attempt = 0; attempt < 3 && !success; attempt++) {
      try {
        const r = await fetch(uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": mime,
            "Content-Range": `bytes ${offset}-${end - 1}/${file.size}`,
          },
          body: file.slice(offset, end),
        });
        if (r.status === 200 || r.status === 201) {
          const body = await r.json() as { id?: string };
          if (!body.id) throw new Error("Upload concluído sem identificador de arquivo.");
          fileId = body.id;
          offset = file.size;
          success = true;
        } else if (r.status === 308) {
          const received = r.headers.get("Range");
          if (!received) {
            throw new Error("O Drive não informou o ponto de retomada.");
          } else {
            const match = received.match(/bytes=0-(\d+)/);
            if (!match) throw new Error("Resposta de upload do Drive inválida.");
            offset = Number(match[1]) + 1;
          }
          success = true;
        } else if (r.status >= 500 || r.status === 429) {
          throw new Error("O Google Drive não conseguiu receber o arquivo temporariamente.");
        } else {
          throw new Error("Falha no envio ao Google Drive (HTTP " + r.status + ").");
        }
      } catch (error) {
        if (attempt === 2) throw error;
        await new Promise(resolve => setTimeout(resolve, 400 * (attempt + 1)));
      }
    }
  }
  if (!fileId) throw new Error("O upload não foi confirmado pelo Google Drive.");
  await finishDriveCapture({ data: { captureId, fileId } });
  return captureId;
}
