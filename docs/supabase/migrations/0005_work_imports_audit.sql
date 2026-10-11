-- 0005 · Oportunidades, tarefas, follow-ups, importações e auditoria.

create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  title text not null, need text, resources text, third_party text,
  scores jsonb not null default '{}'::jsonb,
  recommendation text check (recommendation in ('RESOLVER','CONECTAR','ADIAR','ENCERRAR')),
  decision text, status text not null default 'aberta' check (status in ('aberta','em_decisao','decidida')),
  review_at date,
  source public.source_kind not null default 'manual',
  source_capture_id uuid references public.captures(id) on delete set null,
  owner_id uuid not null default auth.uid() references auth.users(id),
  visibility public.visibility not null default 'equipe',
  project_id uuid references public.projects(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint opportunities_project_chk check (visibility <> 'projeto' or project_id is not null)
);
create index if not exists opportunities_owner_idx on public.opportunities(owner_id, status);

create table if not exists public.opportunity_people (
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  primary key (opportunity_id, person_id)
);
create index if not exists opportunity_people_person_idx on public.opportunity_people(person_id);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  status text not null default 'a_fazer' check (status in ('a_fazer','fazendo','aguardando','feito')),
  priority public.priority not null default 'media',
  due_date date, completed_at timestamptz,
  assignee_id uuid references auth.users(id),
  person_id uuid references public.people(id) on delete set null,
  opportunity_id uuid references public.opportunities(id) on delete set null,
  source public.source_kind not null default 'manual',
  source_message_id uuid references public.sid_messages(id) on delete set null,
  owner_id uuid not null default auth.uid() references auth.users(id),
  visibility public.visibility not null default 'equipe',
  project_id uuid references public.projects(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint tasks_project_chk check (visibility <> 'projeto' or project_id is not null)
);
create index if not exists tasks_assignee_idx on public.tasks(assignee_id, status, due_date);
create index if not exists tasks_owner_idx on public.tasks(owner_id, status);

create table if not exists public.followups (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id) on delete cascade,
  reason text, due_date date, result text, done_at timestamptz,
  assignee_id uuid references auth.users(id),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists followups_person_idx on public.followups(person_id, due_date);
create index if not exists followups_assignee_idx on public.followups(assignee_id, due_date);

create table if not exists public.imports (
  id uuid primary key default gen_random_uuid(),
  file_name text, row_count int,
  status text not null default 'revisar' check (status in ('revisar','aplicado','descartado')),
  owner_id uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.import_rows (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references public.imports(id) on delete cascade,
  raw jsonb not null,
  action text check (action in ('criar','mesclar','ignorar')),
  person_id uuid references public.people(id) on delete set null,
  result text,
  created_at timestamptz not null default now()
);
create index if not exists import_rows_import_idx on public.import_rows(import_id);

-- Auditoria: só triggers escrevem; só admin lê; ninguém altera/apaga.
-- Decisão LGPD: registra NOMES das colunas alteradas, nunca os valores.
create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid, table_name text not null, row_id text, action text not null,
  changed_columns text[], at timestamptz not null default now()
);
create index if not exists audit_log_at_idx on public.audit_log(at desc);
create index if not exists audit_log_row_idx on public.audit_log(table_name, row_id);

create or replace function private.audit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare cols text[];
begin
  if tg_op = 'UPDATE' then
    select array_agg(n.key) into cols from jsonb_each(to_jsonb(new)) n
      where n.value is distinct from (to_jsonb(old) -> n.key);
  end if;
  insert into public.audit_log(actor_id, table_name, row_id, action, changed_columns)
  values ((select auth.uid()), tg_table_name,
          coalesce(to_jsonb(coalesce(new, old)) ->> 'id', null), tg_op, cols);
  return coalesce(new, old);
end $$;
revoke all on function private.audit() from public, anon, authenticated;

create or replace function private.can_read_import(_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.imports i where i.id = _id and i.owner_id = (select auth.uid())) and private.is_member() $$;
-- Revoke pontual (o revoke global removeria EXECUTE de authenticated; mantê-lo é obrigatório).
revoke execute on function private.can_read_import(uuid) from public, anon;
grant execute on function private.can_read_import(uuid) to authenticated;

grant select, insert, update, delete on public.opportunities, public.opportunity_people, public.tasks,
  public.followups, public.imports, public.import_rows to authenticated;
grant select on public.audit_log to authenticated;
grant all on public.opportunities, public.opportunity_people, public.tasks, public.followups,
  public.imports, public.import_rows, public.audit_log to service_role;
revoke all on public.opportunities, public.opportunity_people, public.tasks, public.followups,
  public.imports, public.import_rows, public.audit_log from anon;

alter table public.opportunities enable row level security;
alter table public.opportunity_people enable row level security;
alter table public.tasks enable row level security;
alter table public.followups enable row level security;
alter table public.imports enable row level security;
alter table public.import_rows enable row level security;
alter table public.audit_log enable row level security;

drop policy if exists audit_log_admin_select on public.audit_log;
create policy audit_log_admin_select on public.audit_log for select to authenticated using (private.has_role('admin'));

-- Responsável pela tarefa pode ler e atualizar mesmo sem ser dono.
drop policy if exists tasks_assignee_select on public.tasks;
create policy tasks_assignee_select on public.tasks for select to authenticated
  using (private.is_member() and assignee_id = (select auth.uid()));
drop policy if exists tasks_assignee_update on public.tasks;
create policy tasks_assignee_update on public.tasks for update to authenticated
  using (private.is_member() and assignee_id = (select auth.uid()))
  with check (private.is_member() and assignee_id = (select auth.uid()));

-- Follow-ups: via pessoa, ou responsável.
drop policy if exists followups_select on public.followups;
create policy followups_select on public.followups for select to authenticated
  using (private.can_read_person(person_id) or (private.is_member() and assignee_id = (select auth.uid())));
drop policy if exists followups_write on public.followups;
create policy followups_write on public.followups for all to authenticated
  using (private.can_write_person(person_id) or (private.is_member() and assignee_id = (select auth.uid())))
  with check (private.can_write_person(person_id) or (private.is_member() and assignee_id = (select auth.uid())));

drop policy if exists opportunity_people_select on public.opportunity_people;
create policy opportunity_people_select on public.opportunity_people for select to authenticated
  using (private.can_read_person(person_id) and exists (select 1 from public.opportunities o
    where o.id = opportunity_id and private.can_read(o.owner_id, o.visibility, o.project_id)));
drop policy if exists opportunity_people_write on public.opportunity_people;
create policy opportunity_people_write on public.opportunity_people for all to authenticated
  using (exists (select 1 from public.opportunities o where o.id = opportunity_id
    and private.can_write(o.owner_id, o.visibility, o.project_id)))
  with check (private.can_read_person(person_id) and exists (select 1 from public.opportunities o
    where o.id = opportunity_id and private.can_write(o.owner_id, o.visibility, o.project_id)));

-- Importações: estritamente do autor.
drop policy if exists imports_owner on public.imports;
create policy imports_owner on public.imports for all to authenticated
  using (private.is_member() and owner_id = (select auth.uid()))
  with check (private.is_member() and owner_id = (select auth.uid()));
drop policy if exists import_rows_owner on public.import_rows;
create policy import_rows_owner on public.import_rows for all to authenticated
  using (private.can_read_import(import_id))
  with check (private.can_read_import(import_id) and (person_id is null or private.can_write_person(person_id)));
