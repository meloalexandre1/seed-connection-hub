/** Safe text-only extraction of Gmail summaries. Never render email HTML. */
export type GmailPart = {
  mimeType?: string;
  body?: { data?: string; attachmentId?: string; size?: number };
  parts?: GmailPart[];
};
export function decodeGmailBase64Url(data: string): string {
  if (!/^[A-Za-z0-9_-]*$/.test(data) || data.length > 500_000)
    throw new Error("Conteúdo Gmail inválido ou maior que o permitido.");
  const base64 = data.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(data.length / 4) * 4, "=");
  const bytes = Uint8Array.from(atob(base64), char => char.charCodeAt(0));
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}
export function extractPlainGmailBody(part: GmailPart | undefined): string {
  if (!part) return "";
  if (part.mimeType === "text/plain" && part.body?.data)
    return decodeGmailBase64Url(part.body.data).slice(0, 45_000);
  for (const child of part.parts ?? []) {
    const extracted = extractPlainGmailBody(child);
    if (extracted) return extracted.slice(0, 45_000);
  }
  // Never ingest HTML as if it were trusted text. MIME-less payloads sometimes
  // contain plain text but should not be guessed to avoid script injection.
  return "";
}
export function normalizeMeetingTitle(subject: string): string {
  const title = subject.replace(/[\x00-\x1f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 160);
  return title || "Resumo de reunião do Gmail";
}
export function assembleMeetingCapture(input: {
  subject: string; from: string; date: string; body: string; messageId: string;
}) {
  const subject = normalizeMeetingTitle(input.subject);
  const text = input.body.trim().slice(0, 45_000);
  if (!text) throw new Error("Este e-mail não possui texto simples. Copie o resumo manualmente.");
  return {
    title: subject,
    note: [
      "Origem: Gmail / resumo de reunião (importação confirmada pelo usuário)",
      "Assunto: " + subject,
      "Remetente: " + input.from.slice(0, 250),
      "Data: " + input.date.slice(0, 120),
      "Identificador da mensagem: " + input.messageId,
      "— Conteúdo original —", text,
    ].join("\n"),
  };
}
