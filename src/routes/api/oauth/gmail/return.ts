import { createFileRoute } from "@tanstack/react-router";

/**
 * OAuth callback to the same origin as the signed-in Seed Connection app.
 * Authorization code is delivered only to the opener and then exchanged by a
 * server function. No API tokens, refresh tokens or email bodies are returned.
 */
export const Route = createFileRoute("/api/oauth/gmail/return")({
  server: {
    handlers: {
      GET: async ({request}) => {
        const u = new URL(request.url);
        const result = {
          code: u.searchParams.get("code") ?? "",
          state: u.searchParams.get("state") ?? "",
          error: u.searchParams.get("error") ?? "",
        };
        const safe = JSON.stringify(result)
          .replace(/</g,"\\u003c").replace(/>/g,"\\u003e").replace(/&/g,"\\u0026");
        return new Response(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="referrer" content="no-referrer"><title>Gmail — Seed Connection</title></head><body><p>Concluindo autorização Gmail...</p><script>
const payload = ${safe};
if(window.opener && window.opener !== window)
  window.opener.postMessage({type:"seedGmailOAuth",...payload},location.origin);
window.close();
</script></body></html>`,{headers:{
          "content-type":"text/html; charset=UTF-8","cache-control":"no-store",
          "referrer-policy":"no-referrer","x-content-type-options":"nosniff",
        }});
      },
    },
  },
});