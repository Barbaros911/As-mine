-- =====================================================================
-- LE SECRET DE LA RELANCE — fabriqué dans la base, lu des deux côtés
-- ---------------------------------------------------------------------
-- 19/10/2026, audit (P2). Barbaros : « Vas-y pour le 2 », puis « Fais-le
-- toi-même » : donc AUCUN geste de sa part, aucune valeur à coller.
-- RELANCE et INSTALLER_TELEGRAM de « nouvelle-demande » étaient joignables
-- par quiconque a la clé publique du site (elle est dans la page). Rien à
-- lire ni à voler : appeler la relance en boucle ne fait que relire le
-- journal (aucun message de plus, la cadence vient du journal) ; reposer
-- le webhook du bot en boucle peut faire ralentir le bot par Telegram, et
-- le bouton « Vu » avec. Une nuisance possible, pas une faille.
--
-- CE QUE FAIT CETTE MIGRATION :
--   1. elle FABRIQUE un secret de 64 signes dans le coffre (Vault),
--      « ela_relance_secret », s'il n'existe pas encore — rejouée, elle le
--      garde : les deux côtés le lisent, il n'a jamais à tourner ;
--   2. elle pose la RPC « ela_relance_secret() », qui rend cette valeur à
--      la SEULE clé de service (anon et un compte connecté sont refusés) :
--      c'est par elle que la fonction apprend ce qu'elle doit exiger ;
--   3. la tâche pg_cron envoie l'en-tête « x-ela-relance », lu dans le
--      coffre AU MOMENT DE CHAQUE APPEL : la valeur n'est écrite ni ici
--      (fichier public), ni dans la commande de la tâche (cron.job).
-- La valeur ne quitte jamais Supabase : ni le dépôt, ni le journal du
-- workflow (la dernière requête n'en sort que la longueur), ni une
-- conversation. La clé écrite ici reste la clé PUBLIQUE du site : elle
-- franchit la porte de Supabase, le secret franchit la fonction.
--
-- ORDRE SANS DANGER, quel qu'il soit : la fonction qui ne trouve pas la RPC
-- accepte comme avant ; la tâche qui envoie l'en-tête à une fonction qui ne
-- l'exige pas encore ne gêne rien. Si un jour les deux côtés divergent, la
-- relance tombe en 401 et le voyant de l'admin le dit en 5 min (« relance
-- absente ou muette »). Rejouable : on retire la tâche avant de la reposer.
-- =====================================================================

do $$
begin
  if to_regclass('vault.decrypted_secrets') is null then
    raise exception 'relance_secret : le coffre (Vault) n''est pas disponible sur ce projet — rien n''a été changé';
  end if;
  if not exists (select 1 from vault.decrypted_secrets where name = 'ela_relance_secret') then
    perform vault.create_secret(replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''), 'ela_relance_secret');
  end if;
end $$;

-- La valeur, pour la fonction — et pour personne d'autre.
create or replace function public.ela_relance_secret()
returns text language sql security definer set search_path = public, pg_temp as $f$
  select decrypted_secret from vault.decrypted_secrets where name = 'ela_relance_secret' limit 1
$f$;
revoke all on function public.ela_relance_secret() from public, anon, authenticated;
grant execute on function public.ela_relance_secret() to service_role;

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
      'Authorization', 'Bearer sb_publishable_hNYqURatjlXc8tYC30XKpA_2VG91UAj',
      'x-ela-relance', (select decrypted_secret from vault.decrypted_secrets where name = 'ela_relance_secret' limit 1)),
    body := '{"type":"RELANCE"}'::jsonb,
    timeout_milliseconds := 20000
  );
  $$
);

-- Le webhook du bouton « Vu » est reposé une fois, avec le même en-tête.
select net.http_post(
  url := 'https://yyhzutnuhuytokarynaw.supabase.co/functions/v1/nouvelle-demande',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'apikey', 'sb_publishable_hNYqURatjlXc8tYC30XKpA_2VG91UAj',
    'Authorization', 'Bearer sb_publishable_hNYqURatjlXc8tYC30XKpA_2VG91UAj',
    'x-ela-relance', (select decrypted_secret from vault.decrypted_secrets where name = 'ela_relance_secret' limit 1)),
  body := '{"type":"INSTALLER_TELEGRAM"}'::jsonb,
  timeout_milliseconds := 20000
);

-- Ce que c'est devenu, lisible dans le journal public du workflow : la
-- LONGUEUR du secret, jamais sa valeur ; la commande porte l'en-tête et le
-- NOM du secret, jamais sa valeur.
select jobid, jobname, schedule, active,
       position('x-ela-relance' in command) > 0 as en_tete_present,
       position('ela_relance_secret' in command) > 0 as secret_lu_dans_vault,
       (select length(decrypted_secret) from vault.decrypted_secrets where name = 'ela_relance_secret' limit 1) as longueur_secret,
       has_function_privilege('anon', 'public.ela_relance_secret()', 'execute') as anon_lit_le_secret
  from cron.job where jobname = 'ela-relance-alertes';
