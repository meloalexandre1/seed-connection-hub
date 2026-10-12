/** RFC 8291 & 8292 Web Push, portable to Cloudflare WebCrypto.
 * Runs only on the server. No external push SaaS or Node crypto dependency.
 */
const te=new TextEncoder();
const text=(value:string)=>te.encode(value);
const concat=(...parts:Uint8Array[])=>{
  const size=parts.reduce((n,p)=>n+p.byteLength,0);
  const bytes=new Uint8Array(size);let index=0;
  for(const p of parts){bytes.set(p,index);index+=p.byteLength;}
  return bytes;
};
const un64=(s:string)=>Uint8Array.from(atob(s.replace(/-/g,"+").replace(/_/g,"/").padEnd(Math.ceil(s.length/4)*4,"=")),c=>c.charCodeAt(0));
const b64=(bytes:Uint8Array)=>btoa(Array.from(bytes, b=>String.fromCharCode(b)).join(""))
  .replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
async function hmac(key:Uint8Array,data:Uint8Array):Promise<Uint8Array>{
  const imported=await crypto.subtle.importKey("raw",key as BufferSource,{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC",imported,data as BufferSource));
}
export function allowedEndpoint(endpoint:string):boolean{
  try{const u=new URL(endpoint);
    return u.protocol==="https:" && !u.username && !u.password && !u.port &&
      ["fcm.googleapis.com","updates.push.services.mozilla.com","web.push.apple.com"].includes(u.hostname) &&
      u.pathname.length>1;
  }catch{return false;}
}
export async function encryptedPushMessage(
  message:string,receiverP256dh:string,receiverAuth:string,
):Promise<Uint8Array>{
  const ua=un64(receiverP256dh),auth=un64(receiverAuth);
  if(ua.length!==65||ua[0]!==4||auth.length!==16)throw new Error("Invalid push subscription");
  const keys=await crypto.subtle.generateKey({name:"ECDH",namedCurve:"P-256"},true,["deriveBits"]);
  const asPub=new Uint8Array(await crypto.subtle.exportKey("raw",keys.publicKey));
  const uaPublic=await crypto.subtle.importKey("raw",ua as BufferSource,{name:"ECDH",namedCurve:"P-256"},false,[]);
  const shared=new Uint8Array(await crypto.subtle.deriveBits({name:"ECDH",public:uaPublic},keys.privateKey,256));
  const ikm=await hmac(await hmac(auth,shared),concat(text("WebPush: info"),new Uint8Array([0]),ua,asPub,new Uint8Array([1])));
  const salt=crypto.getRandomValues(new Uint8Array(16));
  const prk=await hmac(salt,ikm);
  const cek=(await hmac(prk,concat(text("Content-Encoding: aes128gcm"),new Uint8Array([0,1])))).slice(0,16);
  const nonce=(await hmac(prk,concat(text("Content-Encoding: nonce"),new Uint8Array([0,1])))).slice(0,12);
  const plaintext=concat(text(message),new Uint8Array([2]));
  if(plaintext.length+16>=4096)throw new Error("Push too large");
  const aes=await crypto.subtle.importKey("raw",cek as BufferSource,{name:"AES-GCM"},false,["encrypt"]);
  const ciphertext=new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv:nonce as BufferSource},aes,plaintext as BufferSource));
  const header=new Uint8Array(21);
  header.set(salt);
  new DataView(header.buffer).setUint32(16,4096,false);
  header[20]=65;
  return concat(header,asPub,ciphertext);
}
export async function vapidHeader(endpoint:string,publicKey:string,privateKey:string,subject:string):Promise<string>{
  if(!allowedEndpoint(endpoint))throw new Error("Push endpoint refused");
  const pub=un64(publicKey),privateScalar=un64(privateKey);
  if(pub.length!==65||pub[0]!==4||privateScalar.length!==32)throw new Error("Invalid VAPID keys");
  if(!/^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/.test(subject))throw new Error("Invalid VAPID subject");
  const key=await crypto.subtle.importKey("jwk",{
    kty:"EC",crv:"P-256",x:b64(pub.slice(1,33)),y:b64(pub.slice(33,65)),
    d:b64(privateScalar),ext:false,key_ops:["sign"],
  },{name:"ECDSA",namedCurve:"P-256"},false,["sign"]);
  const header=b64(text(JSON.stringify({typ:"JWT",alg:"ES256"})));
  const claims=b64(text(JSON.stringify({
    aud:new URL(endpoint).origin,exp:Math.floor(Date.now()/1000)+3600,sub:subject,
  })));
  const body=header+"."+claims;
  const signature=new Uint8Array(await crypto.subtle.sign({name:"ECDSA",hash:"SHA-256"},key,text(body) as BufferSource));
  return "vapid t="+body+"."+b64(signature)+", k="+publicKey;
}
export async function sendPush(req:{
  endpoint:string,p256dh:string,auth:string,
  publicKey:string,privateKey:string,subject:string,tag:string,
  transport?:typeof fetch,
}):Promise<number>{
  if(!allowedEndpoint(req.endpoint))throw new Error("Push endpoint refused");
  const body=await encryptedPushMessage(JSON.stringify({
    tag:req.tag.slice(0,96),url:"/tarefas",
  }),req.p256dh,req.auth);
  const res=await (req.transport??fetch)(req.endpoint,{
    method:"POST",
    headers:{
      Authorization:await vapidHeader(req.endpoint,req.publicKey,req.privateKey,req.subject),
      "Content-Encoding":"aes128gcm",
      "Content-Type":"application/octet-stream",
      TTL:"3600",
      Urgency:"normal",
    },
    body:body as BodyInit,
    signal:AbortSignal.timeout(15000),
  });
  return res.status;
}
