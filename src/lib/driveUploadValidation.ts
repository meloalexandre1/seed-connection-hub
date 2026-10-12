/**
 * Pure server-side checks for Drive file ownership and the configured folder.
 * Capture metadata is saved before upload; Drive appProperties bind the
 * uploaded file to that exact capture and authenticated user.
 */
export const SEED_DRIVE_FOLDER_ID = "1jaWPGrByJdqDk5xXp5gBso0h-YSLug1c";
export const MAX_UPLOAD_BYTES = 1024 * 1024 * 1024;

export function cleanUploadName(name: string): string {
  const result = name.trim().replace(/[\\/\x00-\x1f\x7f]/g, "_").slice(0, 180);
  if (!result || result === "." || result === "..") throw new Error("Nome de arquivo inválido.");
  return result;
}

export function isAllowedDriveMime(mime: string): boolean {
  // Allow only formats explicitly supported by the capture interface.
  return /^(audio\/(mp3|mpeg|mp4|ogg|wav|webm|x-wav|aac|aacp|flac|3gpp)|video\/(mp4|quicktime|webm|x-matroska)|image\/(jpeg|png|webp|heic|heif)|application\/(pdf|msword|vnd\.ms-excel|vnd\.openxmlformats-officedocument\.(wordprocessingml\.document|spreadsheetml\.sheet))|text\/(plain|csv))$/.test(mime);
}

export interface UploadedDriveFile {
  id: string;
  size?: string;
  mimeType?: string;
  parents?: string[];
  trashed?: boolean;
  appProperties?: Record<string, string> | undefined;
}

export function verifyUploadedDriveFile(
  file: UploadedDriveFile,
  capture: { id: string; owner_id: string; mime: string | null; size_bytes: number | string | null },
): void {
  const proof = file.appProperties;
  if (
    file.trashed ||
    !file.parents?.includes(SEED_DRIVE_FOLDER_ID) ||
    proof?.["seedCaptureId"] !== capture.id ||
    proof?.["seedOwnerId"] !== capture.owner_id ||
    !Number.isSafeInteger(Number(file.size)) ||
    Number(file.size) !== Number(capture.size_bytes) ||
    file.mimeType !== capture.mime
  ) {
    throw new Error("Arquivo não corresponde ao upload autorizado. Nenhum registro foi concluído.");
  }
}
