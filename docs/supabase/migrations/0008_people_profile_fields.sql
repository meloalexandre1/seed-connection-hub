-- 0008: campos de perfil de pessoas (aditivo, idempotente)
alter table public.people add column if not exists relationship_type text;
alter table public.people add column if not exists context text;
alter table public.people add column if not exists needs text[] not null default '{}';
alter table public.people add column if not exists skills text[] not null default '{}';
alter table public.people add column if not exists next_action text;
