# Gmail / Gemini — importar resumos para Seed Connection

## O que fica disponível já com esta PR
- **Colar resumo do Gemini:** disponível imediatamente em Configurações → Integrações, sem autorização Google adicional. Salva um registro privado em `captures`, com título, corpo, origem manual e estado `revisar`.
- **Conectar Gmail (opcional):** cada membro autentica **a própria conta** via Google OAuth `gmail.readonly`. Após o consentimento, pesquisa limitada a até 12 e-mails nos últimos 180 dias, com confirmação individual de importação.
- Mensagens de Gmail são lidas apenas quando o próprio usuário pesquisar/importar. Não há vigilância de inbox, alteração de e-mails, remoção, automação IA nem criação automática de tarefas ou oportunidades.
- Idempotência normal: busca registro anterior com `external_id=gmail:<id>` e proprietário da conta; operação simultânea extrema ainda requer índice único em migração aprovada.
- E-mail em HTML sem alternativa `text/plain` é recusado pelo importador, para evitar tratar código externo como texto seguro. Use o caminho de colagem manual.
- Documento Google Docs **linkado no e-mail** não é baixado automaticamente. É uma integração separada, futura, com as permissões e revisões necessárias.

## OAuth — habilitação manual no Google Cloud
1. Abrir https://console.cloud.google.com/apis/library e ativar **Gmail API** no projeto apropriado.
2. Em Google Auth Platform → Data Access, adicionar `https://www.googleapis.com/auth/gmail.readonly` explicitamente.
3. Inserir a conta Gmail da pessoa em **Audience → Test users** se o projeto estiver no modo Testing.
4. No cliente OAuth da Web, adicionar **Authorized redirect URI**: `https://hub.sidneyconexao.com.br/api/oauth/gmail/return`.
5. Após validar as exigências do Google, adicione **GMAIL_OAUTH_ENABLED=true** em Secrets do servidor e publique. Por padrão a leitura de caixa Gmail fica desativada; a importação manual continua funcionando.\n6. O backend usa por padrão o cliente OAuth existente do Drive (`GOOGLE_DRIVE_CLIENT_ID` e `GOOGLE_DRIVE_CLIENT_SECRET`), **mas se esse cliente estiver com erro invalid_client, Gmail também falhará**. Para cliente próprio do Gmail, adicionar os segredos `GOOGLE_GMAIL_CLIENT_ID` e `GOOGLE_GMAIL_CLIENT_SECRET`, correspondentes ao mesmo cliente.
7. `GOOGLE_DRIVE_APP_ORIGIN` pode fornecer a origem HTTPS publicada. É possível definir `GOOGLE_GMAIL_APP_ORIGIN` se houver necessidade específica. O segredo `APP_USER_CONNECTION_KEY_SECRET` do Lovable é reutilizado sem trocar o valor.
8. Publicar o app após adicionar os segredos. A primeira importação deve utilizar **e-mail fictício de teste**, não documentos sensíveis.

## Verificações
- [ ] A importação manual salva o título e o resumo privado e reaparece após recarregar.
- [ ] O OAuth Gmail exige consentimento gmail.readonly e autentica a conta correta.
- [ ] Nenhuma permissão de enviar, modificar ou excluir e-mails é solicitada.
- [ ] Buscar assuntos e escolher um e-mail mostra assunto, remetente e trecho.
- [ ] Importação salva uma captura `kind=nota`, `status=revisar`, `source=integracao`, `visibility=privado`.
- [ ] Clicar duas vezes em importar o mesmo e-mail não cria uma nova cópia na operação normal.
- [ ] Conta A não consulta nem importa o Gmail da conta B.
- [ ] E-mail sem texto simples falha com explicação e sem registro parcial.
- [ ] Ao desconectar, a chave cifrada é removida da base; os registros importados permanecem.
- [ ] Nenhum segredo ou corpo de e-mail aparece em logs de erros.

## Atenção regulatória
`gmail.readonly` é escopo **restrito**. O Google poderá exigir verificação e avaliação independente, especialmente para publicar a integração para outras pessoas com armazenamento/processamento dos e-mails em servidores externos. Enquanto essas questões não estiverem resolvidas, limitar a integração Gmail ao consentimento de contas de teste autorizadas. A importação manual funciona sem o escopo.

## Outros bloqueios fora do Gmail
- Drive: erro `invalid_client` significa que o Google rejeitou o ID/Secret OAuth. Só corrigível com o par válido no Google Cloud / Secrets Lovable; o app não consegue recuperar o segredo.
- OpenAI: se status indicar chave ausente, cadastrar `OPENAI_API_KEY` em Cloud → Secrets e publicar. Não colocar dinheiro até botão de verificação retornar êxito. Provedor padrão SID continua Lovable até `SID_AI_PROVIDER=openai`.
- Pasta Drive não terá uploads ativos enquanto não houver autorização da pasta e habilitação explícita de `GOOGLE_DRIVE_UPLOADS_ENABLED=true`.
