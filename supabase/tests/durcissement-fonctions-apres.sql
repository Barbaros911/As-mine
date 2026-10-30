-- ============================================================================
-- Épreuve de 20261028000000_durcissement_fonctions.sql — PARTIE « APRÈS »
-- (la migration a été appliquée DEUX fois).
-- ============================================================================

-- 1. Le piège ne mord plus : le réglage de la fonction l'emporte sur celui de
--    la session, et le N° court comme la version fonctionnent comme avant.
do $$
declare n_avant bigint; n bigint; v int; v2 int; b jsonb;
begin
  select max(numero) into n_avant from public.courses;
  perform set_config('search_path', 'piege, pg_catalog, public', true);
  insert into public.courses(ref, statut, bon, numero)
  values ('ELA-26-10-APRES', 'attente', '{"numero":7,"ref":"ELA-26-10-APRES"}', 7);
  select numero, version, bon into n, v, b from public.courses where ref = 'ELA-26-10-APRES';
  if n is distinct from n_avant + 1 then
    raise exception 'le N° court devait etre %, trouve %', n_avant + 1, n;
  end if;
  if (b->>'numero')::bigint is distinct from n or b->>'ref' <> 'ELA-26-10-APRES' then
    raise exception 'le bon ne porte pas le N° court, ou il a ete abime : %', b;
  end if;
  -- Une modification monte la version d'un cran et ne laisse pas changer le N°.
  update public.courses set statut = 'confirmee', numero = 9999,
         bon = '{"numero":9999,"ref":"ELA-26-10-APRES"}'
   where ref = 'ELA-26-10-APRES';
  select numero, version, bon into n, v2, b from public.courses where ref = 'ELA-26-10-APRES';
  if v2 is distinct from v + 1 then raise exception 'version attendue %, trouvee %', v + 1, v2; end if;
  if n = 9999 or (b->>'numero')::bigint = 9999 then
    raise exception 'le N° court a change apres coup (colonne % / bon %)', n, b->>'numero';
  end if;
  perform set_config('search_path', '"$user", public', true);
end $$;

-- 2. Le corps des deux déclencheurs est inchangé : seul le réglage a bougé.
do $$ begin
  if exists (select 1 from public.epreuve_corps e
               join pg_proc p on p.proname = e.proname and p.pronamespace = 'public'::regnamespace
              where md5(p.prosrc) <> e.empreinte) then
    raise exception 'la migration a reecrit le corps d''un declencheur';
  end if;
  if (select count(*) from pg_proc p
       where p.oid in (to_regprocedure('public.ela_courses_numero()'),
                       to_regprocedure('public.ela_courses_version()'))
         and p.proconfig = array['search_path=""']) <> 2 then
    raise exception 'les deux declencheurs devaient porter search_path vide, et rien d''autre';
  end if;
end $$;

-- 3. anon ne lit plus par « suivi », et pour la bonne raison (droit refusé).
set role anon;
do $$
declare etat text;
begin
  begin
    perform * from public.suivi('ELA-26-09-SUIVI', 'jeton-ancien-site-0001');
    raise exception 'anon execute encore suivi';
  exception when insufficient_privilege then
    etat := 'refuse';
  end;
end $$;
reset role;
set role authenticated;
do $$ begin
  begin
    perform * from public.suivi('ELA-26-09-SUIVI', 'jeton-ancien-site-0001');
    raise exception 'authenticated execute suivi';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- 4. La fonction reste, et service_role la garde : rien n'est effacé.
do $$ begin
  if to_regprocedure('public.suivi(text, text)') is null then
    raise exception 'suivi a ete supprimee : la migration devait seulement retirer un droit';
  end if;
  if not has_function_privilege('service_role', 'public.suivi(text, text)', 'EXECUTE') then
    raise exception 'service_role a perdu suivi';
  end if;
  if (select count(*) from public.courses where ref = 'ELA-26-09-SUIVI') <> 1 then
    raise exception 'une course a disparu';
  end if;
end $$;

select 'apres : declencheurs figes, suivi ferme a anon' as etat;
