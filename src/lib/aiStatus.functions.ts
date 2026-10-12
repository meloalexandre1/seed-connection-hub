import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Server-only dynamic import ensures OpenAI secrets stay out of client JS. */
export const sidAiStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { sidProviderConfiguration } = await import("@/lib/sid.server");
    return sidProviderConfiguration();
  });
