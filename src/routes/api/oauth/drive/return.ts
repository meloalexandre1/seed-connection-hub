import { createFileRoute } from "@tanstack/react-router";

// OAuth callback only passes Google's single-use authorization code and the
// signed state back to the opener. The access/refresh tokens never enter the
// browser; the authenticated server function performs the code exchange.
export const Route = createFileRoute("/api/oauth/drive/return")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code") ?? "";
        const state = url.searchParams.get("state") ?? "";
        const error = url.searchParams.get("error") ?? "";
        const result = { code, state, error };
        const safeJSON = JSON.stringify(result)
          .replace(/</g, "\\u003c")
          .replace(/>/g, "\\u003e")
          .replace(/&/g, "\\u0026");
        const html = `<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8">
<meta name="referrer" content="no-referrer"><title>Conexão com Drive</title></head>
<body><p>Concluindo autorização do Google Drive…</p>
<script>
const payload = ${safeJSON};
if (window.opener && window.opener !== window)
  window.opener.postMessage({type:"seedGoogleDriveOAuth", ...payload}, location.origin);
window.close();
</script></body></html>`;
        return new Response(html, { headers: {
          "content-type": "text/html; charset=UTF-8",
          "cache-control": "no-store",
          "referrer-policy": "no-referrer",
          "x-content-type-options": "nosniff",
        } });
      },
    },
  },
});
