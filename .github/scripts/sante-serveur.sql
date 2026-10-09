-- LE CHIEN DE GARDE (2 octobre 2026). Lecture seule, une seule ligne JSON,
-- lue par .github/scripts/chien-de-garde.mjs toutes les 15 minutes.
-- AUCUNE donnée personnelle : des comptes et des secondes.
-- MÊME TEXTE que la fonction « ela_sante_mesures » du voyant de l'admin
-- (migration 20261004010000) : test-chien-de-garde.mjs les compare.
-- Telegram : « indisponible » (secret absent ou mal nommé) compte comme un
-- échec, et une ligne « vue » (course ouverte dans l'admin, bouton « Vu »)
-- n'est pas un envoi réussi — elle porte pourtant canal « telegram » et
-- statut « envoye » (relecture du 4 octobre 2026).
-- Les dépôts refusés (9 octobre 2026) : « journal_depots », écrit par
-- deposer-course à chaque refus — code, motif, référence, jamais de donnée
-- personnelle. Migration 20261009000000 ; sans elle, cette requête échoue.
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
     where canal = 'telegram' and statut in ('echec', 'indisponible') and cree_le >= now() - interval '1 hour'),
  'telegram_ok_1h', (
    select count(*) from public.journal_notifications_admin
     where canal = 'telegram' and statut = 'envoye' and type_evenement <> 'vue'
       and cree_le >= now() - interval '1 hour'),
  'demandes_24h', (
    select count(*) from public.courses
     where cree_le >= now() - interval '24 hours'
       and (bon->'securite'->>'empreinteDepot') is not null),
  'depots_indisponibles_1h', (
    select count(*) from public.journal_depots
     where code >= 500 and cree_le >= now() - interval '1 hour'),
  'depots_quota_1h', (
    select count(*) from public.journal_depots
     where motif = 'quota' and cree_le >= now() - interval '1 hour'),
  'depots_refuses_1h', (
    select count(*) from public.journal_depots
     where code < 500 and motif <> 'quota' and cree_le >= now() - interval '1 hour')
) as sante;
