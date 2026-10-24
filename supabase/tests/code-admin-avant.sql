-- ============================================================================
-- LE CODE ADMIN — le décor, posé AVANT la migration (24/10/2026)
-- On repose ce que Supabase fournit et que la migration lit : auth.uid(),
-- auth.jwt() (le jeton de l'appel, d'où vient « session_id »), pgcrypto dans
-- « extensions », et les deux portes TELLES QUE LE DÉPÔT LES DÉCRIT
-- (20260915_operator_auth_server, 20260929030000_role_agent_serveur), sous
-- la vraie RLS d'« operateurs ». Puis on exige que LE TROU SE REPRODUISE :
-- un admin entre au mot de passe seul. Sans cette preuve, l'épreuve d'après
-- ne prouverait rien.
-- ============================================================================
create schema if not exists auth;
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role; end if;
end $$;
grant usage on schema public, auth to anon, authenticated, service_role;

-- Comme chez Supabase : tout part des « claims » du jeton de l'appel.
create or replace function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif((select auth.jwt()) ->> 'sub', '')::uuid $$;

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.operateurs(
  user_id uuid primary key,
  role text not null check (role in ('admin','agent_reservation')),
  actif boolean not null default true,
  cree_le timestamptz not null default now());
alter table public.operateurs enable row level security;
revoke all on public.operateurs from anon, authenticated;
grant select on public.operateurs to authenticated;
create policy "lire son propre droit" on public.operateurs
  for select to authenticated using (user_id = (select auth.uid()));

-- Les comptes : 1 admin (aura un code) · 2 agent (aura un code) · 3 admin
-- sans code · 4 un compte connecté qui n'est pas opérateur · 5 admin
-- suspendu (aura un code) · 6 admin sans code.
insert into public.operateurs(user_id, role, actif) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'admin', true),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'agent_reservation', true),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'admin', true),
  ('aaaaaaaa-0000-0000-0000-000000000005', 'admin', false),
  ('aaaaaaaa-0000-0000-0000-000000000006', 'admin', true);
-- Les deux portes, comme dans le dépôt.
create or replace function public.est_exploitant() returns boolean
language sql stable security invoker set search_path = public as $$
  select exists (select 1 from public.operateurs o
                 where o.user_id = (select auth.uid()) and o.actif); $$;
revoke all on function public.est_exploitant() from public, anon;
grant execute on function public.est_exploitant() to authenticated, service_role;
create or replace function public.est_admin() returns boolean
language sql stable set search_path = public as $$
  select exists (select 1 from public.operateurs o
                 where o.user_id = (select auth.uid()) and o.actif and o.role = 'admin'); $$;
revoke all on function public.est_admin() from public, anon;
grant execute on function public.est_admin() to authenticated;

-- Ce qu'elles gardent : une table sous RLS (comme « courses ») et une
-- fonction « definer » réservée à l'admin (comme « ela_registre_resume »).
create table if not exists public.courses(ref text primary key, statut text, bon jsonb);
alter table public.courses enable row level security;
revoke all on public.courses from anon, authenticated;
grant select, update on public.courses to authenticated;
create policy "lecture exploitant" on public.courses for select to authenticated
  using ((select public.est_exploitant()));
create policy "maj exploitant" on public.courses for update to authenticated
  using ((select public.est_exploitant())) with check ((select public.est_exploitant()));
insert into public.courses values ('ELA-26-10-AAAAA', 'attente', '{"client":{"nom":"Sonde"}}');

create or replace function public.sonde_admin() returns integer
language plpgsql security definer set search_path = public as $$
begin
  if not public.est_admin() then raise exception 'acces_refuse' using errcode = '42501'; end if;
  return (select count(*) from public.courses);
end $$;
revoke all on function public.sonde_admin() from public, anon;
grant execute on function public.sonde_admin() to authenticated;

-- Un appel = un jeton. « essai_jeton » pose ses claims, comme PostgREST :
-- le compte et la session de connexion (« session_id » chez Supabase).
create or replace function public.essai_jeton(p_uid text, p_session text) returns void
language sql as $$
  select set_config('request.jwt.claims',
    case when p_uid is null then '{}' else
      jsonb_strip_nulls(jsonb_build_object('sub', p_uid, 'session_id', p_session, 'role', 'authenticated'))::text end, false); $$;
grant execute on function public.essai_jeton(text, text) to anon, authenticated;

-- LE TROU, AVANT LA MIGRATION : l'admin 1 entre au mot de passe seul.
select public.essai_jeton('aaaaaaaa-0000-0000-0000-000000000001', 'mdp');
set role authenticated;
do $$ begin
  if not public.est_exploitant() then
    raise exception 'DÉCOR FAUX : avant la migration, le mot de passe seul devrait suffire';
  end if;
  if (select count(*) from public.courses) is distinct from 1 then
    raise exception 'DÉCOR FAUX : avant la migration, la course devrait être lisible au mot de passe seul';
  end if;
end $$;
reset role;
select 'décor posé : le mot de passe seul ouvre l''admin (le trou est reproduit)' as etat;
