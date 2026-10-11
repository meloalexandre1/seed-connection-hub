-- 0004 · Capturas, transcrições, jobs, interações e fatos (com origem e status de revisão).

create table if not exists public.captures (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id),
  visibility public.visibility not null default 'privado',
  project_id uuid references public.projects(id) on delete set null,
  source public.source_kind not null default 'manual',
  kind text not null check (kind in ('audio','arquivo','foto','nota','plaud','video')),
  status text not null default 'esperando'
    check (status in ('esperando','enviando','processando','revisar','concluido','erro')),
  title text, note text,
  captured_at timestamptz, received_at timestamptz not null default now(),
  storage_path text unique,   -- <user_id>/<capture_id>/<arquivo> no bucket captures
  mime text, size_bytes bigint check (size_bytes >= 0), content_hash text,
  external_id text, error text,
  source_message_id uuid references public.sid_messages(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint captures_project_chk check (visibility <> 'projeto' or project_id is not null),
  constraint captures_external_uq unique (owner_id, source, external_id)
);
create index if not exists captures_owner_idx on public.captures(owner_id, received_at desc);
create index if not exists captures_status_idx on public.captures(status);
create index if not exists captures_hash_idx on public.captures(owner_id, content_hash);

create table if not exists public.transcripts (
  id uuid primary key default gen_random_uuid(),
  capture_id uuid not null references public.captures(id) on delete cascade,
  text text, segments jsonb, provider text, language text,
  status public.review_status not null default 'extraido',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists transcripts_capture_idx on public.transcripts(capture_id);

-- Somente o backend (service_role) cria/atualiza jobs; membros só leem.
create table if not exists public.processing_jobs (
  id uuid primary key default gen_random_uuid(),
  capture_id uuid not null references public.captures(id) on delete cascade,
  step text not null, status text not null default 'pendente'
    check (status in ('pendente','executando','concluido','erro')),
  attempts int not null default 0, last_error text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists processing_jobs_capture_idx on public.processing_jobs(capture_id);
create index if not exists processing_jobs_status_idx on public.processing_jobs(status, created_at);

create table if not exists public.interactions (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id) on delete cascade,
  occurred_at timestamptz, kind text check (kind in ('reuniao','ligacao','mensagem','nota','captura')),
  summary text, confidence numeric check (confidence between 0 and 1),
  source public.source_kind not null default 'manual',
  source_capture_id uuid references public.captures(id) on delete set null,
  source_message_id uuid references public.sid_messages(id) on delete set null,
  status public.review_status not null default 'aprovado',
  reviewed_by uuid references auth.users(id), reviewed_at timestamptz,
  author_id uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists interactions_person_idx on public.interactions(person_id, occurred_at desc);

create table if not exists public.facts (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id) on delete cascade,
  kind text not null check (kind in ('necessidade','habilidade','recurso','outro')),
  text text not null,
  is_inference boolean not null default false, -- separa fato de inferência
  confidence numeric check (confidence between 0 and 1),
  source public.source_kind not null default 'manual',
  source_capture_id uuid references public.captures(id) on delete set null,
  source_message_id uuid references public.sid_messages(id) on delete set null,
  status public.review_status not null default 'sugerido',
  reviewed_by uuid references auth.users(id), reviewed_at timestamptz,
  author_id uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists facts_person_idx on public.facts(person_id, status);

create or replace function private.can_read_capture(_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.captures c where c.id = _id and private.can_read(c.owner_id, c.visibility, c.project_id)) $$;
create or replace function private.can_write_capture(_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.captures c where c.id = _id and private.can_write(c.owner_id, c.visibility, c.project_id)) $$;
revoke all on all functions in schema private from public, anon;
grant execute on function private.can_read_capture(uuid), private.can_write_capture(uuid) to authenticated;

grant select, insert, update, delete on public.captures, public.transcripts, public.interactions, public.facts to authenticated;
grant select on public.processing_jobs to authenticated;
grant all on public.captures, public.transcripts, public.processing_jobs, public.interactions, public.facts to service_role;
revoke all on public.captures, public.transcripts, public.processing_jobs, public.interactions, public.facts from anon;

alter table public.captures enable row level security;
alter table public.transcripts enable row level security;
alter table public.processing_jobs enable row level security;
alter table public.interactions enable row level security;
alter table public.facts enable row level security;

-- Caminho do arquivo precisa estar na pasta do próprio usuário.
drop policy if exists captures_path_restrict on public.captures;
create policy captures_path_restrict on public.captures as restrictive for insert to authenticated
  with check (storage_path is null or split_part(storage_path, '/', 1) = (select auth.uid())::text);

drop policy if exists processing_jobs_select on public.processing_jobs;
create policy processing_jobs_select on public.processing_jobs for select to authenticated
  using (private.can_read_capture(capture_id));
