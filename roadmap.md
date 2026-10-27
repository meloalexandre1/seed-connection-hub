# Roadmap

## Concluído nesta rodada
- [x] Notificações no celular: envio ativado (PUSH_DELIVERY_ENABLED) + rotina diária às 8h (horário de Brasília) criada
- [x] Gmail: liberação no servidor ativada (GMAIL_OAUTH_ENABLED)
- [x] Google Drive: uploads ativados (GOOGLE_DRIVE_UPLOADS_ENABLED)
- [x] Google Agenda: conexão vinculada ao projeto; fluxo de conexão testado até a tela do Google
- [x] Tela de Integrações verificada com login real (status corretos)

## Aguardando ação do usuário
- [ ] Google Agenda: cadastrar a URL de retorno https://connector-gateway.lovable.dev/api/v1/app-users/oauth2/callback no cliente Google (console.cloud.google.com/apis/credentials) — sem isso o Google recusa o login
- [ ] Drive e Gmail: clicar em "Autorizar Google" / "Conectar Gmail" no endereço publicado (hub.sidneyconexao.com.br) — por segurança, não iniciam no preview
- [ ] Notificações: clicar em "Ativar neste celular" no próprio celular
- [ ] WhatsApp Business — bloqueado: usuário não tem número de telefone disponível agora
- [ ] PLAUD — sem API pública; permanece importação manual
