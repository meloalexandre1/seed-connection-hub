// Servidor apenas: nenhuma credencial de IA chega ao navegador.
// Não há fallback silencioso para o gateway do Lovable, para evitar cobranças inesperadas.
import { createOpenAI } from "@ai-sdk/openai";
import { streamText, type ModelMessage } from "ai";

export interface SidChatMessage {
  role: "user" | "assistant";
  content: string;
}

export function sidProviderConfiguration() {
  return {
    provider: "openai" as const,
    configured: Boolean(process.env["OPENAI_API_KEY"]?.trim()),
    model: process.env["OPENAI_MODEL"]?.trim() || "gpt-5-mini",
  };
}

export async function askSidModel(opts: {
  system: string;
  history: SidChatMessage[];
  question: string;
}): Promise<string> {
  const key = process.env["OPENAI_API_KEY"]?.trim();
  if (!key) {
    throw new Error(
      "OpenAI API ainda não foi vinculada ao Seed Connection. " +
      "Configure OPENAI_API_KEY nas variáveis secretas do servidor; nunca no chat nem no navegador.",
    );
  }

  const provider = createOpenAI({ apiKey: key });
  const messages: ModelMessage[] = [
    ...opts.history.slice(-12).map((m) => ({
      role: m.role,
      content: m.content,
    }) as ModelMessage),
    { role: "user", content: opts.question },
  ];
  try {
    const result = streamText({
      model: provider.responses(sidProviderConfiguration().model),
      system: opts.system,
      messages,
      maxOutputTokens: 2000,
      abortSignal: AbortSignal.timeout(90_000),
      providerOptions: { openai: { store: false } },
    });
    const answer = await result.text;
    if (!answer.trim()) throw new Error("empty_ai_answer");
    return answer;
  } catch (e) {
    const err = e as { statusCode?: number; status?: number; code?: string; message?: string };
    const code = String(err?.code ?? "");
    const message = String(err?.message ?? "").toLowerCase();
    if (/insufficient_quota|credit_balance_exhausted|organization_usage_limit_exceeded/.test(code) ||
        /insufficient_quota|credit_balance_exhausted|billing|no credit/.test(message)) {
      throw new Error(
        "OpenAI API conectada, porém sem saldo ou com limite de faturamento. " +
        "Adicione créditos no painel da OpenAI Platform para habilitar as respostas do SID.",
      );
    }
    if ((err?.statusCode ?? err?.status) === 401) {
      throw new Error("A chave OPENAI_API_KEY não foi aceita. Confira-a apenas na configuração secreta do servidor.");
    }
    if ((err?.statusCode ?? err?.status) === 429) {
      throw new Error("Limite temporário de chamadas à OpenAI atingido. Aguarde antes de tentar novamente.");
    }
    throw new Error("Não foi possível consultar a OpenAI API neste momento. Tente novamente mais tarde.");
  }
}
