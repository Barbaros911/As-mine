-- =====================================================================
-- ASSISTANT DE PILOTAGE — la sentinelle, son état, et le journal
-- ---------------------------------------------------------------------
-- 02/10/2026, à la demande de Barbaros : savoir immédiatement ce qui se
-- passe, ce qui demande une intervention, et si une réservation a un
-- problème — sans toucher au tunnel de réservation.
--
-- TROIS TABLES, TOUTES FERMÉES À anon ET EN ÉCRITURE À authenticated.
-- Seules les fonctions serveur (clé service_role, dans les secrets
-- Supabase) y écrivent. L'exploitant peut les LIRE.
--   · sante_systeme      — le dernier passage de la relance et de la
--                          sentinelle (une ligne par tâche, réécrite).
--   · alertes_pilotage   — chaque anomalie de la sentinelle : quand elle a
--                          été dite, combien de fois, acquittée, réglée.
--                          C'est ce qui empêche de la répéter à chaque tour.
--   · journal_assistant  — chaque question et chaque geste de l'assistant,
--                          et chaque message refusé d'une autre conversation.
--
-- LA SENTINELLE : pg_cron appelle la fonction « pilotage » chaque minute.
-- Elle ne croit rien de l'appel (tout est relu en base) : l'appeler plus
-- souvent n'envoie rien de plus. LA CLÉ ÉCRITE ICI EST LA CLÉ PUBLIQUE DU
-- SITE, comme dans 20260930000000_relance_alertes.sql. Ne JAMAIS mettre ici
-- la clé service_role : ce fichier est public.
--
-- ORDRE : les fonctions doivent être DÉPLOYÉES avant de jouer ce fichier
-- (la fusion dans main les déploie). Sinon le webhook Telegram est reposé
-- par l'ancienne version, qui n'écoute que les boutons, et le bot ne
-- répond pas aux questions — rejouer alors ce fichier suffit.
--
-- Rejouable. Pour arrêter la sentinelle :
--   select cron.unschedule('ela-sentinelle');
-- =====================================================================

create table if not exists public.sante_systeme (
  cle text primary key,
  maj timestamptz not null default now()
);
alter table public.sante_systeme enable row level security;
revoke all on public.sante_systeme from anon, authenticated;
drop policy if exists "exploitant lit sante" on public.sante_systeme;
create policy "exploitant lit sante" on public.sante_systeme for select to authenticated using ((select public.est_exploitant()));
grant select on public.sante_systeme to authenticated;

create table if not exists public.alertes_pilotage (
  cle text primary key,
  course_ref text,
  gravite text not null check (gravite in ('critique','alerte')),
  texte text not null,
  premier_envoi timestamptz not null default now(),
  dernier_envoi timestamptz,
  dernier_statut text check (dernier_statut in ('envoye','echec')),
  nb_envois integer not null default 0,
  acquittee_jusqu_au timestamptz,
  resolue_le timestamptz
);
create index if not exists alertes_pilotage_ouvertes on public.alertes_pilotage(cle) where resolue_le is null;
alter table public.alertes_pilotage enable row level security;
revoke all on public.alertes_pilotage from anon, authenticated;
drop policy if exists "exploitant lit alertes pilotage" on public.alertes_pilotage;
create policy "exploitant lit alertes pilotage" on public.alertes_pilotage for select to authenticated using ((select public.est_exploitant()));
grant select on public.alertes_pilotage to authenticated;

create table if not exists public.journal_assistant (
  id bigint generated always as identity primary key,
  cree_le timestamptz not null default now(),
  canal text not null check (canal in ('telegram')),
  action text not null,
  detail text,
  statut text not null check (statut in ('ok','echec','refuse'))
);
alter table public.journal_assistant enable row level security;
revoke all on public.journal_assistant from anon, authenticated;
drop policy if exists "exploitant lit journal assistant" on public.journal_assistant;
create policy "exploitant lit journal assistant" on public.journal_assistant for select to authenticated using ((select public.est_exploitant()));
grant select on public.journal_assistant to authenticated;

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

select cron.unschedule(jobid) from cron.job where jobname = 'ela-sentinelle';
select cron.schedule(
  'ela-sentinelle',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://yyhzutnuhuytokarynaw.supabase.co/functions/v1/pilotage',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'sb_publishable_hNYqURatjlXc8tYC30XKpA_2VG91UAj',
      'Authorization', 'Bearer sb_publishable_hNYqURatjlXc8tYC30XKpA_2VG91UAj'),
    body := '{"type":"SENTINELLE"}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);

-- Le webhook Telegram écoute désormais aussi les MESSAGES (les questions),
-- plus seulement les boutons. Reposé par nouvelle-demande, avec le jeton du
-- bot qui ne quitte pas les secrets Supabase.
select net.http_post(
  url := 'https://yyhzutnuhuytokarynaw.supabase.co/functions/v1/nouvelle-demande',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'apikey', 'sb_publishable_hNYqURatjlXc8tYC30XKpA_2VG91UAj',
    'Authorization', 'Bearer sb_publishable_hNYqURatjlXc8tYC30XKpA_2VG91UAj'),
  body := '{"type":"INSTALLER_TELEGRAM"}'::jsonb,
  timeout_milliseconds := 20000
);

select jobid, jobname, schedule, active from cron.job where jobname in ('ela-sentinelle','ela-relance-alertes');
