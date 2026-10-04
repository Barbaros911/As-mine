-- LE VOYANT DES ALERTES — 4 octobre 2026, à la demande de Barbaros
-- (« Ok voyant »). Le chien de garde GitHub juge toutes les 15 min si les
-- alertes partent : demandes sans alerte réussie, relance pg_cron, Telegram.
-- GitHub ne le réveille pas à l'heure (6 passages en 21 h au lieu de 84).
-- L'admin lit maintenant les MÊMES mesures, et les juge avec la même règle
-- (admin-sante.js), chaque fois qu'il relit le serveur.
--
-- DEUX FONCTIONS, ET C'EST VOULU.
--   « ela_sante_mesures » rend les mesures. Elle n'est accordée à PERSONNE :
--   seule « ela_sante_alertes » (même propriétaire) peut l'appeler.
--   « ela_sante_alertes » vérifie d'abord que l'appelant est un exploitant,
--   puis rend les mesures. Elle est accordée à « authenticated » seulement.
-- Un visiteur anonyme ne lit rien : même si ces mesures ne portent que des
-- comptes et des secondes, elles disent quand l'exploitant ne reçoit plus
-- ses alertes — c'est-à-dire quand il ne regarde pas.
--
-- LE CORPS EST CELUI DE .github/scripts/sante-serveur.sql, À L'IDENTIQUE.
-- test-chien-de-garde.mjs compare les deux textes : le chien de garde et le
-- voyant ne doivent jamais mesurer deux choses différentes. Le chien de
-- garde garde sa propre requête pour ne pas dépendre de l'application de ce
-- fichier en production.
--
-- « security definer » : la fonction lit cron.job et cron.job_run_details
-- (la relance pg_cron) et le journal des alertes, que l'exploitant ne lit
-- pas directement. Elle tourne avec les droits de son propriétaire, celui
-- qui applique les migrations — le même rôle que celui qui lit ces tables
-- pour le chien de garde. « search_path » est figé, comme sur toutes les
-- fonctions de ce type du dépôt.
--
-- EN « plpgsql », PAS EN « sql » : une fonction « sql » est vérifiée à sa
-- création, et le schéma « cron » n'existe que chez Supabase. L'épreuve en
-- CI (supabase/tests/sante-alertes.sql) en pose un faux.
--
-- RIEN N'EST ÉCRIT : lecture seule, aucune donnée personnelle.
-- À APPLIQUER EN PRODUCTION après la fusion (workflow « Appliquer une
-- migration Supabase », ce fichier). Tant que ce n'est pas fait, le voyant
-- reste gris (« Alertes : non vérifiées ») : il ne prétend rien.
create or replace function public.ela_sante_mesures()
returns json language plpgsql stable security definer
set search_path = public, pg_temp as $f$
begin
  return (
select json_build_object(
  'sans_alerte', (
    select count(*) from public.courses c
     where c.statut = 'attente'
       and (c.bon->'securite'->>'empreinteDepot') is not null
       and c.cree_le between now() - interval '6 hours' and now() - interval '2 minutes'
       and not exists (select 1 from public.journal_notifications_admin j
                        where j.course_ref = c.ref and j.statut = 'envoye')),
  'relance_active', coalesce((select active from cron.job where jobname = 'ela-relance-alertes'), false),
  'derniere_relance_s', (
    select round(extract(epoch from now() - max(r.end_time)))
      from cron.job j join cron.job_run_details r on r.jobid = j.jobid
     where j.jobname = 'ela-relance-alertes'),
  'relances_echouees_15min', (
    select count(*) from cron.job j join cron.job_run_details r on r.jobid = j.jobid
     where j.jobname = 'ela-relance-alertes' and r.status <> 'succeeded'
       and r.start_time >= now() - interval '15 minutes'),
  'telegram_echecs_1h', (
    select count(*) from public.journal_notifications_admin
     where canal = 'telegram' and statut = 'echec' and cree_le >= now() - interval '1 hour'),
  'telegram_ok_1h', (
    select count(*) from public.journal_notifications_admin
     where canal = 'telegram' and statut = 'envoye' and cree_le >= now() - interval '1 hour'),
  'demandes_24h', (
    select count(*) from public.courses
     where cree_le >= now() - interval '24 hours'
       and (bon->'securite'->>'empreinteDepot') is not null)
)
  );
end $f$;
revoke all on function public.ela_sante_mesures() from public, anon, authenticated;

create or replace function public.ela_sante_alertes()
returns json language plpgsql stable security definer
set search_path = public, pg_temp as $f$
begin
  if not public.est_exploitant() then raise exception 'acces_refuse'; end if;
  return public.ela_sante_mesures();
end $f$;
revoke all on function public.ela_sante_alertes() from public, anon;
grant execute on function public.ela_sante_alertes() to authenticated;
