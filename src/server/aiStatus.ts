import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sidProviderConfiguration } from "@/lib/sid.server";

/** Never return the API key, only whether the server has it configured. */
export const sidAiStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => sidProviderConfiguration());
