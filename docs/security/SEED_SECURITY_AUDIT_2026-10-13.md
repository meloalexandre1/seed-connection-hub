# AUDITORIA DE SEGURANÇA E OPERACIONALIDADE — SEED CONNECTION

Data: 2026-10-13 · Revisão estática orientada a OWASP Top 10 / API Security e inspeção read-only do banco em produção.

**Escopo efetivamente inspecionado:** fluxo de capturas e aprovação de fatos; SID chat e gateway; Supabase Auth, funções server-only, RLS das tabelas `public`, políticas de Storage e buckets, arquivos de configuração/variáveis e rotas sensíveis, fluxo OAuth do Drive/Gmail, GitHub Actions; conjunto de 213 arquivos rastreados no ramo principal identificado. Inspeção **não equivale a pentest**, varredura integral do histórico Git nem verificação runtime de todos os provedores.

## RESUMO DA AUDITORIA DE SEGURANÇA

- **Crítico:** 0 explorabilidades críticas comprovadas nesta inspeção parcial.
- **Alto:** 1 falha operacional confirmada (categorias de fatos incompatíveis), corrigida; 1 risco de abuso em operações caras de IA sem limite servidor, mitigado.
- **Médio:** 2 problemas mitigados (aprovação de resumo alterado e telemetria de erros completos); 1 higiene de arquivos mitigada; riscos em upload e configurações externas pendentes de homologação.
- **Baixo:** aprimoramentos de observabilidade/erros e UX.

**NÃO ATTESTAR produção como segura.** Controles que parecem presentes no código não equivalem a teste de invasão concluído.

## ACHADOS COM EVIDÊNCIA E CORREÇÃO

### F-01 · Tipos de fatos incompatíveis com o banco — ALTO (funcional)
**Local:** `src/lib/captureIntelligenceSchema.ts` e `public.facts.facts_kind_check`.

**Evidência:** extração aceita `necessidade`, `habilidade`, `contexto`, `compromisso`, `oportunidade`; banco só aceitava `necessidade`, `habilidade`, `recurso`, `outro`. A aplicação pode retornar erro e reverter a aprovação de uma reunião que contenha compromisso/oportunidade.

**Correção aplicada:** `docs/supabase/migrations/0011_expand_fact_kinds.sql` ampliou o CHECK mantendo categorias anteriores. Verificado por leitura do `pg_constraint` após execução.

**Teste:** analisar reunião fictícia que contenha compromisso e oportunidade; após aprovação, conferir `facts.kind` e `source_capture_id`.

### S-01 · Endpoint de IA caro sem limite próprio — ALTO (abuso de custo)
**Local:** `src/lib/sid.functions.ts`, `src/lib/captureIntelligence.functions.ts`.

**Evidência:** chamadas autenticadas a `askSidModel` não possuíam limitador no servidor. Um login comprometido poderia gerar muitas requisições de inferência e custo.

**Correção aplicada:** `public.claim_ai_request` (somente `service_role`, não acessível a `anon`/`authenticated`) e janelas atômicas por usuário/operador; limites de 20 chamadas de chat/minuto e 3 análises/minuto. Chamadas rotineiras SQL sem inferência não são afetadas.

**Teste:** validação dos GRANTs de RPC e CI; resta homologar excesso de chamadas com conta de teste, sem custo de inferência.

### S-02 · Aprovação de análise de texto alterado — MÉDIO (integridade/proveniência)
**Local:** `public.capture_analyses`, `public.capture_analysis_decisions`, `private.capture_analysis_source_fingerprint`, `private.reject_stale_capture_decision`.

**Evidência:** após gerar sugestões, `captures.note` poderia ser editada sem invalidar fatos propostos.

**Correção aplicada:** `docs/supabase/migrations/0012_ai_integrity_limits.sql` e `0013_capture_source_fingerprint.sql`. O banco grava SHA-256 do documento original no momento da análise e recusa **a aprovação, inclusive via chamada direta da RPC**, quando o texto foi alterado. Funções estão no esquema privado, ligadas a gatilhos. Verificado que ambos os gatilhos estão ativos.

**Teste:** simulação transacional com captura fictícia em ambiente de homologação, alterando texto antes da aprovação e confirmando rollback.

### S-03 · Mensagens completas de erro enviadas a telemetria opcional — MÉDIO (privacidade)
**Local:** `src/routes/__root.tsx` e `src/lib/lovable-error-reporting.ts`.

**Evidência:** error boundary escrevia objeto de exceção em console e enviava stack e mensagem para callbacks opcionais do Lovable mesmo fora de DEV. Erros podem conter caminhos internos ou dados pessoais.

**Correção aplicada:** telemetria detalhada só em ambiente local `import.meta.env.DEV`. Usuário continua vendo tela de erro genérica.

**Teste:** build PROD e disparo de erro fictício, confirmar que hooks de relatório não recebem mensagem/stack privada.

### S-04 · Arquivo `.env` rastreado e padrão de ignorados incompleto — MÉDIO (higiene)
**Local:** `.env`, `.gitignore`.

**Evidência:** `.env` está rastreado no repositório, mas a inspeção dos **nomes** das seis entradas mostrou apenas identificadores, URLs e chaves `SUPABASE_PUBLISHABLE_KEY` destinadas à publicação — **nenhuma service-role ou API OpenAI visível nesse arquivo**. O `.gitignore` não impedia novos `.env.*` e chaves PEM.

**Correção aplicada:** ignore futuro de `.env.*`, `*.pem`, `*.key`. Arquivo `.env` já rastreado permanece no histórico; não foi removido para evitar quebrar build, e não se deve colocar Secrets lá.

**Teste:** `git status` local com arquivo `.env.local` de teste; realizar scanner abrangente de todo o histórico Git em máquina confiável.

## PROTEÇÕES OBSERVADAS (NÃO SUBSTITUEM PENTEST)

- Todas as tabelas `public` consultadas estão com RLS habilitado; políticas principais de `people`, `captures`, `facts`, `tasks` e `contact_methods` fazem referência a funções de autorização `private`.
- Buckets `captures` e `sid-attachments` são privados; `storage.objects` requer associação ao usuário e/ou função `private.can_read_object`.
- `public.approve_capture_person` é `SECURITY DEFINER` mas checa `auth.uid()`, propriedade da captura/análise e da pessoa escolhida; execução negada para `anon`, permitida a autenticados.
- `public.claim_ai_request` tem EXECUTE somente para `service_role`.
- A chave de service-role é lida do ambiente servidor em `client.server.ts`, não é esperada no frontend.
- Análises são criadas pelo servidor, lidas apenas pelo proprietário e aprovadas individualmente, com trilha de origem. Prompt injection é mitigada por instruções e validação de evidência literal, mas não eliminada.

## VERIFICAÇÕES PENDENTES ANTES DE PUBLICAR COMO PRODUÇÃO

**Segredos e histórico Git:** varredura automática completa do histórico (p.ex. Gitleaks), avaliação de chaves anteriormente expostas/revogadas, rotatividade se houver confirmação. Não foram lidos valores privados de Secrets.

**Autenticação:** testes reais de login/logout/recuperação, expiração/revogação de sessões, enumeração e força bruta em Supabase Auth.

**BOLA/IDOR:** duas contas fictícias (A/B), tentar IDs alheios em todos os endpoints e RPCs; verificar que não há acesso cruzado a documentos, pessoas, tarefas, análises, storage ou admin.

**OAuth Google:** os fluxos Agenda, Drive e Gmail permanecem dependentes de configuração válida do cliente OAuth; não há teste real de autorização aprovado. Não afirmar integração funcional.

**OpenAI:** `OPENAI_API_KEY` e `LOVABLE_API_KEY` não podem ser validadas por código-fonte. Testar somente com permissão e provedor ativo; ausência de créditos significa que o fluxo semântico de reunião não pode ser confirmado no momento.

**Storage e uploads:** buckets privados, mas MIME permitido sem allowlist explícita; tamanho limite do bucket `captures` é 500 MiB e `sid-attachments` 100 MiB. Definir lista de formatos e orçamento antes de liberar envios não confiáveis, testar tipo real/MIME e EICAR inofensivo apenas em homologação.

**CORS/headers/produção:** revisar configurações efetivas do host publicado (CSP, HSTS, no-store para OAuth, CORS e cache), não apenas código; testar XSS com dados fictícios.

**Dependências/CI:** `bun install --frozen-lockfile`, build/test/tsc em PR; adicionalmente rodar `bun audit`/ferramenta CVE e scanner Gitleaks/TruffleHog em CI. Não foi feita auditoria exaustiva de dependências.

**Logs e monitoring:** evitar conteúdos de reuniões, Authorization e tokens em traces; métricas agregadas de falhas de auth, IA, storage e webhook, sem vazamento de dados.

**Processamento e custo:** concorrência, confirmação por pessoa e invariância do vínculo original precisam de teste ponta a ponta no app com reunião fictícia; não testar em contato real sem aprovação.

## TESTE DO ATACANTE — COBERTURA

| Papel | Tentativa | Evidência até aqui | Status |
| --- | --- | --- | --- |
| Não autenticado | Consultar/fazer RPC privada | RLS + checagem de auth no código; RPC `claim_ai_request` sem grant público | PRECISA DE REVISÃO MANUAL |
| Usuário A logado | Ler captura/análise da conta B trocando UUID | Consultas de dono e políticas RLS aparentes | PRECISA DE REVISÃO MANUAL |
| Usuário mal-intencionado | Aprovar CRM de outra conta por `approve_capture_person` | Código SQL checa auth.uid/owner; sem grants `anon` | PRECISA DE REVISÃO MANUAL |
| Usuário logado | Rodar inferência em excesso | Limitador atômico no servidor implementado | OK NO CÓDIGO / HOMOLOGAÇÃO PENDENTE |
| Admin | Acessar funções privilegiadas de outro usuário | Não foi feito pentest autenticado com múltiplas contas | PRECISA DE REVISÃO MANUAL |

## CHECKLIST DE SEGURANÇA ANTES DE PUBLICAR

- [OK] RLS habilitado nas tabelas públicas inspecionadas.
- [OK] Leitura privada de capturas e storage, segundo políticas existentes.
- [OK] Banco aceita as cinco categorias de fatos do SID.
- [OK] Regra de rejeição de análise desatualizada instalada.
- [OK] Limite de chamadas caras da IA instalado com RPC privada.
- [OK] Erros detalhados desativados da telemetria opcional em build de produção.
- [PRECISA DE REVISÃO MANUAL] Nenhuma chave privilegiada no histórico Git, incluindo branches antigas.
- [PRECISA DE REVISÃO MANUAL] Integrações OAuth reais de Google e OpenAI.
- [PRECISA DE REVISÃO MANUAL] Testes de autenticação, BOLA/IDOR e privacidade entre contas.
- [PRECISA DE REVISÃO MANUAL] MIME e tamanho de uploads por tipo.
- [PRECISA DE REVISÃO MANUAL] Headers HTTP, CORS, cookies/sessões e deploy final.
- [PRECISA DE REVISÃO MANUAL] Scanner de CVE e CI, alertas/monitoramento.
- [PRECISA DE REVISÃO MANUAL] Teste de extração real por IA sem dados pessoais de clientes.
- [FALHOU ANTERIORMENTE, CORRIGIDO] Categorias de fatos rejeitadas por `facts_kind_check`.

## AS 5 COISAS A FAZER ANTES DE LANÇAR

1. Testar duas contas distintas A/B em autenticacão, recursos e RPCs para excluir IDOR/BOLA.
2. Varredura completa do histórico Git e revisão de Secrets, com revogação de qualquer credencial antiga exposta.
3. Homologar uma reunião fictícia por modelo autorizado e verificar análise, identidade, aprovação e fatos; sem este teste o núcleo não está comprovado.
4. Testar downloads privados, MIME, tamanho e orçamento de storage com arquivos fictícios.
5. Revisar headers, CORS, configuração OAuth e monitoramento na implantação efetiva.

**Conclusão:** melhorias verificadas em banco/código, mas auditoria independente de segurança e teste de invasão ainda pendentes. Não declarar esta aplicação segura para produção sensível com base apenas nesta revisão.
