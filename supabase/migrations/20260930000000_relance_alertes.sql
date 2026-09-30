-- =====================================================================
-- RAPPEL ET RATTRAPAGE DES ALERTES — toutes les 20 s, côté serveur
-- ---------------------------------------------------------------------
-- 30/09/2026, à la demande de Barbaros : « recevoir toutes les courses en
-- temps et en heure sur admin et Telegram ». Le webhook INSERT annonce la
-- demande à l'instant où elle arrive ; s'il tombe (fonction en panne,
-- Telegram muet une seconde), rien ne la rattrapait.
-- Toutes les 20 secondes, pg_cron appelle « nouvelle-demande » avec
-- {"type":"RELANCE"} : la fonction relit les courses en attente et envoie
--   · le RATTRAPAGE d'une demande de plus d'1 min jamais annoncée ;
--   · un RAPPEL TELEGRAM toutes les 20 s tant qu'elle reste en attente,
--     30 min au plus (30/09/2026, à sa demande : « toutes les 20 secondes ») ;
--   · une notification du téléphone toutes les 10 min, 3 au plus.
-- « 20 seconds » : la syntaxe des intervalles courts de pg_cron (1.5 et
-- plus). Si la base la refuse, le journal du workflow le dira — remettre
-- alors '* * * * *' (une fois par minute).
-- La cadence est tenue par le journal, pas par cet appel : l'appeler plus
-- souvent n'enverrait rien de plus.
--
-- LA CLÉ ÉCRITE ICI EST LA CLÉ PUBLIQUE DU SITE (celle d'index.html). Elle
-- ne donne rien de plus que ce que la page publique donne déjà ; la
-- fonction relit tout avec ses propres droits. Ne JAMAIS mettre ici la clé
-- service_role : ce fichier est public.
--
-- Rejouable : on retire la tâche avant de la reposer.
-- Pour l'arrêter : select cron.unschedule('ela-relance-alertes');
-- =====================================================================
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

select cron.unschedule(jobid) from cron.job where jobname = 'ela-relance-alertes';

select cron.schedule(
  'ela-relance-alertes',
  '20 seconds',
  $$
  select net.http_post(
    url := 'https://yyhzutnuhuytokarynaw.supabase.co/functions/v1/nouvelle-demande',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'sb_publishable_hNYqURatjlXc8tYC30XKpA_2VG91UAj',
      'Authorization', 'Bearer sb_publishable_hNYqURatjlXc8tYC30XKpA_2VG91UAj'),
    body := '{"type":"RELANCE"}'::jsonb,
    timeout_milliseconds := 20000
  );
  $$
);

-- Ce que la tâche est devenue, lisible dans le journal du workflow.
select jobid, jobname, schedule, active from cron.job where jobname = 'ela-relance-alertes';
