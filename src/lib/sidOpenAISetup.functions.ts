import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Public metadata only; never returns or logs secret values.
 * GET model metadata does not run model inference or consume tokens.
 */
export const sidOpenAIStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("user_roles")
      .select("role").eq("user_id", context.userId).limit(1).maybeSingle();
    const model = process.env["OPENAI_MODEL"]?.trim() || "gpt-5-mini";
    const provider = process.env["SID_AI_PROVIDER"] === "openai" ? "openai" : "lovable";
    return {
      provider,
      model,
      keyConfigured: Boolean(process.env["OPENAI_API_KEY"]?.trim()),
      isAdmin: data?.role === "admin",
    };
  });

export const verifySidOpenAIKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("user_roles")
      .select("role").eq("user_id", context.userId).limit(1).maybeSingle();
    if (error || data?.role !== "admin") throw new Error("Somente administradores podem verificar credenciais de IA.");
    const key = process.env["OPENAI_API_KEY"]?.trim();
    if (!key) return { ok: false, reason: "Chave OPENAI_API_KEY ainda não cadastrada nos Secrets do servidor." };
    const model = process.env["OPENAI_MODEL"]?.trim() || "gpt-5-mini";
    try {
      const response = await fetch("https://api.openai.com/v1/models/" + encodeURIComponent(model), {
        method: "GET",
        headers: { Authorization: "Bearer " + key },
        signal: AbortSignal.timeout(15000),
        cache: "no-store",
      });
      if (response.ok) return {
        ok: true,
        reason: "Chave reconhecida e modelo visível. Ainda falta validar uma resposta real com faturamento habilitado.",
      };
      if (response.status === 401) return { ok: false, reason: "Chave inválida ou revogada. Atualize OPENAI_API_KEY em Secrets." };
      if (response.status === 403) return { ok: false, reason: "A chave não possui permissão de acessar esse modelo. Confira o projeto e as restrições da chave." };
      if (response.status === 404) return { ok: false, reason: "O modelo configurado não está disponível para este projeto. Confira OPENAI_MODEL." };
      if (response.status === 429) return { ok: false, reason: "Limite temporário de consulta à API. Tente novamente mais tarde." };
      return { ok: false, reason: "A OpenAI não confirmou o acesso ao modelo (HTTP " + response.status + ")." };
    } catch {
      return { ok: false, reason: "Não foi possível alcançar a API da OpenAI. Confira conectividade e tente novamente." };
    }
  });
