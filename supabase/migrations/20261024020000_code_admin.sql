-- ============================================================================
-- LE CODE ADMIN À 6 CHIFFRES (24 octobre 2026, P1 sécurité)
-- ----------------------------------------------------------------------------
-- REMPLACE l'application de codes (Supabase MFA, TOTP), jugée trop
-- compliquée par Barbaros : « ajoute juste un code à 6 chiffres que je vais
-- choisir ». 20261024000000 (et son cliquet, son retour) n'ont jamais été
-- appliqués ; leurs fichiers sont retirés. Si elle l'avait été, celle-ci la
-- remplace entièrement (create or replace).
--
-- LE TROU. Un seul compte ouvre tout l'admin, protégé par un mot de passe
-- seul : un mot de passe qui fuit suffisait.
--
-- LA RÈGLE. Un compte qui a choisi son code n'est reconnu comme exploitant
-- que dans une SESSION où ce code a été tapé juste. Le code est vérifié ICI,
-- jamais dans la page ; il n'est gardé que sous forme d'empreinte (bcrypt).
-- La session est celle du jeton Supabase (« session_id ») : une nouvelle
-- connexion redemande le code, un renouvellement de jeton ne le redemande
-- pas. Le contrôle vit dans est_exploitant() et est_admin(), que TOUTES les
-- règles d'accès et TOUTES les fonctions de l'admin appellent déjà.
--
-- LES ESSAIS. 5 codes faux de suite bloquent le compte 15 minutes (un code à
-- 6 chiffres, c'est un million de possibilités : sans limite, il tomberait).
--
-- LE CLIQUET. « double_verification_exigee » (faux ici) étend la règle aux
-- comptes qui n'ont PAS encore de code. Il ne se lève que par
-- 20261024020100_code_admin_obligatoire.sql, qui refuse tant qu'un
-- opérateur actif n'a pas son code : il ne peut enfermer personne dehors.
--
-- CODE OUBLIÉ : SECURITE-ADMIN-CODE.md (une ligne dans l'éditeur SQL de
-- Supabase efface le code ; on en choisit un neuf à la connexion suivante).
--
-- REJOUABLE : create or replace, if not exists, aucune donnée effacée.
-- PROTÉGÉE : si est_exploitant() ou est_admin() en production ne lisent pas
-- « operateurs » comme le dit le dépôt, elle s'arrête AVANT de rien changer.
-- RETOUR ARRIÈRE : 20261024020900_code_admin_retour.sql.
-- ============================================================================

do $$
declare
  f text;
  def text;
begin
  foreach f in array array['public.est_exploitant()', 'public.est_admin()'] loop
    if to_regprocedure(f) is null then
      raise exception '% introuvable : rien n''a été changé. Lancer 20261003010000_inventaire_schema.sql.', f;
    end if;
    def := pg_get_functiondef(to_regprocedure(f));
    if position('operateurs' in def) = 0 or position('actif' in def) = 0 then
      raise exception '% ne lit pas « operateurs » comme le dit le dépôt : rien n''a été changé. Lire sa définition réelle avant d''aller plus loin.', f;
    end if;
  end loop;
end $$;

-- bcrypt. Chez Supabase, pgcrypto vit dans le schéma « extensions ».
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

-- ── le réglage : une seule ligne, lisible par personne ─────────────────────
create table if not exists public.securite_admin (
  id boolean primary key default true check (id),
  double_verification_exigee boolean not null default false,
  modifie_le timestamptz not null default now()
);
insert into public.securite_admin(id) values (true) on conflict (id) do nothing;
alter table public.securite_admin enable row level security;
revoke all on table public.securite_admin from public, anon, authenticated;

-- ── le code de chaque compte : son empreinte, jamais le code ──────────────
create table if not exists public.codes_admin (
  user_id uuid primary key,
  empreinte text not null,
  essais_faux integer not null default 0,
  bloque_jusqua timestamptz,
  modifie_le timestamptz not null default now()
);
alter table public.codes_admin enable row level security;
revoke all on table public.codes_admin from public, anon, authenticated;

-- ── les sessions où le code a été tapé juste ──────────────────────────────
create table if not exists public.sessions_admin (
  session_id text not null,
  user_id uuid not null,
  ouverte_le timestamptz not null default now(),
  primary key (session_id, user_id)
);
alter table public.sessions_admin enable row level security;
revoke all on table public.sessions_admin from public, anon, authenticated;

-- ── le juge de la session ─────────────────────────────────────────────────
-- SECURITY DEFINER parce que les deux tables ci-dessus ne sont lisibles par
-- personne ; il ne lit QUE la ligne de l'appelant et ne rend qu'un booléen.
-- search_path vide : chaque nom est qualifié.
create or replace function public.ela_session_suffisante()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
           select 1 from public.sessions_admin s
           where s.user_id = (select auth.uid())
             and s.session_id = coalesce((select auth.jwt()) ->> 'session_id', '')
             and s.ouverte_le > now() - interval '30 days')
      or (
        not exists (select 1 from public.codes_admin c where c.user_id = (select auth.uid()))
        and not coalesce(
          (select s.double_verification_exigee from public.securite_admin s where s.id),
          false)
      );
$$;
revoke all on function public.ela_session_suffisante() from public, anon;
grant execute on function public.ela_session_suffisante() to authenticated, service_role;

-- ── les deux portes : même corps qu'avant, plus le juge ───────────────────
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
  ) and (select public.ela_session_suffisante());
$$;
revoke all on function public.est_exploitant() from public, anon;
grant execute on function public.est_exploitant() to authenticated, service_role;

create or replace function public.est_admin()
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1 from public.operateurs o
    where o.user_id = (select auth.uid()) and o.actif and o.role = 'admin'
  ) and (select public.ela_session_suffisante());
$$;
revoke all on function public.est_admin() from public, anon;
grant execute on function public.est_admin() to authenticated;

-- ── ce que l'écran de connexion a besoin de savoir ────────────────────────
-- « non » (pas opérateur, ou pas connecté), « suspendu », « aucun » (pas de
-- code, il peut en choisir un), « a_choisir » (pas de code, et le serveur
-- l'exige), « a_saisir », « bloque » (trop d'essais), « ok » (session
-- confirmée). Un compte qui n'est pas opérateur n'apprend rien d'autre.
create or replace function public.ela_code_admin_etat()
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_actif boolean;
  v_code public.codes_admin%rowtype;
begin
  if v_uid is null then return 'non'; end if;
  select o.actif into v_actif from public.operateurs o where o.user_id = v_uid;
  if v_actif is null then return 'non'; end if;
  if not v_actif then return 'suspendu'; end if;
  select * into v_code from public.codes_admin c where c.user_id = v_uid;
  if not found then
    return case when coalesce((select s.double_verification_exigee from public.securite_admin s where s.id), false)
                then 'a_choisir' else 'aucun' end;
  end if;
  if public.ela_session_suffisante() then return 'ok'; end if;
  if v_code.bloque_jusqua is not null and v_code.bloque_jusqua > now() then return 'bloque'; end if;
  return 'a_saisir';
end $$;
revoke all on function public.ela_code_admin_etat() from public, anon;
grant execute on function public.ela_code_admin_etat() to authenticated;

-- ── taper son code ────────────────────────────────────────────────────────
-- Rend « ok », « faux », « bloque », « aucun » ou « non ». Jamais d'erreur
-- levée sur un code faux : le compte des essais doit RESTER écrit.
create or replace function public.ela_code_admin_verifier(p_code text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_session text := coalesce((select auth.jwt()) ->> 'session_id', '');
  v_code public.codes_admin%rowtype;
begin
  if v_uid is null or v_session = ''
     or not exists (select 1 from public.operateurs o where o.user_id = v_uid and o.actif) then
    return 'non';
  end if;
  select * into v_code from public.codes_admin c where c.user_id = v_uid for update;
  if not found then return 'aucun'; end if;
  if v_code.bloque_jusqua is not null and v_code.bloque_jusqua > now() then return 'bloque'; end if;
  if coalesce(p_code, '') ~ '^[0-9]{6}$'
     and extensions.crypt(p_code, v_code.empreinte) = v_code.empreinte then
    update public.codes_admin set essais_faux = 0, bloque_jusqua = null where user_id = v_uid;
    delete from public.sessions_admin where ouverte_le < now() - interval '30 days';
    insert into public.sessions_admin(session_id, user_id) values (v_session, v_uid)
      on conflict (session_id, user_id) do update set ouverte_le = now();
    return 'ok';
  end if;
  if v_code.essais_faux + 1 >= 5 then
    update public.codes_admin set essais_faux = 0, bloque_jusqua = now() + interval '15 minutes'
     where user_id = v_uid;
    return 'bloque';
  end if;
  update public.codes_admin set essais_faux = essais_faux + 1 where user_id = v_uid;
  return 'faux';
end $$;
revoke all on function public.ela_code_admin_verifier(text) from public, anon;
grant execute on function public.ela_code_admin_verifier(text) to authenticated;

-- ── choisir ou changer son code ───────────────────────────────────────────
-- Un premier code : tout opérateur actif connecté. Le CHANGER : seulement
-- dans une session où l'ancien a été tapé juste (sinon un mot de passe volé
-- suffirait à le remplacer). La session courante est confirmée d'office :
-- on vient de prouver qu'on connaît le code.
-- Rend « ok », « format » (pas 6 chiffres), « code_requis » ou « non ».
create or replace function public.ela_code_admin_choisir(p_code text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_session text := coalesce((select auth.jwt()) ->> 'session_id', '');
begin
  if v_uid is null or v_session = ''
     or not exists (select 1 from public.operateurs o where o.user_id = v_uid and o.actif) then
    return 'non';
  end if;
  if coalesce(p_code, '') !~ '^[0-9]{6}$' then return 'format'; end if;
  if exists (select 1 from public.codes_admin c where c.user_id = v_uid)
     and not exists (select 1 from public.sessions_admin s
                     where s.user_id = v_uid and s.session_id = v_session
                       and s.ouverte_le > now() - interval '30 days') then
    return 'code_requis';
  end if;
  insert into public.codes_admin(user_id, empreinte)
    values (v_uid, extensions.crypt(p_code, extensions.gen_salt('bf', 10)))
    on conflict (user_id) do update
      set empreinte = excluded.empreinte, essais_faux = 0, bloque_jusqua = null, modifie_le = now();
  -- Un code changé ferme les AUTRES sessions confirmées : un appareil
  -- oublié quelque part redemandera le nouveau code.
  delete from public.sessions_admin where user_id = v_uid and session_id <> v_session;
  insert into public.sessions_admin(session_id, user_id) values (v_session, v_uid)
    on conflict (session_id, user_id) do update set ouverte_le = now();
  return 'ok';
end $$;
revoke all on function public.ela_code_admin_choisir(text) from public, anon;
grant execute on function public.ela_code_admin_choisir(text) to authenticated;

select 'code admin posé' as etat,
       (select double_verification_exigee from public.securite_admin where id) as exige_pour_tous;
