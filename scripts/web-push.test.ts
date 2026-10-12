import { describe, expect, it, vi } from "vitest";
import { createDecipheriv, createECDH, createHmac, createPublicKey, verify } from "node:crypto";
import { encryptPush, validProvider, vapidAuth, sendWebPush } from "./web-push";

function hmac(key:Uint8Array,input:Uint8Array){return createHmac("sha256",key).update(input).digest();}
const concat=(...xs:Uint8Array[])=>Buffer.concat(xs.map(x=>Buffer.from(x)));
const text=(s:string)=>Buffer.from(s,"utf8");

describe("Web Push RFC8291/RFC8292 implementation",()=>{
  it("validates exact HTTPS provider hosts, rejects SSRF attempts",()=>{
    expect(validProvider("https://fcm.googleapis.com/fcm/send/abcd")).toBe(true);
    expect(validProvider("https://web.push.apple.com/abcdef")).toBe(true);
    expect(validProvider("https://updates.push.services.mozilla.com/wpush/v2/test")).toBe(true);
    expect(validProvider("https://fcm.googleapis.com.attacker.test/send")).toBe(false);
    expect(validProvider("http://fcm.googleapis.com/fcm/send/abcd")).toBe(false);
    expect(validProvider("https://evil.test/path")).toBe(false);
  });
  it("encrypts message with a decryptable Web Push aes128gcm body",()=>{
    const receiver=createECDH("prime256v1");
    const clientPublic=receiver.generateKeys();
    const auth=Buffer.alloc(16,9);
    const plaintext=JSON.stringify({url:"/tarefas",tag:"task:example"});
    const payload=encryptPush(plaintext,clientPublic.toString("base64url"),auth.toString("base64url"));
    const salt=payload.subarray(0,16);
    expect(payload.readUInt32BE(16)).toBe(4096);
    expect(payload[20]).toBe(65);
    const serverPublic=payload.subarray(21,86);
    const secret=receiver.computeSecret(serverPublic);
    const ikm=hmac(hmac(auth,secret),concat(text("WebPush: info"),Buffer.from([0]),clientPublic,serverPublic,Buffer.from([1])));
    const prk=hmac(salt,ikm);
    const cek=hmac(prk,concat(text("Content-Encoding: aes128gcm"),Buffer.from([0,1]))).subarray(0,16);
    const nonce=hmac(prk,concat(text("Content-Encoding: nonce"),Buffer.from([0,1]))).subarray(0,12);
    const ciphertext=payload.subarray(86);
    const dec=createDecipheriv("aes-128-gcm",cek,nonce);
    dec.setAuthTag(ciphertext.subarray(-16));
    const decrypted=concat(dec.update(ciphertext.subarray(0,-16)),dec.final());
    expect(decrypted.at(-1)).toBe(2);
    expect(decrypted.subarray(0,-1).toString("utf8")).toBe(plaintext);
  });
  it("signs a verifiable ES256 VAPID JWT",()=>{
    const vapid=createECDH("prime256v1");
    const pub=vapid.generateKeys();
    const privateKey=vapid.getPrivateKey();
    const publicKey=pub.toString("base64url");
    const header=vapidAuth("https://fcm.googleapis.com/fcm/send/example",publicKey,privateKey.toString("base64url"),"mailto:test@example.com",Date.UTC(2026,9,12));
    const match=header.match(/^vapid t=([^,]+), k=(.+)$/);
    expect(match).not.toBeNull();
    const token=match![1]!;
    const [hdr,body,signature]=token.split(".");
    const claims=JSON.parse(Buffer.from(body!,"base64url").toString("utf8"));
    expect(claims.aud).toBe("https://fcm.googleapis.com");
    expect(claims.exp).toBe(Math.floor(Date.UTC(2026,9,12)/1000)+3600);
    const pkey=createPublicKey({key:{
      kty:"EC",crv:"P-256",x:pub.subarray(1,33).toString("base64url"),y:pub.subarray(33,65).toString("base64url")
    },format:"jwk"});
    expect(verify("sha256",text(hdr+"."+body),{key:pkey,dsaEncoding:"ieee-p1363"},Buffer.from(signature!,"base64url"))).toBe(true);
  });
  it("sends encrypted data only to the approved push provider",async()=>{
    const vapid=createECDH("prime256v1"),receiver=createECDH("prime256v1");
    const publicKey=vapid.generateKeys().toString("base64url");
    const privateKey=vapid.getPrivateKey().toString("base64url");
    const ua=receiver.generateKeys();
    const f=vi.fn().mockResolvedValue(new Response(null,{status:201}));
    const status=await sendWebPush({
      endpoint:"https://fcm.googleapis.com/fcm/send/test",p256dh:ua.toString("base64url"),
      auth:Buffer.alloc(16,5).toString("base64url"),publicKey,privateKey,
      subject:"mailto:test@example.com",tag:"test",transport:f,
    });
    expect(status).toBe(201);
    expect(f.mock.calls[0]?.[1].headers["Content-Encoding"]).toBe("aes128gcm");
    expect(JSON.stringify(f.mock.calls[0]?.[1].body)).not.toContain("/tarefas");
  });
});
