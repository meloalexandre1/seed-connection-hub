-- 0001 · Fundação: schema privado, enums, papéis da equipe, funções auxiliares.
-- Idempotente. NÃO executado. Revisar antes de aplicar em um Supabase NOVO e exclusivo.

-- Schema privado: NÃO deve ser adicionado aos "Exposed schemas" da API.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated; -- necessário para as políticas chamarem as funções

do $$ begin create type public.app_role as enum ('admin','gestor','operacional'); exception when duplicate_object then null; end $$;
do $$ begin create type public.visibility as enum ('privado','equipe','projeto'); exception when duplicate_object then null; end $$;
do $$ begin create type public.proximity as enum ('multidao','seguidor','discipulo','amigo_proximo','amigo_intimo'); exception when duplicate_object then null; end $$;
do $$ begin create type public.priority as enum ('alta','media','baixa'); exception when duplicate_object then null; end $$;
do $$ begin create type public.review_status as enum ('extraido','sugerido','aprovado','rejeitado'); exception when duplicate_object then null; end $$;
do $$ begin create type public.source_kind as enum ('manual','captura','sid','importacao','plaud','integracao'); exception when duplicate_object then null; end $$;

-- Papéis: um registro por usuário convidado. Sem papel = sem acesso a nada.
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  granted_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (user_id)
);

-- Funções auxiliares (SECURITY DEFINER apenas no schema privado, search_path vazio).
create or replace function private.is_member() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.user_roles r where r.user_id = (select auth.uid())) $$;

create or replace function private.has_role(_role public.app_role) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.user_roles r where r.user_id = (select auth.uid()) and r.role = _role) $$;

create or replace function private.is_manager() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.user_roles r where r.user_id = (select auth.uid()) and r.role in ('admin','gestor')) $$;

create or replace function private.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;

-- owner_id só muda por admin.
create or replace function private.protect_owner() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.owner_id is distinct from old.owner_id and not private.has_role('admin') then
    raise exception 'owner_id só pode ser alterado por administrador';
  end if;
  return new;
end $$;

-- Limite: proprietário + 5 colaboradores (6 usuários) e nunca ficar sem admin.
create or replace function private.guard_user_roles() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' and (select count(*) from public.user_roles) >= 6 then
    raise exception 'Limite de 6 usuários (proprietário + 5) atingido';
  end if;
  if tg_op in ('UPDATE','DELETE') and old.role = 'admin'
     and (tg_op = 'DELETE' or new.role <> 'admin')
     and (select count(*) from public.user_roles where role = 'admin') <= 1 then
    raise exception 'Não é permitido remover o último administrador';
  end if;
  return coalesce(new, old);
end $$;

drop trigger if exists trg_guard_user_roles on public.user_roles;
create trigger trg_guard_user_roles before insert or update or delete on public.user_roles
  for each row execute function private.guard_user_roles();

revoke all on all functions in schema private from public, anon;
grant execute on function private.is_member(), private.has_role(public.app_role), private.is_manager() to authenticated;

grant select, insert, update, delete on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
revoke all on public.user_roles from anon;
alter table public.user_roles enable row level security;
drop policy if exists user_roles_select on public.user_roles;
create policy user_roles_select on public.user_roles for select to authenticated
  using (user_id = (select auth.uid()) or private.has_role('admin'));
drop policy if exists user_roles_admin_insert on public.user_roles;
create policy user_roles_admin_insert on public.user_roles for insert to authenticated
  with check (private.has_role('admin') and granted_by = (select auth.uid()));
drop policy if exists user_roles_admin_update on public.user_roles;
create policy user_roles_admin_update on public.user_roles for update to authenticated
  using (private.has_role('admin')) with check (private.has_role('admin'));
drop policy if exists user_roles_admin_delete on public.user_roles;
create policy user_roles_admin_delete on public.user_roles for delete to authenticated
  using (private.has_role('admin'));
