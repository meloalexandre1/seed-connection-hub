/** Public callback URLs for the three independent OAuth integrations.
 * A redirect must be registered on the exact OAuth Client ID in use.
 * These values contain NO credentials or access tokens.
 */
export const GOOGLE_OAUTH_CALLBACKS = {
  calendarViaLovable: "https://connector-gateway.lovable.dev/api/v1/app-users/oauth2/callback",
  driveDirect: "https://hub.sidneyconexao.com.br/api/oauth/drive/return",
  gmailDirect: "https://hub.sidneyconexao.com.br/api/oauth/gmail/return",
  origin: "https://hub.sidneyconexao.com.br",
} as const;
