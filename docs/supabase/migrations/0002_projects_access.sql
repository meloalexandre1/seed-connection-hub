-- 0002 · Projetos e regras centrais de acesso por owner/visibilidade.

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  goal text,
  status text not null default 'ativo' check (status in ('ativo','pausado','concluido')),
  progress int not null default 0 check (progress between 0 and 100),
  risk text,
  owner_id uuid not null default auth.uid() references auth.users(id),
  visibility public.visibility not null default 'equipe',
  project_id uuid generated always as (id) stored, -- permite reutilizar a mesma regra
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  added_by uuid default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);
create index if not exists project_members_user_idx on public.project_members(user_id);

create or replace function private.is_project_member(_project uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.project_members pm
                 where pm.project_id = _project and pm.user_id = (select auth.uid())) $$;

-- Leitura: privado = só dono; equipe = membros; projeto = membros do projeto.
-- Decisão: admin NÃO lê registros privados de outros (privacidade > conveniência).
create or replace function private.can_read(_owner uuid, _vis public.visibility, _project uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.is_member() and (
    _owner = (select auth.uid())
    or _vis = 'equipe'
    or (_vis = 'projeto' and private.is_project_member(_project))
  ) $$;

-- Edição: dono, ou admin/gestor em registros não privados que consegue ler.
create or replace function private.can_write(_owner uuid, _vis public.visibility, _project uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.is_member() and (
    _owner = (select auth.uid())
    or (_vis <> 'privado' and private.is_manager() and private.can_read(_owner, _vis, _project))
  ) $$;

-- Exclusão: dono, ou admin em registros não privados.
create or replace function private.can_delete(_owner uuid, _vis public.visibility, _project uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.is_member() and (
    _owner = (select auth.uid())
    or (_vis <> 'privado' and private.has_role('admin') and private.can_read(_owner, _vis, _project))
  ) $$;

revoke all on all functions in schema private from public, anon;
grant execute on function private.is_project_member(uuid),
  private.can_read(uuid, public.visibility, uuid),
  private.can_write(uuid, public.visibility, uuid),
  private.can_delete(uuid, public.visibility, uuid) to authenticated;

grant select, insert, update, delete on public.projects, public.project_members to authenticated;
grant all on public.projects, public.project_members to service_role;
revoke all on public.projects, public.project_members from anon;

alter table public.projects enable row level security;
alter table public.project_members enable row level security;

drop policy if exists project_members_select on public.project_members;
create policy project_members_select on public.project_members for select to authenticated
  using (exists (select 1 from public.projects p where p.id = project_id
                 and private.can_read(p.owner_id, p.visibility, p.id)));
drop policy if exists project_members_manage on public.project_members;
create policy project_members_manage on public.project_members for all to authenticated
  using (exists (select 1 from public.projects p where p.id = project_id
                 and private.can_write(p.owner_id, p.visibility, p.id)))
  with check (exists (select 1 from public.projects p where p.id = project_id
                 and private.can_write(p.owner_id, p.visibility, p.id))
              and exists (select 1 from public.user_roles r where r.user_id = project_members.user_id));
-- Políticas de public.projects são aplicadas em 0006 (mesmo padrão das demais tabelas com dono).
