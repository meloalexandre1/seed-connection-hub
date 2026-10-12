import { startDriveCapture, finishDriveCapture } from "@/lib/googleDriveStorage.functions";
import { uploadDriveResumable } from "@/services/driveResumable";

/** The short-lived Google upload URL stays in memory and is never logged. */
export async function uploadCaptureToDrive(
  file: Blob,
  kind: "audio" | "video" | "foto" | "arquivo" | "plaud",
  name: string,
  mime: string,
): Promise<string> {
  // MediaRecorder may supply a codec parameter, e.g. audio/webm;codecs=opus.
  // Google Drive metadata uses a canonical MIME type without parameters.
  const canonicalMime = mime.split(";")[0]?.trim().toLowerCase() ?? "";
  const { uploadUrl, captureId } = await startDriveCapture({
    data: { name, mime: canonicalMime, size: file.size, kind },
  });
  const fileId = await uploadDriveResumable(uploadUrl, file, canonicalMime);
  await finishDriveCapture({ data: { captureId, fileId } });
  return captureId;
}
