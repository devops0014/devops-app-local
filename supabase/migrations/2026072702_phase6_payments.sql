-- Phase 6: secure, idempotent payment processing.
create table if not exists public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider = 'razorpay'),
  provider_event_id text not null,
  event_type text not null,
  processed_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);

alter table public.payment_webhook_events enable row level security;
-- Intentionally no client policies. Webhooks use the service role.

create index if not exists subscriptions_user_status_idx
  on public.subscriptions(user_id, status);
create index if not exists payments_user_created_idx
  on public.payments(user_id, created_at desc);

-- A user may only have one active provider subscription reference.
create unique index if not exists subscriptions_provider_reference_idx
  on public.subscriptions(provider, provider_subscription_id)
  where provider_subscription_id is not null;
