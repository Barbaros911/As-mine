-- ELA Transfer : authentification + autorisation explicite.
-- IMPORTANT : cette migration ne crée aucun exploitant automatiquement.
-- L'ajout du premier user_id dans operateurs se fait côté serveur, jamais
-- dans le dépôt public.

create table if not exists public.operateurs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'exploitant' check (role in ('exploitant','admin')),
  actif boolean not null default true,
  cree_le timestamptz not null default now()
);

alter table public.operateurs enable row level security;
revoke all on table public.operateurs from anon, authenticated;
grant select on table public.operateurs to authenticated;

drop policy if exists "lire son propre droit" on public.operateurs;
create policy "lire son propre droit" on public.operateurs
for select to authenticated
using (user_id = (select auth.uid()));

create or replace function public.est_exploitant()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1 from public.operateurs o
    where o.user_id = (select auth.uid()) and o.actif
  );
$$;

revoke all on function public.est_exploitant() from public;
revoke all on function public.est_exploitant() from anon;
grant execute on function public.est_exploitant() to authenticated;
grant execute on function public.est_exploitant() to service_role;

alter policy "lecture exploitant" on public.courses
  using ((select public.est_exploitant()));

alter policy "maj exploitant" on public.courses
  using ((select public.est_exploitant()))
  with check ((select public.est_exploitant()));

alter policy "l exploitant depose aussi" on public.courses
  with check ((select public.est_exploitant()));
