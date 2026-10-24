-- ============================================================================
-- LA DOUBLE VÉRIFICATION DE L'ADMIN (24 octobre 2026, P1 sécurité)
-- ----------------------------------------------------------------------------
-- LE TROU. Un seul compte ouvre tout l'admin (noms, téléphones et adresses
-- des clients, prix, réglages), et il n'est protégé que par un mot de passe.
-- Un mot de passe qui fuit suffisait.
--
-- LA RÈGLE. Un compte qui a activé un code à 6 chiffres (Supabase MFA, TOTP)
-- n'est plus reconnu comme exploitant avec son seul mot de passe : la session
-- doit être de niveau « aal2 » (mot de passe + code). Le contrôle vit dans
-- est_exploitant() et est_admin(), que TOUTES les règles d'accès et TOUTES
-- les fonctions de l'admin appellent déjà (aucune ne lit « operateurs » en
-- direct, vérifié dans le dépôt le 24/10) : un seul endroit, aucun oubli.
-- Une ancienne session ouverte au mot de passe seul reste « aal1 », même
-- renouvelée : elle est refusée dès que le code existe. Aucun contournement.
--
-- LE CLIQUET. « double_verification_exigee » (faux ici) étend la règle aux
-- comptes qui n'ont PAS encore de code. Il ne se lève que par
-- 20261024000100_double_verification_obligatoire.sql, qui refuse de le
-- faire tant qu'un opérateur actif n'a pas son code : il ne peut enfermer
-- personne dehors.
--
-- REJOUABLE : create or replace, if not exists, aucune donnée touchée.
-- PROTÉGÉE : si est_exploitant() ou est_admin() en production ne ressemble
-- pas à ce que dit le dépôt (pas de lecture d'« operateurs »), la migration
-- s'arrête AVANT de rien changer, plutôt que d'écraser une règle inconnue.
-- RETOUR ARRIÈRE : rejouer les deux définitions de
-- 20261024000900_double_verification_retour.sql (dans le même dossier).
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

-- ── le réglage : une seule ligne, lisible par personne ─────────────────────
create table if not exists public.securite_admin (
  id boolean primary key default true check (id),
  double_verification_exigee boolean not null default false,
  modifie_le timestamptz not null default now()
);
insert into public.securite_admin(id) values (true) on conflict (id) do nothing;
alter table public.securite_admin enable row level security;
revoke all on table public.securite_admin from public, anon, authenticated;

-- ── le juge du niveau de session ──────────────────────────────────────────
-- SECURITY DEFINER parce que « auth.mfa_factors » n'est pas lisible par un
-- compte connecté ; il ne lit QUE les facteurs de l'appelant (auth.uid()) et
-- ne rend qu'un booléen. search_path vide : chaque nom est qualifié.
create or replace function public.ela_session_suffisante()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2'
      or (
        not exists (
          select 1 from auth.mfa_factors f
          where f.user_id = (select auth.uid()) and f.status = 'verified')
        and not coalesce(
          (select s.double_verification_exigee from public.securite_admin s where s.id),
          false)
      );
$$;
revoke all on function public.ela_session_suffisante() from public, anon;
grant execute on function public.ela_session_suffisante() to authenticated, service_role;

-- ── les deux portes : même corps qu'avant, plus le niveau de session ───────
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

select 'double vérification posée' as etat,
       (select double_verification_exigee from public.securite_admin where id) as exigee_pour_tous;
