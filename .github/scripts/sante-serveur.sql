-- LE CHIEN DE GARDE (2 octobre 2026). Lecture seule, une seule ligne JSON,
-- lue par .github/scripts/chien-de-garde.mjs toutes les 15 minutes.
-- AUCUNE donnée personnelle : des comptes et des secondes.
-- MÊME TEXTE que la fonction « ela_sante_mesures » du voyant de l'admin
-- (migration 20261004010000) : test-chien-de-garde.mjs les compare.
-- Telegram : « indisponible » (secret absent ou mal nommé) compte comme un
-- échec, et une ligne « vue » (course ouverte dans l'admin, bouton « Vu »)
-- n'est pas un envoi réussi — elle porte pourtant canal « telegram » et
-- statut « envoye » (relecture du 4 octobre 2026).
-- La relance et la notification ELA (25 octobre 2026, migration
-- 20261025000000) : « relance_ok_s » lit le battement que la fonction écrit
-- à chaque tour réussi — pg_cron se dit « réussi » dès la mise en file, même
-- quand la fonction répond 401 ; la notification ELA (l'alarme) compte ses
-- envois et ses appareils abonnés. Même remarque que pour journal_depots :
-- sans la migration, cette requête échoue, l'Issue se ferme seule ensuite.
-- Les dépôts refusés (9 octobre 2026) : « journal_depots », écrit par
-- deposer-course à chaque refus — code, motif, référence, jamais de donnée
-- personnelle. Migration 20261009000000, à appliquer aussitôt après la
-- fusion qui porte ce fichier : sans la table, cette requête échoue et le
-- chien de garde ouvre une Issue « réponse illisible », qui se ferme seule.
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
     where code < 500 and motif <> 'quota' and cree_le >= now() - interval '1 hour'),
  'relance_ok_s', (
    select round(extract(epoch from now() - b.le)) from public.ela_battements b where b.nom = 'relance'),
  'push_ok_1h', (
    select count(*) from public.journal_notifications_admin
     where canal = 'push' and statut = 'envoye' and cree_le >= now() - interval '1 hour'),
  'push_echecs_1h', (
    select count(*) from public.journal_notifications_admin
     where canal = 'push' and statut in ('echec', 'indisponible', 'aucun_abonne')
       and cree_le >= now() - interval '1 hour'),
  'abonnes_push', (
    select count(*) from public.abonnements_admin where actif)
) as sante;
