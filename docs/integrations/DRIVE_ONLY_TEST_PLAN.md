# Seed Connection — Drive como armazenamento principal (PR de validação)

## Escopo e status
Esta PR contém **somente** a integração Google Drive da Central de Captura. Não modifica o gateway ou faturamento do SID/OpenAI. Não faz alterações ao banco, não apaga arquivos, não autoriza a conta Google automaticamente e não publica o aplicativo.

Pasta alvo existente: [Seed Connection — Arquivos](https://drive.google.com/drive/folders/1jaWPGrByJdqDk5xXp5gBso0h-YSLug1c). ID: `1jaWPGrByJdqDk5xXp5gBso0h-YSLug1c`.

**Gate de ativação:** `GOOGLE_DRIVE_UPLOADS_ENABLED` é `false` por padrão; durante os testes, Drive pode ser autorizado mas os uploads de produção continuam no Supabase. Somente depois da homologação definir `GOOGLE_DRIVE_UPLOADS_ENABLED=true` nos Secrets do servidor e republicar. Com a flag ativa, se a autorização falhar, o app interrompe o novo upload com erro claro em vez de salvar silenciosamente no Supabase.

## Configurações exigidas (não compartilhar valores no chat/Git)

- `GOOGLE_DRIVE_CLIENT_ID`: cliente OAuth Google do tipo aplicação Web.
- `GOOGLE_DRIVE_CLIENT_SECRET`: segredo do cliente OAuth.
- `GOOGLE_DRIVE_APP_ORIGIN`: `https://hub.sidneyconexao.com.br`.
- `GOOGLE_DRIVE_PICKER_API_KEY`: chave do Google Picker com restrições por referer/API.
- `GOOGLE_DRIVE_PICKER_APP_ID`: número do projeto no Google Cloud.
- `APP_USER_CONNECTION_KEY_SECRET`: segredo já gerado pelo Lovable, **não recriar ou alterar**.
- `GOOGLE_DRIVE_STORAGE_OWNER_UID`: opcional, quando múltiplos administradores conectarem Drives diferentes. Com uma única conexão autorizada, o servidor detecta a conta central.
- `GOOGLE_DRIVE_UPLOADS_ENABLED`: deixe ausente durante a autorização/testes iniciais.

## OAuth Google

No OAuth Client registrado em Google Cloud, usar:
- Authorized JavaScript origin: `https://hub.sidneyconexao.com.br`
- Authorized redirect URI: `https://hub.sidneyconexao.com.br/api/oauth/drive/return`
- Escopo: `https://www.googleapis.com/auth/drive.file`

A autorização do conector **App + Chat** da interface Lovable é independente da autorização OAuth implementada nesta PR. Vincular esse conector ao Lovable não habilita este fluxo automaticamente.

Depois de testes automatizados aprovados e revisão para disponibilizar uma versão de teste:
1. No app publicado, entrar como administrador.
2. Em Configurações → Integrações → Google Drive, clicar **Autorizar Google**.
3. Na janela Google, escolher a conta com acesso à pasta e aceitar o consentimento.
4. Clicar **Selecionar esta pasta** (Google Picker) e conceder acesso à pasta existente.
5. Recarregar a página e confirmar **Autorizado · aguardando habilitação dos uploads**.
6. Fazer primeiro upload fictício em ambiente de teste **após** habilitar a flag de upload exclusivamente nesse ambiente. Não habilitar a flag na produção antes da homologação.
7. Conferir no Google Drive, e no Supabase tabela `captures`, se `external_id` tem prefixo `gdrive:`, e `storage_path` está vazio.

## Casos de teste automatizados
- Arquivo da pasta correta e vinculado ao dono/captura: aceita.
- Arquivo com identificação de outro usuário/captura/pasta: rejeita.
- Arquivo excluído, tipo ou tamanho divergente: rejeita.
- MIME proibido (p.ex. HTML, executável): rejeita.
- Upload retomável retorna ID e não marca êxito antes da confirmação do Drive.
- Falha de rede após parte dos bytes recebidos: consulta posição remota e retoma.
- HTTP 403: falha definitivamente, sem repetir.
- Endpoint remoto não Google: rejeita upload.
- Servidor sem OAuth autorizado: não deve transferir arquivos.

## Restrições que ainda exigem homologação real
- A operação no navegador depende de CORS correto em sessões de upload retomável do Google Drive. Se o navegador bloquear a resposta `Location` ou o PUT, construir envio via backend/broker sem expor tokens nem consumir Storage do Supabase.
- O app ainda não recupera a sessão de upload depois de fechar o navegador; a retomada só funciona durante a mesma sessão de página.
- Ainda não há proxy de download autorizado pelo aplicativo: colaboração na escrita não significa que todos possam abrir arquivos privados do Drive.
- Anexos enviados no **chat SID** permanecem um fluxo separado.
- Arquivos pré-existentes no Supabase não são migrados por esta PR.
- Não existe verificação de magic bytes no servidor Google Drive; tipos reais dos arquivos devem ser inspecionados antes de habilitar uploads de fontes não confiáveis.
- Para a primeira homologação, usar arquivos **fictícios**, pequenos, depois áudio de teste maior que 8 MiB. Testar com conta administrativa e conta operacional.
