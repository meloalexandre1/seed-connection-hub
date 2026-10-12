/** Web Push RFC8291 aes128gcm + RFC8292 VAPID, server-only Node code.
 * Uses native crypto so no paid provider or unpinned runtime dependency.
 */
import { createCipheriv, createECDH, createHmac, createPrivateKey, randomBytes, sign } from "node:crypto";

const enc=(s:string)=>Buffer.from(s,"utf8");
const b64=(b:Uint8Array|string)=>Buffer.from(b).toString("base64url");
const un64=(s:string)=>Buffer.from(s,"base64url");
const concat=(...b:Uint8Array[])=>Buffer.concat(b.map(x=>Buffer.from(x)));
function mac(key:Uint8Array,data:Uint8Array):Buffer {
  return createHmac("sha256",key).update(data).digest();
}
export function validProvider(endpoint:string):boolean {
  try{
    const url=new URL(endpoint);
    return url.protocol==="https:" &&
      !url.username && !url.password &&
      !url.port &&
      ["fcm.googleapis.com","updates.push.services.mozilla.com","web.push.apple.com"].includes(url.hostname) &&
      url.pathname.length>1;
  }catch{return false;}
}
export function encryptPush(payload:string,receiverKey:string,authSecret:string) {
  const ua=un64(receiverKey);
  const auth=un64(authSecret);
  if(ua.length!==65||ua[0]!==4||auth.length!==16)throw new Error("Invalid push subscription key.");
  const dh=createECDH("prime256v1");
  const serverPublic=dh.generateKeys();
  const secret=dh.computeSecret(ua);
  const ikm=mac(mac(auth,secret),concat(enc("WebPush: info"),Buffer.from([0]),ua,serverPublic,Buffer.from([1])));
  const salt=randomBytes(16);
  const prk=mac(salt,ikm);
  const cek=mac(prk,concat(enc("Content-Encoding: aes128gcm"),Buffer.from([0,1]))).subarray(0,16);
  const nonce=mac(prk,concat(enc("Content-Encoding: nonce"),Buffer.from([0,1]))).subarray(0,12);
  const message=concat(enc(payload),Buffer.from([2]));
  if(message.length+16>=4096)throw new Error("Push payload is too large.");
  const cipher=createCipheriv("aes-128-gcm",cek,nonce);
  const encrypted=concat(cipher.update(message),cipher.final(),cipher.getAuthTag());
  const header=Buffer.alloc(16+4+1);
  salt.copy(header,0);
  header.writeUInt32BE(4096,16);
  header[20]=serverPublic.length;
  return concat(header,serverPublic,encrypted);
}
export function vapidAuth(endpoint:string,publicKey:string,privateKey:string,subject:string,now=Date.now()) {
  if(!validProvider(endpoint))throw new Error("Unapproved push service endpoint.");
  const pub=un64(publicKey);
  const priv=un64(privateKey);
  if(pub.length!==65||pub[0]!==4||priv.length!==32)throw new Error("Invalid VAPID key.");
  if(!(/^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/.test(subject)||/^https:\/\//.test(subject)))
    throw new Error("VAPID contact subject not configured.");
  const key=createPrivateKey({key:{
    kty:"EC",crv:"P-256",x:b64(pub.subarray(1,33)),y:b64(pub.subarray(33,65)),d:b64(priv),
  },format:"jwk"});
  const jwtHeader=b64(enc(JSON.stringify({typ:"JWT",alg:"ES256"})));
  const claims=b64(enc(JSON.stringify({aud:new URL(endpoint).origin,exp:Math.floor(now/1000)+3600,sub:subject})));
  const signingInput=jwtHeader+"."+claims;
  const signature=sign("sha256",enc(signingInput),{key,dsaEncoding:"ieee-p1363"});
  return "vapid t="+signingInput+"."+b64(signature)+", k="+publicKey;
}
export async function sendWebPush(opts:{
  endpoint:string,p256dh:string,auth:string,publicKey:string,privateKey:string,subject:string,tag:string;
  transport?:typeof fetch;
}):Promise<number>{
  if(!validProvider(opts.endpoint))throw new Error("Push destination not allowed.");
  const message=JSON.stringify({url:"/tarefas",tag:opts.tag.slice(0,90)});
  const body=encryptPush(message,opts.p256dh,opts.auth);
  const r=await (opts.transport??fetch)(opts.endpoint,{
    method:"POST",
    headers:{
      "Authorization":vapidAuth(opts.endpoint,opts.publicKey,opts.privateKey,opts.subject),
      "Content-Encoding":"aes128gcm",
      "Content-Type":"application/octet-stream",
      "TTL":"3600",
      "Urgency":"normal",
    },body:new Uint8Array(body),
    signal:AbortSignal.timeout(15000),
  });
  return r.status;
}
