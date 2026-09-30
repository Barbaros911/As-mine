-- =====================================================================
-- RAPPEL ET RATTRAPAGE DES ALERTES — cadence d'urgence, côté serveur
-- ---------------------------------------------------------------------
-- 30/09/2026, à la demande de Barbaros : « recevoir toutes les courses en
-- temps et en heure sur admin et Telegram ». Le webhook INSERT annonce la
-- demande à l'instant où elle arrive ; s'il tombe (fonction en panne,
-- Telegram muet une seconde), rien ne la rattrapait.
-- Toutes les 20 secondes, pg_cron appelle « nouvelle-demande » avec
-- {"type":"RELANCE"} : la fonction relit les courses en attente et envoie
--   · le RATTRAPAGE d'une demande de plus d'1 min jamais annoncée ;
--   · Telegram ET notification toutes les 3 min si le départ est à H-30
--     ou moins, toutes les 10 min entre H-2 et H-30 ;
--   · aucun rappel avant H-2 (l'annonce initiale est déjà partie) ;
--   · arrêt immédiat si elle est vue, confirmée ou refusée.
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

-- « VU » DEPUIS L'ADMIN. Ouvrir la course dans l'admin arrête les rappels :
-- l'admin l'inscrit au journal par cette fonction (le journal lui est fermé
-- en écriture, et doit le rester). Le canal est « telegram » parce que ce
-- sont les rappels Telegram qu'on arrête ; le détail dit d'où vient le geste.
create or replace function public.ela_marquer_vue(p_ref text)
returns void language plpgsql security definer set search_path = public, pg_temp as $f$
begin
  if not public.est_exploitant() then raise exception 'acces_refuse'; end if;
  if p_ref is null or p_ref !~ '^[A-Z]{2,4}-[0-9A-Z-]{4,26}$' then raise exception 'reference_invalide'; end if;
  insert into public.journal_notifications_admin(type_evenement, course_ref, canal, statut, detail)
    values ('vue', p_ref, 'telegram', 'envoye', 'ouverte dans l''admin');
end $f$;
revoke all on function public.ela_marquer_vue(text) from public, anon;
grant execute on function public.ela_marquer_vue(text) to authenticated;

-- LE BOUTON « VU » DE TELEGRAM : on pose une fois l'adresse où Telegram
-- envoie l'appui (fonction telegram-bot). « nouvelle-demande » le fait
-- elle-même avec le jeton du bot, qui ne quitte pas les secrets Supabase.
select net.http_post(
  url := 'https://yyhzutnuhuytokarynaw.supabase.co/functions/v1/nouvelle-demande',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'apikey', 'sb_publishable_hNYqURatjlXc8tYC30XKpA_2VG91UAj',
    'Authorization', 'Bearer sb_publishable_hNYqURatjlXc8tYC30XKpA_2VG91UAj'),
  body := '{"type":"INSTALLER_TELEGRAM"}'::jsonb,
  timeout_milliseconds := 20000
);

-- Ce que la tâche est devenue, lisible dans le journal du workflow.
select jobid, jobname, schedule, active from cron.job where jobname = 'ela-relance-alertes';
