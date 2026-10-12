// Execute only locally: node scripts/create-vapid.mjs
// DO NOT commit, email, or paste the resulting private key in a chat.
import { createECDH } from "node:crypto";
const ecdh=createECDH("prime256v1");
const publicKey=ecdh.generateKeys().toString("base64url");
const privateKey=ecdh.getPrivateKey().toString("base64url");
console.log("PUSH_VAPID_PUBLIC_KEY = "+publicKey);
console.log("PUSH_VAPID_PRIVATE_KEY = "+privateKey);
console.log("Keep the private key SECRET. You must store it only in GitHub Actions Secrets.");
