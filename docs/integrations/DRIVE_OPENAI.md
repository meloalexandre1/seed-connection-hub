# Seed Connection — Google Drive + OpenAI API (preparação)

## Estado

- Pasta Google Drive existente e confirmada (privada): `Seed Connection — Arquivos`
- ID da pasta (não é segredo): `1jaWPGrByJdqDk5xXp5gBso0h-YSLug1c`
- Esta integração é uma implementação preparada, **não homologada**. Não ativar em produção sem teste com arquivo pequeno e duas contas.
- As alterações estão em branch de revisão; não serão incorporadas à versão principal antes de verificar autorização, build e comportamento de upload.
- Nenhum arquivo existente no Supabase é migrado ou apagado por este patch.
- A conexão Google do ChatGPT não é uma credencial do Seed Connection.

## OpenAI API — configurar sem saldo agora

1. Em https://platform.openai.com/ crie um projeto da API específico para Seed Connection.
2. Se a sua conta permitir, crie uma chave de projeto restrita. **Não mande a chave ao chat nem a grave no GitHub**.
3. Configure no ambiente *servidor* do deploy `OPENAI_API_KEY` e opcionalmente `OPENAI_MODEL=gpt-5-mini`.
4. O SID usa `@ai-sdk/openai` diretamente pelo serviço oficial; **não utiliza automaticamente o gateway do Lovable como fallback**.
5. Sem chave, a chamada responde com a instrução de configuração. Com chave mas sem saldo ou limites de faturamento, a API pode responder com erro de cota e o SID exibe orientação sem tentar gastar no Lovable.
6. Só quando quiser ativar as respostas, configure a forma de pagamento e saldo no portal API. As assinaturas do ChatGPT e do Lovable não pagam esta API.
7. Monitore em https://platform.openai.com/usage e controle recargas em https://platform.openai.com/settings/organization/billing/overview. Orçamentos/alertas são recomendados; limites externos podem interromper temporariamente as requisições.

## Google Drive — configuração OAuth manual

**Necessário por razões de segurança:** conexão de arquivo do ChatGPT não transfere permissão de escrita ao aplicativo.

1. Crie projeto em https://console.cloud.google.com/ (ou escolha um projeto dedicado).
2. Habilite **Google Drive API** e **Google Picker API**.
3. Prepare tela de consentimento OAuth para seu aplicativo; na fase de testes inclua sua própria conta Gmail como usuário de teste.
4. Configure client OAuth de tipo **Web application**. Adicione como URI de redirecionamento autorizado o endereço HTTPS publicado do app acrescido de:
   `/api/oauth/drive/return`.
   O domínio deve coincidir **exatamente** com `GOOGLE_DRIVE_APP_ORIGIN`, sem barra final.
5. Solicite somente `https://www.googleapis.com/auth/drive.file`. Esse escopo, por segurança, só acessa arquivos criados/selecionados para o app. Como a pasta já existia, o proprietário precisa selecioná-la pelo **Google Picker** dentro do app após conectar.
6. Configure segredos **somente no servidor**:
   - `GOOGLE_DRIVE_CLIENT_ID` — Client ID do OAuth da conta Google.
   - `GOOGLE_DRIVE_CLIENT_SECRET` — Client Secret (NUNCA no navegador).
   - `GOOGLE_DRIVE_APP_ORIGIN` — URL HTTPS do app publicada, sem barra final.
   - `APP_USER_CONNECTION_KEY_SECRET` — secret existente para criptografar refresh tokens, base64 de uma chave simétrica segura. Não substitua sem plano de rotação, pois afetaria conexões anteriores.
   - `GOOGLE_DRIVE_PICKER_API_KEY` — chave de API (browser key) com restrição de referer e API Google Picker.
   - `GOOGLE_DRIVE_PICKER_APP_ID` — número do projeto Google Cloud.
   - `GOOGLE_DRIVE_STORAGE_OWNER_UID` — **opcional**: só é necessário quando houver mais de um administrador conectando diferentes Drives. Com uma única conta Drive autorizada, o app identifica o proprietário automaticamente no servidor.
7. No Seed Connection: Configurações → Integrações → **Google Drive — armazenamento** → **Autorizar Google**.
8. Clique em **Selecionar esta pasta** e conceda acesso no Picker à pasta `Seed Connection — Arquivos` (a existente, ID acima).
9. O status precisa indicar **Conectado e com acesso à pasta**.
10. Teste upload pequeno usando a Central de Captura, confirme o arquivo dentro da pasta e confira o registro correspondente na tabela `captures` (`external_id` com prefixo `gdrive:`; `storage_path` nulo).

### Comportamento e limites atuais

- A Central de Captura usa Drive quando o app está conectado e a pasta está autorizada; até lá, mantém o Supabase Storage existente.
- Upload grande é feito diretamente do navegador ao Google, sem passar o arquivo inteiro pelo servidor do Seed Connection. A sessão HTTP usa protocolo de upload retomável em blocos.
- **Ainda é necessário homologar CORS do navegador e retomada após queda** em iPhone e Android; não prometa gravação contínua com tela bloqueada.
- O limite inicial do arquivo é **1 GiB**; isso não representa o limite da capacidade total do Google Drive.
- O registro de captura fica no Supabase (metadados, vínculos e extrações); o arquivo original vai ao Drive.
- **Anexos enviados dentro do chat SID ainda não são persistidos/processados como arquivos** no fluxo existente. Não anuncie "tudo no Drive" até integrar também essa área e validá-la.
- Arquivos anteriores continuam no Supabase. Não elimine nenhum até migração e verificação cuidadosas.
- A pasta é privada na sua conta Google; os colaboradores podem gravar pelo app autorizado, mas abrir um arquivo diretamente no Google Drive depende das permissões Google, não apenas do login Seed Connection. Precisaremos criar visualização/retirada mediada pelo servidor e políticas de acesso antes de liberar downloads para a equipe.
- O app Google OAuth em modo **Testing** pode ter refresh tokens temporários. Ajuste adequadamente o ambiente quando passar à operação contínua.
- A autorização Drive tem escopo limitado, mas um token temporário é entregue ao navegador do **administrador** unicamente durante a escolha da pasta no Google Picker. Nunca retornar refresh tokens ao navegador.

## Critérios antes de integrar branch principal

- [ ] Build e testes automatizados sem erros.
- [ ] OAuth e consentimento em uma URL publicada HTTPS funcionam.
- [ ] Google Picker concede acesso à pasta preexistente específica.
- [ ] Upload PDF pequeno, verificação no Drive e registro no Supabase.
- [ ] Gravação de áudio grande e retomada em navegador móvel.
- [ ] Usuário operacional não acessa o token nem arquivos privados de outro usuário.
- [ ] Falhas sem quota e sem API key aparecem corretamente no SID.
- [ ] Nenhuma chave, refresh token ou Authorization é registrada em logs ou Git.
- [ ] Nada é excluído automaticamente do Supabase durante o período de testes.

## Homologação segura — não enviar arquivos pessoais antes de concluir

Execute depois de publicar uma versão de testes, preferencialmente acessível somente aos usuários autorizados.

| Teste | Ação esperada | Critério de aprovação |
| --- | --- | --- |
| OAuth de administrador | Fazer login como administrador e clicar Autorizar Google | OAuth conclui sem erro; credenciais não aparecem nos logs nem no navegador |
| Consentimento restrito | Verificar o escopo solicitado | Somente `drive.file`, sem permissão irrestrita de todo o Drive |
| Pasta correta | Escolher a pasta `Seed Connection — Arquivos` no Google Picker | Status muda para `Conectado e com acesso à pasta` |
| Pasta errada | Escolher outra pasta | App rejeita o destino e não habilita uploads |
| Usuário não admin | Entrar como colaborador comum | Não consegue autorizar/revogar uma conta Google |
| PDF pequeno | Enviar um PDF fictício e confirmar no Drive e Supabase | Apenas um arquivo no Drive e captura com `external_id=gdrive:<id>` |
| Tipo inválido | Tentar arquivo executável ou HTML | Upload rejeitado antes de criar sessão |
| Arquivo grande | Enviar um áudio fictício superior a 8 MiB | Blocos retomáveis e arquivo completo e íntegro no Drive |
| Falha de rede | Desconectar brevemente durante upload | Sistema informa erro ou retoma via sessão, mas não marca captura concluída incorretamente |
| Novo acesso | Fechar navegador, abrir de novo | O arquivo continua no Drive; vínculo continua no banco |
| Outro usuário | Tentar concluir ou recuperar um arquivo de outro usuário | Negado por RLS/checagem de proprietário |
| Google Drive offline | Simular credenciais inválidas | Falha visível; nenhum dado existente excluído |
| OpenAI sem saldo | Consultar SID com chave configurada, mas sem faturamento habilitado | Mensagem de falta de cota; nenhum fallback pago para gateway Lovable |
| Regressão | Enviar um arquivo com integração do Drive ainda desativada | Supabase Storage atual continua disponível |

### Resultado automatizado

Os testes locais de Vitest de validação do arquivo e retomada de upload não utilizam credenciais Google e não movimentam dados do usuário.

O GitHub Actions da PR executa `bun install --frozen-lockfile`, `bun run test`, `bun run build` e `bunx tsc --noEmit`. Veja o check **Verify Drive integration** na PR #3.

### Limites e pendências conhecidos

- O Google Picker exige **consentimento humano explícito**. O conector Lovable App + Chat visto no painel não transfere sozinho credenciais ao código próprio desta PR.
- A autorização só é concluída após teste em `https://hub.sidneyconexao.com.br`, com origem OAuth e redirecionamento correspondentes.
- O Google Drive usa metadados privados `appProperties.seedCaptureId` e `seedOwnerId` e o servidor verifica esses dados antes de concluir a captura.
- Sessões de upload retomável são mantidas em memória. A versão atual **não preserva o ponto de retomada após fechar/derrubar o navegador**, exigindo nova tentativa.
- Não existe acesso completo dos colaboradores aos downloads pelo app ainda; uma equipe poderá carregar arquivos usando a conta central do Drive, mas a leitura precisa de autorização própria.
- Áudios/arquivos anexados **diretamente no chat SID** ainda não são processados neste fluxo.
- Nenhum arquivo antigo será removido do Supabase até migração validada explicitamente.
- Toda credencial deve permanecer em Secrets do servidor. **Nunca colar tokens no chat**.
