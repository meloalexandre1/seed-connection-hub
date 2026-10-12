import { describe, expect, it } from "vitest";
import { MAX_UPLOAD_BYTES, cleanUploadName, isAllowedDriveMime, verifyUploadedDriveFile, SEED_DRIVE_FOLDER_ID } from "./driveUploadValidation";

describe("Drive upload trust boundary", () => {
  const capture = { id: "11111111-1111-1111-1111-111111111111", owner_id: "22222222-2222-2222-2222-222222222222", size_bytes: 7, mime: "application/pdf" };
  const file = {
    id: "1234567890driveABC",
    size: "7",
    mimeType: "application/pdf",
    parents: [SEED_DRIVE_FOLDER_ID],
    trashed: false,
    appProperties: { seedCaptureId: capture.id, seedOwnerId: capture.owner_id },
  };
  it("accepts a file with matching owner, capture and folder", () => {
    expect(() => verifyUploadedDriveFile(file, capture)).not.toThrow();
  });
  it.each([
    [{...file, appProperties: {...file.appProperties, seedCaptureId: "someone-else"}}, "capture id"],
    [{...file, appProperties: {...file.appProperties, seedOwnerId: "someone-else"}}, "owner"],
    [{...file, parents: ["other-folder"]}, "folder"],
    [{...file, size: "8"}, "size"],
    [{...file, mimeType: "image/png"}, "mime"],
    [{...file, trashed: true}, "trashed"],
    [{...file, appProperties: undefined}, "unbound file"],
  ])("rejects wrong file binding (%s / %s)", (wrong, _label) => {
    expect(() => verifyUploadedDriveFile(wrong, capture)).toThrow(/autorizado/);
  });
  it("normalizes a risky file name without allowing path separators", () => {
    expect(cleanUploadName("../client\\secret.pdf")).toBe(".._client_secret.pdf");
    expect(() => cleanUploadName("  ")).toThrow();
  });
  it("whitelists supported document, photo and audio MIME types", () => {
    expect(isAllowedDriveMime("application/pdf")).toBe(true);
    expect(isAllowedDriveMime("audio/webm")).toBe(true);
    expect(isAllowedDriveMime("image/png")).toBe(true);
    expect(isAllowedDriveMime("application/x-msdownload")).toBe(false);
    expect(isAllowedDriveMime("text/html")).toBe(false);
    expect(MAX_UPLOAD_BYTES).toBe(1073741824);
  });
});
