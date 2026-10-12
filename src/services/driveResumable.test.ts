import { describe, expect, it, vi } from "vitest";
import { uploadDriveResumable } from "./driveResumable";

const url = "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&upload_id=test";
const blob = new Blob([new Uint8Array(12)], { type: "application/pdf" });
const created = () => new Response(JSON.stringify({ id: "drive-file-123456789" }), {status: 200});
const incomplete = (n: number) => new Response(null, {status: 308, headers: {"Range": `bytes=0-${n}`}});

describe("Drive resumable browser uploader", () => {
  it("sends a small file and returns Google file id", async () => {
    const transport = vi.fn().mockResolvedValue(created());
    const id = await uploadDriveResumable(url, blob, "application/pdf", transport, async () => {});
    expect(id).toBe("drive-file-123456789");
    expect(transport.mock.calls[0][1].headers["Content-Range"]).toBe("bytes 0-11/12");
    expect(transport).toHaveBeenCalledTimes(1);
  });
  it("probes upload progress following uncertain network failure", async () => {
    const transport = vi.fn()
      .mockRejectedValueOnce(new Error("network lost"))
      .mockResolvedValueOnce(incomplete(4)) // Google already has 5 bytes
      .mockResolvedValueOnce(created());
    const id = await uploadDriveResumable(url, blob, "application/pdf", transport, async () => {});
    expect(id).toBe("drive-file-123456789");
    expect(transport.mock.calls[1][1].headers["Content-Range"]).toBe("bytes */12");
    expect(transport.mock.calls[2][1].headers["Content-Range"]).toBe("bytes 5-11/12");
  });
  it("rejects a permanent auth or permission error without retrying", async () => {
    const transport = vi.fn().mockResolvedValue(new Response(null,{status: 403}));
    await expect(uploadDriveResumable(url, blob, "application/pdf", transport, async () => {}))
      .rejects.toThrow(/permanente/);
    expect(transport).toHaveBeenCalledTimes(1);
  });
  it("rejects a different endpoint to avoid leaking upload capabilities", async () => {
    await expect(uploadDriveResumable("https://attacker.example/upload",blob,"application/pdf"))
      .rejects.toThrow(/inválida/);
  });
  it("never loops indefinitely if Google reports no progress", async () => {
    const transport = vi.fn().mockResolvedValue(new Response(null, {status: 308}));
    await expect(uploadDriveResumable(url,blob,"application/pdf",transport,async()=>{}))
      .rejects.toThrow(/sem progresso/);
    expect(transport.mock.calls.length).toBeLessThanOrEqual(5);
  });
  it("recovers even if completion reply was lost", async () => {
    const transport=vi.fn().mockRejectedValueOnce(new Error("timeout")).mockResolvedValueOnce(created());
    await expect(uploadDriveResumable(url,blob,"application/pdf",transport,async()=>{}))
      .resolves.toBe("drive-file-123456789");
    expect(transport).toHaveBeenCalledTimes(2);
  });
});
