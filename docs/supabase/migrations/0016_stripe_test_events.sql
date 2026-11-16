-- Stripe sandbox inbox; not applied to the hosted DB until reviewed.
-- This migration intentionally does not process payments into business records.
create table if not exists public.stripe_test_events (
  event_id text primary key check (event_id ~ '^evt_[A-Za-z0-9]+$'),
  type text not null,
  stripe_object_id text not null,
  stripe_customer_id text,
  received_at timestamptz not null default now()
);
create index if not exists stripe_test_events_type_received_idx
  on public.stripe_test_events(type, received_at desc);
alter table public.stripe_test_events enable row level security;
revoke all on public.stripe_test_events from public, anon, authenticated;
grant select, insert, update on public.stripe_test_events to service_role;
-- No user policies: webhook server-side service-role only.
