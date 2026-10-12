import {describe,expect,it,vi} from "vitest";
import { createDecipheriv, createECDH, createHmac, createPublicKey, verify } from "node:crypto";
import {allowedEndpoint,encryptedPushMessage,vapidHeader,sendPush} from "./webPushCrypto.server";

const join=(...items:Uint8Array[])=>Buffer.concat(items.map(x=>Buffer.from(x)));
const mac=(key:Uint8Array,body:Uint8Array)=>createHmac("sha256",key).update(body).digest();
const txt=(s:string)=>Buffer.from(s,"utf8");
describe("RFC Web Push service",()=>{
  it("accepts only valid provider HTTPS hosts",()=>{
    expect(allowedEndpoint("https://fcm.googleapis.com/fcm/send/test")).toBe(true);
    expect(allowedEndpoint("https://web.push.apple.com/Q123")).toBe(true);
    expect(allowedEndpoint("https://updates.push.services.mozilla.com/wpush/v2/abc")).toBe(true);
    expect(allowedEndpoint("http://fcm.googleapis.com/send/test")).toBe(false);
    expect(allowedEndpoint("https://fcm.googleapis.com.attacker.test/send")).toBe(false);
    expect(allowedEndpoint("https://127.0.0.1/send")).toBe(false);
  });
  it("produces browser-decryptable RFC8291 ciphertext",async()=>{
    const receiver=createECDH("prime256v1");
    const pub=receiver.generateKeys();
    const secret=Buffer.alloc(16,8);
    const message=JSON.stringify({url:"/tarefas",tag:"test"});
    const encrypted=Buffer.from(await encryptedPushMessage(message,pub.toString("base64url"),secret.toString("base64url")));
    const salt=encrypted.subarray(0,16);
    expect(encrypted.readUInt32BE(16)).toBe(4096);
    expect(encrypted[20]).toBe(65);
    const serverPub=encrypted.subarray(21,86);
    const shared=receiver.computeSecret(serverPub);
    const ikm=mac(mac(secret,shared),join(txt("WebPush: info"),Buffer.from([0]),pub,serverPub,Buffer.from([1])));
    const prk=mac(salt,ikm);
    const cek=mac(prk,join(txt("Content-Encoding: aes128gcm"),Buffer.from([0,1]))).subarray(0,16);
    const nonce=mac(prk,join(txt("Content-Encoding: nonce"),Buffer.from([0,1]))).subarray(0,12);
    const ct=encrypted.subarray(86);
    const dec=createDecipheriv("aes-128-gcm",cek,nonce);
    dec.setAuthTag(ct.subarray(-16));
    const decoded=join(dec.update(ct.subarray(0,-16)),dec.final());
    expect(decoded.at(-1)).toBe(2);
    expect(decoded.subarray(0,-1).toString("utf8")).toBe(message);
  });
  it("generates a verifiable VAPID ES256 JWT",async()=>{
    const ecdh=createECDH("prime256v1");
    const pub=ecdh.generateKeys();
    const header=await vapidHeader("https://fcm.googleapis.com/fcm/send/test",
      pub.toString("base64url"),ecdh.getPrivateKey().toString("base64url"),
      "mailto:support@example.com");
    const token=header.match(/^vapid t=([^,]+), k=/)?.[1];
    expect(token).toBeTruthy();
    const [a,b,sig]=token!.split(".");
    const payload=JSON.parse(Buffer.from(b!,"base64url").toString());
    expect(payload.aud).toBe("https://fcm.googleapis.com");
    const pkey=createPublicKey({key:{
      kty:"EC",crv:"P-256",x:pub.subarray(1,33).toString("base64url"),
      y:pub.subarray(33,65).toString("base64url"),
    },format:"jwk"});
    expect(verify("sha256",txt(a+"."+b),{key:pkey,dsaEncoding:"ieee-p1363"},Buffer.from(sig!,"base64url"))).toBe(true);
  });
  it("sends only encrypted payload and no person names",async()=>{
    const ecdh=createECDH("prime256v1"),ua=createECDH("prime256v1");
    const pub=ecdh.generateKeys();
    const transport=vi.fn().mockResolvedValue(new Response(null,{status:201}));
    const result=await sendPush({
      endpoint:"https://fcm.googleapis.com/fcm/send/test",
      p256dh:ua.generateKeys().toString("base64url"),
      auth:Buffer.alloc(16,4).toString("base64url"),
      publicKey:pub.toString("base64url"),
      privateKey:ecdh.getPrivateKey().toString("base64url"),
      subject:"mailto:support@example.com",
      tag:"task-example",
      transport,
    });
    expect(result).toBe(201);
    expect(transport.mock.calls[0]?.[1].headers["Content-Encoding"]).toBe("aes128gcm");
  });
});
