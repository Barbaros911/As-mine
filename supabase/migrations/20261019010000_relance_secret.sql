-- =====================================================================
-- LE SECRET DE LA RELANCE — pg_cron se présente, la fonction vérifie
-- ---------------------------------------------------------------------
-- 19/10/2026, audit (P2), décidé par Barbaros (« Vas-y pour le 2 »).
-- RELANCE et INSTALLER_TELEGRAM de « nouvelle-demande » étaient joignables
-- par quiconque a la clé publique du site (elle est dans la page). Rien à
-- lire ni à voler : appeler la relance en boucle ne fait que relire le
-- journal (aucun message de plus, la cadence vient du journal) ; reposer
-- le webhook du bot en boucle peut faire ralentir le bot par Telegram, et
-- le bouton « Vu » avec. Une nuisance possible, pas une faille.
--
-- CE QUE FAIT CETTE MIGRATION : la tâche pg_cron envoie désormais l'en-tête
-- « x-ela-relance », lu DANS LE COFFRE (Vault) au moment de chaque appel —
-- la valeur n'est écrite ni ici (fichier public), ni dans la commande de la
-- tâche (lisible dans cron.job). La fonction la compare à son secret
-- RELANCE_SECRET (Edge Functions → Secrets). Les deux valeurs doivent être
-- IDENTIQUES : c'est le seul geste qui revienne à Barbaros, et il se fait
-- dans le navigateur.
--
-- ELLE REFUSE DE S'APPLIQUER TANT QUE LE SECRET N'EST PAS DANS LE COFFRE :
-- sinon la tâche enverrait un en-tête vide, et la fonction — si son secret
-- est posé — refuserait chaque appel : plus de rappel, plus de rattrapage.
-- L'ordre sûr : 1) poser « ela_relance_secret » dans Vault ; 2) appliquer
-- cette migration (la fonction, sans RELANCE_SECRET, accepte encore tout) ;
-- 3) poser RELANCE_SECRET dans les secrets des fonctions. À partir de là le
-- verrou est armé. Si un jour les deux divergent, la relance tombe en 401 et
-- le voyant de l'admin le dit en 5 min (« relance absente ou muette »).
--
-- La clé écrite ici reste la clé PUBLIQUE du site (comme le 30/09) : elle
-- franchit la porte de Supabase, le secret franchit la fonction.
-- Rejouable : on retire la tâche avant de la reposer.
-- =====================================================================

do $$
begin
  if to_regclass('vault.decrypted_secrets') is null then
    raise exception 'relance_secret : le coffre (Vault) n''est pas disponible sur ce projet — rien n''a été changé';
  end if;
  if not exists (select 1 from vault.decrypted_secrets
                  where name = 'ela_relance_secret' and length(coalesce(decrypted_secret, '')) >= 16) then
    raise exception 'relance_secret : poser d''abord le secret « ela_relance_secret » (16 signes au moins) dans Vault — rien n''a été changé';
  end if;
end $$;

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

-- Le webhook du bouton « Vu » est reposé une fois, avec le même en-tête :
-- la fonction l'exigera dès que RELANCE_SECRET sera posé.
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

-- Ce que la tâche est devenue, lisible dans le journal du workflow : la
-- commande porte l'en-tête et le NOM du secret, jamais sa valeur.
select jobid, jobname, schedule, active,
       position('x-ela-relance' in command) > 0 as en_tete_present,
       position('ela_relance_secret' in command) > 0 as secret_lu_dans_vault
  from cron.job where jobname = 'ela-relance-alertes';
