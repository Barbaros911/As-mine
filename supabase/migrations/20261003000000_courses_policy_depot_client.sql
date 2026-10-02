-- =====================================================================
-- COURSES : SUPPRIMER LA POLICY ANONYME PAR SON VRAI NOM
-- ---------------------------------------------------------------------
-- Audit du 2 octobre 2026. La migration 20260928120000 a fait deux choses :
--   drop policy if exists "un client peut deposer sa demande" — SANS EFFET,
--     parce qu'en production la policy s'appelle « depot client » (relevé le
--     15/09 par 20260915_diagnostic_courses.sql : « policy | depot client |
--     cmd=INSERT | roles={anon} ») ;
--   revoke insert, update, delete on public.courses from anon — EXÉCUTÉ.
-- Résultat : anon ne peut plus rien écrire (PostgreSQL vérifie le droit sur
-- la table avant même de lire les policies), mais la policy reste affichée
-- dans le tableau de bord — c'est ce que Barbaros voyait comme « encore
-- active ». Elle est inerte… tant que personne ne refait « grant insert on
-- courses to anon » ou ne rejoue le script d'origine de SUPABASE.md : ce
-- jour-là, elle rouvrirait l'écriture libre, au prix de son choix, sans
-- quota, en contournant deposer-course. On la retire donc pour de bon.
--
-- NE PAS APPLIQUER AVANT LES TROIS RÉSERVATIONS RÉELLES DU 10 OCTOBRE
-- (site public, client easyHotel, réception) : c'est la consigne de
-- Barbaros. Fonctionnellement rien ne change — les 12 demandes du site des
-- 7 derniers jours portent toutes l'empreinte que seule deposer-course pose,
-- et toutes sont postérieures au revoke du 29/09 — mais la preuve se fait
-- avant, pas après.
--
-- Rejouable : « if exists » partout. Le revoke est répété par ceinture.
-- Aucune donnée touchée. Les policies de l'exploitant (authenticated,
-- est_exploitant()) ne bougent pas.
-- =====================================================================
drop policy if exists "depot client" on public.courses;
drop policy if exists "un client peut deposer sa demande" on public.courses;
revoke insert, update, delete on table public.courses from anon;

-- Ce qui reste sur la table, lisible dans le journal du workflow : il ne
-- doit plus y avoir AUCUNE ligne « roles={anon} ».
select 'policy | ' || policyname || ' | cmd=' || cmd || ' | roles=' || roles::text as info
  from pg_policies where schemaname = 'public' and tablename = 'courses'
union all
select 'grant  | ' || grantee || ' | ' || privilege_type
  from information_schema.role_table_grants
 where table_schema = 'public' and table_name = 'courses' and grantee in ('anon', 'authenticated')
order by 1;
