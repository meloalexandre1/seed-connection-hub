// Server-only integration: OpenAI key must never be sent to the browser.
import { createOpenAI } from "@ai-sdk/openai";
import { streamText, type ModelMessage } from "ai";

interface SidMessage { role: "user" | "assistant"; content: string }

export async function askSidViaOpenAI(opts: {
  system: string;
  history: SidMessage[];
  question: string;
}): Promise<string> {
  const key = process.env["OPENAI_API_KEY"]?.trim();
  if (!key) throw new Error("A OpenAI API ainda não possui chave cadastrada no servidor.");
  const model = process.env["OPENAI_MODEL"]?.trim() || "gpt-5-mini";
  const provider = createOpenAI({ apiKey: key });
  const messages: ModelMessage[] = [
    ...opts.history.slice(-12).map(m => ({ role: m.role, content: m.content }) as ModelMessage),
    { role: "user", content: opts.question },
  ];
  try {
    const r = streamText({
      model: provider.responses(model),
      system: opts.system,
      messages,
      maxOutputTokens: 2000,
      abortSignal: AbortSignal.timeout(90000),
      providerOptions: { openai: { store: false } },
    });
    const answer = await r.text;
    if (!answer.trim()) throw new Error("empty_answer");
    return answer;
  } catch (e) {
    const err = e as { statusCode?: number; status?: number; code?: string; message?: string };
    const reason = String(err?.code || "");
    const detail = String(err?.message || "").toLowerCase();
    if (/insufficient_quota|billing_hard_limit_reached|credit_balance_exhausted/.test(reason) ||
        /insufficient_quota|billing_hard_limit_reached|credit balance/.test(detail))
      throw new Error("A OpenAI API está sem saldo ou atingiu um limite de faturamento. Consulte o painel de Billing.");
    if ((err?.statusCode ?? err?.status) === 401)
      throw new Error("A chave da OpenAI API não foi aceita. Atualize a credencial no servidor.");
    if ((err?.statusCode ?? err?.status) === 429)
      throw new Error("Limite temporário da OpenAI API. Aguarde alguns instantes.");
    throw new Error("Não foi possível responder pela OpenAI API no momento. Nenhuma resposta fictícia foi produzida.");
  }
}
