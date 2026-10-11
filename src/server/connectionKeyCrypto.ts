/**
 * Server-only. Encrypts/decrypts per-user connector connection keys before
 * they are stored in the database. Uses Web Crypto (AES-GCM), which runs on
 * the edge runtime. Never import from browser code.
 */

const b64 = (buf: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(buf as ArrayBuffer)));
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function key(): Promise<CryptoKey> {
  const raw = process.env["APP_USER_CONNECTION_KEY_SECRET"];
  if (!raw) throw new Error("APP_USER_CONNECTION_KEY_SECRET is not set");
  return crypto.subtle.importKey("raw", fromB64(raw), { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

export async function encryptConnectionKey(plaintext: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await key(),
    new TextEncoder().encode(plaintext),
  );
  // iv | ciphertext+tag, base64 — one opaque column value.
  const out = new Uint8Array(iv.length + ct.byteLength);
  out.set(iv, 0);
  out.set(new Uint8Array(ct), iv.length);
  return b64(out);
}

export async function decryptConnectionKey(stored: string): Promise<string> {
  const buf = fromB64(stored);
  const iv = buf.subarray(0, 12);
  const ct = buf.subarray(12);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, await key(), ct);
  return new TextDecoder().decode(pt);
}
