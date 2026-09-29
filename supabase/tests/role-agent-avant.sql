-- ============================================================================
-- LE RÔLE AGENT — le décor, posé AVANT la migration.
-- On remplace les bouchons du socle par les vraies définitions relevées en
-- production (diagnostic 20260929020000) : un opérateur par rôle, et
-- auth.uid() réglable pour jouer l'un ou l'autre.
-- ============================================================================
create table if not exists public.operateurs(
  user_id uuid primary key,
  role text not null check (role in ('admin','agent_reservation')),
  actif boolean not null default true,
  cree_le timestamptz not null default now()
);
insert into public.operateurs(user_id, role) values
  ('aaaaaaaa-0000-0000-0000-000000000001','admin'),
  ('aaaaaaaa-0000-0000-0000-000000000002','agent_reservation');

create or replace function auth.uid() returns uuid
  language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;

create or replace function public.est_exploitant() returns boolean
  language sql stable as $$
  select exists (select 1 from public.operateurs o
                 where o.user_id = (select auth.uid()) and o.actif) $$;

grant usage on schema public, auth to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- L'état de production avant la migration : RLS active et policies
-- « est_exploitant » (20260916064000_admin_v2_core). Sans elles, la
-- migration poserait ses policies sur une table sans RLS et le test
-- passerait sans rien vérifier.
alter table public.parametres_commerciaux enable row level security;
create policy "admin ela lecture" on public.parametres_commerciaux for select to authenticated using ((select public.est_exploitant()));
create policy "admin ela insertion" on public.parametres_commerciaux for insert to authenticated with check ((select public.est_exploitant()));
create policy "admin ela modification" on public.parametres_commerciaux for update to authenticated using ((select public.est_exploitant())) with check ((select public.est_exploitant()));
create policy "admin ela suppression" on public.parametres_commerciaux for delete to authenticated using ((select public.est_exploitant()));
