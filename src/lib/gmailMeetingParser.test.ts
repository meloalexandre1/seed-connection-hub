import {describe,expect,it} from "vitest";
import {assembleMeetingCapture,decodeGmailBase64Url,extractPlainGmailBody,normalizeMeetingTitle} from "./gmailMeetingParser";

describe("Gmail/Gemini summary intake",()=>{
  it("decodes Portuguese text from base64url safely",()=>{
    const original="Reunião do Gemini: ação necessária";
    const data=btoa(String.fromCharCode(...new TextEncoder().encode(original))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
    expect(decodeGmailBase64Url(data)).toBe(original);
  });
  it("ignores HTML and attachments rather than storing executable markup",()=>{
    expect(extractPlainGmailBody({mimeType:"text/html",body:{data:"PGJvZHk+"}})).toBe("");
    expect(extractPlainGmailBody({mimeType:"multipart/mixed",parts:[{mimeType:"text/html",body:{data:"PGJvZHk+"}}]})).toBe("");
  });
  it("extracts text/plain nested in multipart",()=>{
    const body=btoa("Resumo reuniao");
    expect(extractPlainGmailBody({mimeType:"multipart/alternative",parts:[{mimeType:"text/html",body:{data:"PGI+"}},{mimeType:"text/plain",body:{data:body}}]})).toBe("Resumo reuniao");
  });
  it("does not store an empty or HTML-only summary",()=>{
    expect(()=>assembleMeetingCapture({subject:"Gemini",from:"Google",date:"2026-10-12",body:"",messageId:"abcd0123"})).toThrow();
  });
  it("preserves provenance and private text only",()=>{
    const r=assembleMeetingCapture({subject:" Reunião com   equipe ",from:"equipe@example.com",date:"2026-10-12",body:" Tarefas e encaminhamentos ",messageId:"abcd0123"});
    expect(r.title).toBe("Reunião com equipe");
    expect(r.note).toContain("Identificador da mensagem: abcd0123");
    expect(r.note).toContain("Tarefas e encaminhamentos");
  });
  it("rejects malformed base64 and bounds long titles",()=>{
    expect(()=>decodeGmailBase64Url("secret$")).toThrow();
    expect(normalizeMeetingTitle("x".repeat(500)).length).toBeLessThanOrEqual(160);
  });
});