-- Additive, non-destructive private Web Push subscriptions.
-- Each signed-in user controls only their own devices. The scheduled sender
-- runs with a separate service-role secret and is never callable from browser.
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_success_at timestamptz,
  constraint push_endpoint_known_provider check (
    endpoint like 'https://%' and
    split_part(split_part(endpoint, '://', 2), '/', 1)
       in ('fcm.googleapis.com', 'updates.push.services.mozilla.com', 'web.push.apple.com')
  ),
  constraint push_endpoint_length check (length(endpoint) between 40 and 2048),
  constraint push_keys_length check (
    length(p256dh) between 40 and 180 and length(auth) between 12 and 180
  )
);
create index if not exists push_subscriptions_user_idx
 on public.push_subscriptions(user_id) where enabled;

alter table public.push_subscriptions enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='push_subscriptions' and policyname='push_device_select') then
    create policy push_device_select on public.push_subscriptions
      for select to authenticated using (user_id = (select auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='push_subscriptions' and policyname='push_device_insert') then
    create policy push_device_insert on public.push_subscriptions
      for insert to authenticated with check (user_id = (select auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='push_subscriptions' and policyname='push_device_update') then
    create policy push_device_update on public.push_subscriptions
      for update to authenticated using (user_id = (select auth.uid()))
        with check (user_id = (select auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='push_subscriptions' and policyname='push_device_delete') then
    create policy push_device_delete on public.push_subscriptions
      for delete to authenticated using (user_id = (select auth.uid()));
  end if;
end $$;

grant select,insert,update,delete on public.push_subscriptions to authenticated;

-- Private idempotency ledger for the server-only dispatcher. RLS blocks
-- authenticated and anonymous users; only service_role can access it.
create table if not exists public.push_deliveries (
  id bigint generated always as identity primary key,
  subscription_id uuid not null references public.push_subscriptions(id) on delete cascade,
  event_key text not null,
  status text not null default 'reserved'
    check (status in ('reserved','sent','failed')),
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  constraint push_delivery_dedup unique(subscription_id,event_key)
);
create index if not exists push_deliveries_created_idx
  on public.push_deliveries(created_at);
alter table public.push_deliveries enable row level security;
revoke all on public.push_deliveries from public,anon,authenticated;
grant all on public.push_deliveries to service_role;
grant usage,select on sequence public.push_deliveries_id_seq to service_role;
