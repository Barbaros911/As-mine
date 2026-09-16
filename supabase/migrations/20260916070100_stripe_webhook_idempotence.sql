create table if not exists public.stripe_evenements (
  event_id text primary key,
  event_type text not null,
  payment_intent_id text,
  recu_le timestamptz not null default now()
);
alter table public.stripe_evenements enable row level security;
revoke all on public.stripe_evenements from anon, authenticated;
comment on table public.stripe_evenements is 'Déduplication technique des webhooks Stripe ; service_role uniquement.';
