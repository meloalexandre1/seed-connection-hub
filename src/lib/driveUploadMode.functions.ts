import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Pure environment read: never contacts Google or OpenAI. */
export const captureDriveUploadsEnabled = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => ({
    enabled: process.env["GOOGLE_DRIVE_UPLOADS_ENABLED"] === "true",
  }));
