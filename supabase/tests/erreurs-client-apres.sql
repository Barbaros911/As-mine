-- ============================================================================
-- LE JOURNAL DES ERREURS DU SITE — épreuves, APRÈS la migration 20261019000000
-- (appliquée deux fois : elle doit se rejouer). Chaque refus est vérifié pour
-- sa raison, et précédé de la preuve que la même chose passe pour qui en a le
-- droit — une table fermée à tous rendrait les mêmes refus sans rien prouver.
-- ============================================================================

-- 1. LA STRUCTURE : RLS, rien pour anon, lecture seule pour un compte connecté.
do $$
declare p text;
begin
  if not (select relrowsecurity from pg_class where oid = 'public.journal_erreurs_client'::regclass) then
    raise exception 'ECHEC 1 : RLS inactive'; end if;
  foreach p in array array['SELECT','INSERT','UPDATE','DELETE'] loop
    if has_table_privilege('anon', 'public.journal_erreurs_client', p) then
      raise exception 'ECHEC 1 : anon a % sur le journal', p; end if;
  end loop;
  foreach p in array array['INSERT','UPDATE','DELETE','TRUNCATE'] loop
    if has_table_privilege('authenticated', 'public.journal_erreurs_client', p) then
      raise exception 'ECHEC 1 : un compte connecté a % sur le journal', p; end if;
  end loop;
  if not has_table_privilege('authenticated', 'public.journal_erreurs_client', 'SELECT') then
    raise exception 'ECHEC 1 : l''exploitant ne pourra pas lire'; end if;
  if has_function_privilege('anon', 'public.ela_erreur_client_ecrire(jsonb)', 'execute')
     or has_function_privilege('authenticated', 'public.ela_erreur_client_ecrire(jsonb)', 'execute') then
    raise exception 'ECHEC 1 : l''écriture est ouverte au navigateur'; end if;
  if has_function_privilege('anon', 'public.ela_erreurs_client_recentes()', 'execute') then
    raise exception 'ECHEC 1 : anon lit les comptes'; end if;
  if not has_function_privilege('authenticated', 'public.ela_erreurs_client_recentes()', 'execute') then
    raise exception 'ECHEC 1 : l''admin ne pourra pas lire les comptes'; end if;
end $$;

-- 2. LA CLÉ DE SERVICE ÉCRIT, ET LES BORNES TIENNENT.
do $$
declare ok boolean; erreur text := '';
begin
  ok := public.ela_erreur_client_ecrire('{"espace":"public","chemin":"/","ecran":"ecran-recap","message":"TypeError: x is undefined","source":"https://elatransfer.com/index.html:42","appareil":"mobile","langue":"fr"}'::jsonb);
  if not ok or (select count(*) from public.journal_erreurs_client) <> 1 then
    raise exception 'ECHEC 2 : l''écriture par la clé de service ne passe pas'; end if;
  begin
    perform public.ela_erreur_client_ecrire(('{"espace":"public","chemin":"/","message":"' || repeat('x', 201) || '"}')::jsonb);
    raise exception 'ECHEC 2 : un message de 201 signes est passé';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.ela_erreur_client_ecrire('{"espace":"inconnu","chemin":"/","message":"m"}'::jsonb);
    raise exception 'ECHEC 2 : un espace inconnu est passé';
  exception when check_violation then null;
  end;
  begin
    perform public.ela_erreur_client_ecrire('{"espace":"public","chemin":"/","message":""}'::jsonb);
    raise exception 'ECHEC 2 : un message vide est passé';
  exception when invalid_parameter_value then null;
  end;
  -- L'appareil et la langue hors liste sont remis à NULL, pas refusés : une
  -- vieille page ne doit pas perdre l'erreur pour un détail.
  perform public.ela_erreur_client_ecrire('{"espace":"admin","chemin":"/ela-admin/","message":"m2","appareil":"frigo","langue":"xyz"}'::jsonb);
  if (select appareil is not null or langue is not null from public.journal_erreurs_client where message = 'm2') then
    raise exception 'ECHEC 2 : appareil ou langue hors liste gardés'; end if;
end $$;

-- 3. LE NAVIGATEUR N'ÉCRIT PAS, MÊME CONNECTÉ.
do $$ begin
  begin
    set local role authenticated;
    perform public.ela_erreur_client_ecrire('{"espace":"public","chemin":"/","message":"m"}'::jsonb);
    raise exception 'ECHEC 3 : un compte connecté a écrit une erreur';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
do $$ begin
  begin
    set local role anon;
    perform count(*) from public.journal_erreurs_client;
    raise exception 'ECHEC 3 : anon lit le journal';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- 4. LA PURGE : une ligne de 40 jours disparaît à l'écriture suivante.
do $$ begin
  update public.journal_erreurs_client set cree_le = now() - interval '40 days' where message = 'm2';
  perform public.ela_erreur_client_ecrire('{"espace":"hotel","chemin":"/application","message":"m3"}'::jsonb);
  if exists (select 1 from public.journal_erreurs_client where message = 'm2') then
    raise exception 'ECHEC 4 : la ligne de 40 jours est toujours là'; end if;
  if (select count(*) from public.journal_erreurs_client) <> 2 then
    raise exception 'ECHEC 4 : % ligne(s) au lieu de 2', (select count(*) from public.journal_erreurs_client); end if;
end $$;

-- 5. LA LECTURE DE L'ADMIN : les comptes disent vrai, un non-exploitant est refusé.
do $$
declare j json; erreur text := '';
begin
  j := public.ela_erreurs_client_recentes();
  if (j->>'n24h')::int <> 2 or (j->>'n1h')::int <> 2 then
    raise exception 'ECHEC 5 : comptes faux : %', j::text; end if;
  if json_array_length(j->'messages') <> 2 then
    raise exception 'ECHEC 5 : % message(s) au lieu de 2', json_array_length(j->'messages'); end if;
  update public.socle_reglages set exploitant = false;
  begin
    perform public.ela_erreurs_client_recentes();
  exception when others then erreur := sqlerrm;
  end;
  update public.socle_reglages set exploitant = true;
  if erreur is distinct from 'acces_refuse' then
    raise exception 'ECHEC 5 : un non-exploitant lit les comptes (erreur : « % »)', erreur; end if;
end $$;

select 'erreurs-client : OK';
