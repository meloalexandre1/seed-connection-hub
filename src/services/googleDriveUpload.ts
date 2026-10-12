import { startDriveCapture, finishDriveCapture } from "@/server/googleDriveStorage";
import { uploadDriveResumable } from "@/services/driveResumable";

/** The short-lived Google upload URL stays in memory and is never logged. */
export async function uploadCaptureToDrive(
  file: Blob,
  kind: "audio" | "video" | "foto" | "arquivo" | "plaud",
  name: string,
  mime: string,
): Promise<string> {
  const { uploadUrl, captureId } = await startDriveCapture({
    data: { name, mime, size: file.size, kind },
  });
  const fileId = await uploadDriveResumable(uploadUrl, file, mime);
  await finishDriveCapture({ data: { captureId, fileId } });
  return captureId;
}
