import { createFileRoute } from "@tanstack/react-router";

// Server endpoint that returns plain HTML — not a React component.
// The popup has no session in the editor preview, so it cannot load a
// session-protected app route. This endpoint requires no authentication and
// posts the one-time code to the opener, which runs the exchange server fn.
export const Route = createFileRoute("/api/oauth/google/return")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const connectorId = url.searchParams.get("connector_id") ?? "";
        const code = url.searchParams.get("code") ?? "";
        const success = url.searchParams.get("success") === "true";
        const error = url.searchParams.get("error");

        const result =
          success && code
            ? { success: true, connectorId, code }
            : {
                success: false,
                connectorId,
                error: error ?? (success ? "Missing code" : "OAuth failed"),
              };

        const escapeHtml = (str: string) =>
          str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
        const safeJson = JSON.stringify(result).replace(/<\//g, "<\\/");

        const html = `<!DOCTYPE html>
<html>
<head><title>Concluindo conexão…</title></head>
<body>
  <p>${result.success ? "Conexão concluída, fechando…" : "Falhou: " + escapeHtml(result.error ?? "Erro desconhecido")}</p>
  <script>
    const result = ${safeJson};
    const type = result.success ? "appUserConnectorOAuthComplete" : "appUserConnectorOAuthFailed";
    const message = { type, connectorId: result.connectorId, code: result.code ?? null };
    if (window.opener && window.opener !== window) {
      window.opener.postMessage(message, window.location.origin);
    }
    window.close();
  </script>
</body>
</html>`;

        return new Response(html, { headers: { "Content-Type": "text/html" } });
      },
    },
  },
});
