# Push real do Seed Connection (sem créditos de edição Lovable)

## O que o código implementa

- PWA `/manifest.webmanifest` e `/sw.js`, com notificações quando o aplicativo não está aberto (desde que haja suporte do SO/browser e conectividade).
- Dispositivo opt-in em **Configurações → Integrações → Notificações no celular**, inscrito mediante consentimento do próprio dispositivo.
- As chaves das inscrições ficam em `public.push_subscriptions`, protegidas por RLS que verifica o usuário autenticado.
- Job do GitHub Actions (a cada 30 minutos; horário aproximado) chama `POST /api/push/dispatch`, protegido com `PUSH_CRON_SECRET` com ao menos 32 caracteres.
- O servidor Lovable utiliza as credenciais de banco que já tem. **NÃO coloque nenhuma service_role do Supabase no GitHub.**
- O servidor envia Web Push criptografado por WebCrypto (RFC 8291) e autenticado com VAPID (RFC 8292), sem SaaS pago.
- Envia lembretes genéricos de tarefas/follow-ups até dois dias antes ou atrasados. O texto privado não sai em claro nem é exibido na tela bloqueada.
- Entrega limitada por idempotência de banco: por dispositivo, prazo e estágio (próxima, hoje, atrasada), não a cada execução.
- Sem mudança de cadastros/arquivos. Não envia avisos sobre notas, menções @ ou alterações em tempo real neste estágio.

## Setup inicial sem copiar segredos no chat

1. **Gerar chave VAPID no SEU computador**, com Node instalado: `node scripts/create-vapid.mjs` (após baixar o repositório). Guarde `PUSH_VAPID_PRIVATE_KEY` só no serviço de Secrets. Nunca publique print com o valor.
2. Abra o projeto no Lovable → Cloud → Secrets. Adicione:
   - `PUSH_VAPID_PUBLIC_KEY` = chave pública gerada;
   - `PUSH_VAPID_PRIVATE_KEY` = chave privada gerada (não pode ir para frontend);
   - `PUSH_VAPID_SUBJECT` = `mailto:SEU_EMAIL_DE_SUPORTE` com endereço de contato válido;
   - `PUSH_CRON_SECRET` = senha aleatória forte de 32+ caracteres, diferente de qualquer chave do banco;
   - `PUSH_DELIVERY_ENABLED` = `true` **somente depois dos testes**.
3. Abra GitHub → repositório `meloalexandre1/seed-connection-hub` → Settings → Secrets and variables → Actions:
   - Em **Secrets**, crie `PUSH_CRON_SECRET` com o **mesmo valor** salvo no Lovable.
   - Em **Variables**, crie `SEED_PUSH_ENABLED` = `true` **somente depois da homologação**.
4. No Lovable, publique via Publish → Update. O endpoint de envio não funcionará enquanto `PUSH_DELIVERY_ENABLED` não for igual a `true`. O workflow agendado permanece inativo até `SEED_PUSH_ENABLED=true`.
5. No celular, entre em `https://hub.sidneyconexao.com.br` e vá a **Configurações → Integrações**. Clique **Ativar neste celular**. No iPhone, primeiro Safari → Compartilhar → Adicionar à Tela de Início; abra pelo ícone. Use HTTPS e aceite a permissão. No Android, Chrome atualizado normalmente permite ativar diretamente.
6. O contador de dispositivos registrados deve subir. Crie uma **tarefa fictícia**, atribuída à sua conta, com vencimento para hoje ou amanhã.
7. Ative `PUSH_DELIVERY_ENABLED=true` no Lovable e publique. No GitHub, configure `SEED_PUSH_ENABLED=true`.
8. GitHub → Actions → **Seed Web Push Reminders** → **Run workflow**, e verifique o job. O dispositivo deverá receber uma notificação genérica, mesmo com o aplicativo fechado, se não estiver bloqueado por permissões de SO/Focus. O recebimento real só pode ser confirmado no dispositivo.

## Privacidade e segurança

- O dispositivo só pode se inscrever na própria conta graças à autenticação + RLS.
- A tabela privada `push_deliveries` guarda somente identificador do evento e status, sem conteúdo pessoal.
- A rotina GitHub guarda apenas `PUSH_CRON_SECRET`; é desnecessário expor `SUPABASE_SERVICE_ROLE_KEY` a outro sistema.
- O navegador só recebe VAPID **pública**. VAPID **privada** e o segredo do cron ficam no servidor.
- Alterar chaves VAPID exige **reinscrever dispositivos**.
- Revogar notificações de um aparelho: botão **Desativar neste celular** nas Integrações.
- Notificação push Web não é garantia absoluta de entrega: dispositivo off-line, modos de foco/energia, permissões, limitação do provedor e atraso do agendador interferem. A central de notificações interna é a alternativa.
- No iOS, notificações Web Push funcionam a partir do iOS 16.4 **para Web Apps adicionados à Tela de Início**.

## Homologação

- [x] Tabelas com RLS e políticas vinculadas a `auth.uid()` verificadas no banco.
- [ ] Suíte de testes automatizados de criptografia, VAPID e compilação verde no GitHub.
- [ ] Chaves configuradas em Lovable e GitHub sem compartilhá-las no chat.
- [ ] Publicação nova no domínio `hub.sidneyconexao.com.br`.
- [ ] Inscrição real de um celular.
- [ ] Teste real de entrega com app fechado e notificação permitida.
- [ ] Conta B não consegue consultar/desativar dispositivo da conta A (teste adicional de RLS).
- [ ] Testar iPhone Tela de Início e Android conforme aparelhos disponíveis.

## Inteligência de reuniões — trabalho independente

A captura de resumos **não atualiza automaticamente** pessoas, fatos, necessidades, habilidades e oportunidades hoje.
Isso demanda um processamento com modelo de IA, reconciliação e revisão de entidades.
Não prometer que notificações push resolvam essa lacuna; desenvolvimento separado.
