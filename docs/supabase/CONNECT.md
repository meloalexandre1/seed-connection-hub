# Backend do Seed Connection

Estado atual: **Lovable Cloud conectado e schema aplicado** (a pedido do proprietário). As migrações `migrations/0001` … `0007` foram aplicadas ao backend gerenciado (23 tabelas em `public`, RLS ativo em todas, buckets privados `captures` e `sid-attachments` criados). O app ainda roda em modo demonstração (`DATA_MODE = "demo"` em `src/services/index.ts`) até a troca tela por tela.

> Nota: este documento foi escrito para um Supabase externo. Com o Lovable Cloud, os passos de conexão manual (OAuth, chaves, painel Supabase) não se aplicam; a validação de login e políticas continua válida.

## Pendente para ativar o uso real
1. Convidar o proprietário e até 5 pessoas: Cloud → Users.
2. Bootstrap do primeiro admin (auditável), via SQL: `select private.bootstrap_first_admin('email@do-proprietario');`
3. Trocar `src/services` do demo para o backend, tela por tela, removendo os avisos "demo".


## 1. Criar o projeto Supabase (pelo proprietário)
1. Em supabase.com, crie um projeto **novo e exclusivo** para o Seed Connection (região São Paulo, recomendado para LGPD).
2. **Authentication → Sign In / Providers**: desative *Allow new users to sign up* (somente convites). Mantenha e-mail ativo.
3. **Authentication → URL Configuration**: inclua a URL do preview e, depois, a publicada.
4. **Settings → API → Exposed schemas**: deixe apenas `public` (e `graphql_public`). **Nunca** exponha `private`.

## 2. Aplicar o schema (SQL Editor do Supabase)
Revise e rode, em ordem, `migrations/0001` … `0007` (ou `schema.sql`, que é a concatenação). Todos são idempotentes.
`schema.sql` é gerado: edite as migrações e regenere.

## 3. Primeiro administrador (auditável)
1. **Authentication → Users → Invite user** com o e-mail do proprietário; aceite o convite.
2. No SQL Editor: `select private.bootstrap_first_admin('email@do-proprietario');`
   Só funciona se não houver admin; grava `BOOTSTRAP_ADMIN` em `audit_log`.
3. Demais pessoas (máx. 5): convite pelo painel + o admin insere o papel em `user_roles`. O banco recusa o 7º usuário.

## 4. Conectar no Lovable
1. No editor Lovable: **More → Cloud → “Already have a Supabase project? Connect it here”** (ou **Connectors → Supabase**).
2. Autorize via OAuth a **organização** Supabase que contém o projeto e selecione o projeto criado.
3. Não ative o Lovable Cloud. Não cole chaves no chat nem no código: o app usa só a chave publicável; `service_role` nunca vai para o navegador nem para o repositório.
4. Depois disso, peça para trocar a camada `src/services` do demo para o Supabase, tela por tela.

## 5. Validar
**Login**: usuário convidado entra; e-mail não convidado não consegue se cadastrar.
**Políticas** (SQL Editor, simulando usuários):
```sql
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"<uuid-do-usuario>","role":"authenticated"}';
select count(*) from public.people;   -- só o que esse usuário pode ver
rollback;
```
Checklist esperado (já verificado em banco local de teste com dados fictícios):
- Não membro (sem `user_roles`) vê 0 linhas em tudo; `anon` recebe *permission denied*.
- Registro `privado` só aparece para o dono — nem o admin vê.
- `equipe`: membros leem; só dono, gestor ou admin editam; operacional não edita registros alheios.
- Ninguém cria registro em nome de outro (`owner_id` precisa ser o próprio).
- Usuário não insere mensagem `assistant` no SID; só o backend.
- `audit_log` só é lido por admin e não aceita escrita direta.
- Storage: upload só em `<seu-uuid>/...`; leitura do próprio arquivo ou de arquivo ligado a registro visível.
**CRUD**: com um usuário de teste, crie, leia, edite e apague uma pessoa e uma tarefa fictícias; repita com outro papel.

## Decisões e tradeoffs
- **Admin não lê dados privados** de outros usuários (privacidade); só registros `equipe`/`projeto`.
- **Auditoria sem valores**: grava quais colunas mudaram, não o conteúdo (minimiza dados pessoais).
- Funções `SECURITY DEFINER` ficam só no schema `private`, com `search_path` vazio e `EXECUTE` revogado de `public/anon`.
- Filhas (contatos, fatos, interações, transcrições) herdam o acesso da pessoa/captura.
- `processing_jobs` e respostas do SID só são escritos pelo backend (`service_role`, servidor).
- Limite de 6 usuários (proprietário + 5) garantido por trigger.

## Riscos pendentes
- Transcrição/IA, workers e URLs assinadas ainda não existem (precisam de funções de servidor).
- Exportação/exclusão de dados do titular (LGPD) ainda sem fluxo na UI.
- Policies de Storage não foram testadas no Supabase real (só em simulação local).
- Gestor pode editar registros `equipe` de outros: revise se é o desejado.
