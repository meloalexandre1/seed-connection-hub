// Somente servidor: chave da IA e prompts nunca vão ao navegador.
import { createOpenAI } from "@ai-sdk/openai";
import { streamText, type ModelMessage } from "ai";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";
const MODEL = "openai/gpt-6-astra";

export interface SidChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function askSidModel(opts: {
  system: string;
  history: SidChatMessage[];
  question: string;
}): Promise<string> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("IA não configurada no servidor (LOVABLE_API_KEY ausente).");

  const provider = createOpenAI({
    baseURL: GATEWAY,
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });

  const messages: ModelMessage[] = [
    ...opts.history.slice(-12).map((m) => ({ role: m.role, content: m.content }) as ModelMessage),
    { role: "user", content: opts.question },
  ];

  const result = streamText({
    model: provider.responses(MODEL),
    system: opts.system,
    messages,
    providerOptions: {
      openai: {
        store: false,
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        include: ["reasoning.encrypted_content"],
      },
    },
  });

  const text = await result.text;
  if (!text.trim()) throw new Error("A IA não retornou resposta. Tente novamente.");
  return text;
}
