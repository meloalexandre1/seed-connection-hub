-- Seed Connection · schema PROPOSTO para o Supabase EXTERNO do proprietário.
-- NÃO aplicado. Revisar antes de rodar. Todas as tabelas com RLS.

create type public.app_role as enum ('admin', 'gestor', 'operacional');
create type public.visibility as enum ('privado', 'equipe', 'projeto');
create type public.proximity as enum ('multidao','seguidor','discipulo','amigo_proximo','amigo_intimo');
create type public.priority as enum ('alta','media','baixa');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);
create or replace function public.has_role(_uid uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _uid and role = _role) $$;
create or replace function public.is_member(_uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _uid) $$;

create table public.people (
  id uuid primary key default gen_random_uuid(),
  name text, aliases text[] default '{}', city text, sphere text,
  proximity public.proximity default 'multidao',
  priority public.priority default 'media',
  owner_id uuid not null references auth.users(id) default auth.uid(),
  visibility public.visibility not null default 'privado',
  last_interaction_at timestamptz, next_followup_at timestamptz,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create table public.contact_methods (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id) on delete cascade,
  kind text not null check (kind in ('telefone','email','outro')),
  value_raw text not null, value_normalized text,
  created_at timestamptz default now()
);
create table public.organizations (id uuid primary key default gen_random_uuid(), name text not null, created_at timestamptz default now());
create table public.people_organizations (person_id uuid references public.people(id) on delete cascade, organization_id uuid references public.organizations(id) on delete cascade, role text, primary key (person_id, organization_id));
create table public.relationships (id uuid primary key default gen_random_uuid(), a uuid references public.people(id) on delete cascade, b uuid references public.people(id) on delete cascade, kind text, evidence text, created_at timestamptz default now());

create table public.captures (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) default auth.uid(),
  source text not null, kind text not null,
  status text not null default 'esperando' check (status in ('esperando','enviando','processando','revisar','concluido','erro')),
  captured_at timestamptz, received_at timestamptz default now(),
  storage_path text, content_hash text, external_id text,
  visibility public.visibility not null default 'privado',
  error text, unique (source, external_id)
);
create table public.transcripts (id uuid primary key default gen_random_uuid(), capture_id uuid references public.captures(id) on delete cascade, text text, segments jsonb, provider text, created_at timestamptz default now());
create table public.processing_jobs (id uuid primary key default gen_random_uuid(), capture_id uuid references public.captures(id) on delete cascade, step text, status text, attempts int default 0, last_error text, created_at timestamptz default now());

create table public.interactions (id uuid primary key default gen_random_uuid(), person_id uuid references public.people(id) on delete cascade, capture_id uuid references public.captures(id), occurred_at timestamptz, kind text, summary text, confidence numeric, author_id uuid default auth.uid(), created_at timestamptz default now());
create table public.facts (id uuid primary key default gen_random_uuid(), person_id uuid references public.people(id) on delete cascade, kind text check (kind in ('necessidade','habilidade','recurso','outro')), text text not null, status text default 'sugerido' check (status in ('sugerido','aprovado','rejeitado')), source_capture_id uuid references public.captures(id), created_at timestamptz default now());

create table public.opportunities (id uuid primary key default gen_random_uuid(), title text not null, need text, resources text, third_party text, scores jsonb, recommendation text, decision text, owner_id uuid default auth.uid(), review_at date, created_at timestamptz default now());
create table public.tasks (id uuid primary key default gen_random_uuid(), title text not null, status text default 'a_fazer', priority public.priority default 'media', due_date date, assignee_id uuid references auth.users(id), person_id uuid references public.people(id), opportunity_id uuid references public.opportunities(id), created_by uuid default auth.uid(), created_at timestamptz default now(), completed_at timestamptz);
create table public.followups (id uuid primary key default gen_random_uuid(), person_id uuid references public.people(id) on delete cascade, reason text, due_date date, assignee_id uuid references auth.users(id), result text, created_at timestamptz default now());

create table public.imports (id uuid primary key default gen_random_uuid(), file_name text, author_id uuid default auth.uid(), created_at timestamptz default now());
create table public.import_rows (id uuid primary key default gen_random_uuid(), import_id uuid references public.imports(id) on delete cascade, raw jsonb not null, action text, person_id uuid references public.people(id), result text);
create table public.audit_log (id bigint generated always as identity primary key, actor_id uuid, table_name text, row_id uuid, action text, diff jsonb, at timestamptz default now());

-- RLS (padrão: privado = só dono; equipe = membros). Repetir para as demais tabelas.
alter table public.people enable row level security;
create policy people_select on public.people for select to authenticated
  using (owner_id = auth.uid() or (visibility = 'equipe' and public.is_member(auth.uid())));
create policy people_insert on public.people for insert to authenticated with check (owner_id = auth.uid());
create policy people_update on public.people for update to authenticated using (owner_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy people_delete on public.people for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

alter table public.captures enable row level security;
create policy captures_owner on public.captures for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

alter table public.user_roles enable row level security;
create policy roles_self on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

-- Storage: bucket privado 'captures'; caminho <user_id>/<capture_id>/arquivo; acesso por URL assinada.
