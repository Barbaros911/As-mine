-- ============================================================================
-- LE VOYANT DES ALERTES — epreuves sur un vrai PostgreSQL.
--
-- Ce qui compte : un visiteur anonyme ne lit RIEN, un exploitant lit les
-- mesures, et les mesures disent vrai — une demande du site sans alerte
-- reussie est comptee, une demande alertee ou saisie par l'exploitant ne
-- l'est pas, et la relance pg_cron est lue.
--
-- Le schema « cron » n'existe que chez Supabase : on en pose un faux, avec
-- les seules colonnes que lit la fonction. La migration est appliquee APRES
-- ce fichier (voir le workflow) ; les blocs d'epreuve sont dans
-- sante-alertes-apres.sql.
-- ============================================================================
create schema if not exists cron;
create table if not exists cron.job(
  jobid bigint primary key, jobname text, active boolean);
create table if not exists cron.job_run_details(
  runid bigint generated always as identity primary key,
  jobid bigint, status text, start_time timestamptz, end_time timestamptz);

-- Le journal des alertes, tel que le cree 20260916090000_admin_push_notifications.sql.
create table if not exists public.journal_notifications_admin (
  id bigint generated always as identity primary key,
  type_evenement text not null,
  course_ref text,
  canal text not null check (canal in ('push','telegram','email')),
  statut text not null check (statut in ('envoye','echec','indisponible','aucun_abonne')),
  detail text,
  cree_le timestamptz not null default now());

-- Le socle ne porte pas la date de creation des courses ; la fonction la lit.
alter table public.courses add column if not exists cree_le timestamptz not null default now();
