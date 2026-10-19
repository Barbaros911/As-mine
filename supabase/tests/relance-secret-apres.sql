-- ============================================================================
-- LE SECRET DE LA RELANCE — épreuves, APRÈS 20261019010000 appliquée DEUX fois
-- ============================================================================
do $$
declare v text; n int; cmd text; appels int;
begin
  -- 1. Un secret, un seul, long — rejouée, la migration ne l'a pas remplacé ni doublé.
  select count(*) into n from vault.decrypted_secrets where name = 'ela_relance_secret';
  if n <> 1 then raise exception 'ECHEC 1 : % secret(s) « ela_relance_secret » au lieu d''un', n; end if;
  select decrypted_secret into v from vault.decrypted_secrets where name = 'ela_relance_secret';
  if length(v) < 32 then raise exception 'ECHEC 1 : secret trop court (%)', length(v); end if;

  -- 2. La RPC rend la valeur à la clé de service, et à personne d'autre.
  if public.ela_relance_secret() is distinct from v then raise exception 'ECHEC 2 : la RPC ne rend pas le secret du coffre'; end if;
  if has_function_privilege('anon', 'public.ela_relance_secret()', 'execute')
     or has_function_privilege('authenticated', 'public.ela_relance_secret()', 'execute') then
    raise exception 'ECHEC 2 : anon ou un compte connecté peut lire le secret'; end if;
  if not has_function_privilege('service_role', 'public.ela_relance_secret()', 'execute') then
    raise exception 'ECHEC 2 : la clé de service ne peut pas lire le secret'; end if;

  -- 3. La tâche : une seule, l'en-tête présent, le NOM du secret et jamais sa VALEUR.
  select count(*) into n from cron.job where jobname = 'ela-relance-alertes';
  if n <> 1 then raise exception 'ECHEC 3 : % tâche(s) ela-relance-alertes', n; end if;
  select command into cmd from cron.job where jobname = 'ela-relance-alertes';
  if position('x-ela-relance' in cmd) = 0 or position('ela_relance_secret' in cmd) = 0 then
    raise exception 'ECHEC 3 : la tâche n''envoie pas l''en-tête lu dans le coffre'; end if;
  if position(v in cmd) > 0 then raise exception 'ECHEC 3 : la VALEUR du secret est écrite dans cron.job'; end if;
  if position('ancienne commande' in cmd) > 0 then raise exception 'ECHEC 3 : l''ancienne tâche est restée'; end if;

  -- 4. Le webhook « Vu » a été reposé avec la vraie valeur (deux passages, deux appels).
  select count(*) into appels from net.appels where body->>'type' = 'INSTALLER_TELEGRAM' and headers->>'x-ela-relance' = v;
  if appels <> 2 then raise exception 'ECHEC 4 : % appel(s) INSTALLER_TELEGRAM avec le bon en-tête au lieu de 2', appels; end if;
end $$;
select 'relance-secret : OK';
