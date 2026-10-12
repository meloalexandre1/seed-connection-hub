/**
 * Maps Google OAuth token endpoint failures to actionable messages without
 * revealing Google error descriptions, authorization codes or credentials.
 */
export function describeGoogleDriveOAuthFailure(
  status: number,
  responseBody: unknown,
): string {
  const data = (responseBody && typeof responseBody === "object")
    ? responseBody as Record<string, unknown>
    : {};
  const reason = typeof data["error"] === "string" ? data["error"] : "";
  switch (reason) {
    case "invalid_client":
      return "Credenciais Google Drive recusadas. Confirme se GOOGLE_DRIVE_CLIENT_ID e GOOGLE_DRIVE_CLIENT_SECRET são do mesmo cliente OAuth do tipo Aplicação Web. Atualize os Secrets do servidor e publique novamente.";
    case "redirect_uri_mismatch":
      return "Endereço de retorno não autorizado. No cliente OAuth do Drive, adicione exatamente https://hub.sidneyconexao.com.br/api/oauth/drive/return em Authorized redirect URIs.";
    case "invalid_grant":
      return "Código de autorização Google inválido, expirado ou já utilizado. Confira o redirect URI exato do cliente OAuth, feche a janela Google e tente autorizar novamente.";
    case "unauthorized_client":
      return "O cliente OAuth não está autorizado. Verifique o tipo Aplicação Web e as configurações do projeto Google Cloud.";
    case "access_denied":
      return "A permissão do Google Drive foi negada. Verifique o usuário de teste do Google Auth Platform ou aceite o consentimento.";
    case "invalid_request":
      return "A solicitação OAuth foi rejeitada. Confira client ID, redirect URI e origem HTTPS no Google Cloud.";
    default:
      return `Google Drive não concluiu a autorização (HTTP ${Number.isInteger(status) ? status : "erro"}). Confira Client ID, Client Secret, domínio publicado e o usuário de teste no Google Cloud.`;
  }
}

export function describeGoogleDrivePopupError(code: string): string {
  if (code === "access_denied")
    return "O Google Drive não foi autorizado. Confirme a permissão na janela do Google e se sua conta está na lista de usuários de teste.";
  if (code === "redirect_uri_mismatch")
    return "O cliente OAuth do Drive não reconheceu o retorno. Configure https://hub.sidneyconexao.com.br/api/oauth/drive/return como Redirect URI autorizado.";
  if (code === "admin_policy_enforced")
    return "O administrador da conta Google bloqueou o acesso ao Drive para este aplicativo.";
  return "O Google Drive não concluiu a autorização. Consulte os detalhes mostrados na janela Google e tente novamente.";
}
