-- ============================================================================
-- LE PRÉNOM DES PROSPECTS — ÉPREUVES, APRÈS 20261009010000_prospects_prenom.sql
-- (appliquée deux fois, sur la base laissée par prospects-apres.sql).
-- Mêmes comptes que le décor : …0001 l'admin · …0002 l'agent.
-- Un refus n'est accepté que POUR SA RAISON, et il est précédé de la preuve
-- que la même chose passe pour celui qui en a le droit.
-- ============================================================================

-- ── 1. LA STRUCTURE ─────────────────────────────────────────────────────
do $$
declare p text; n int;
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public'
                  and table_name = 'prospects' and column_name = 'prenom' and is_nullable = 'YES') then
    raise exception 'ECHEC P1 : colonne prenom absente ou obligatoire'; end if;
  select count(*) into n from pg_constraint
   where conrelid = 'public.prospects'::regclass and conname = 'prospects_prenom';
  if n <> 1 then raise exception 'ECHEC P1 : % contraintes prospects_prenom après rejeu', n; end if;
  foreach p in array array['SELECT','INSERT','UPDATE','REFERENCES'] loop
    if has_column_privilege('anon', 'public.prospects', 'prenom', p) then
      raise exception 'ECHEC P1 : anon a % sur prenom', p; end if;
  end loop;
  if not has_column_privilege('authenticated', 'public.prospects', 'prenom', 'SELECT') then
    raise exception 'ECHEC P1 : l''admin ne pourra pas lire le prénom'; end if;
  if has_column_privilege('authenticated', 'public.prospects', 'prenom', 'UPDATE')
     or has_column_privilege('authenticated', 'public.prospects', 'prenom', 'INSERT') then
    raise exception 'ECHEC P1 : le prénom est modifiable depuis le navigateur'; end if;
  if has_column_privilege('authenticated', 'public.prospects', 'jeton_empreinte', 'SELECT') then
    raise exception 'ECHEC P1 : la migration a rouvert l''empreinte du jeton'; end if;
  select count(*) into n from pg_proc where proname = 'ela_prospect_creer' and pronamespace = 'public'::regnamespace;
  if n <> 1 then raise exception 'ECHEC P1 : % fonctions ela_prospect_creer (1 attendue)', n; end if;
  if to_regprocedure('public.ela_prospect_creer(text,text,text,text,text,text,text,text,integer)') is not null then
    raise exception 'ECHEC P1 : l''ancienne signature est restée'; end if;
  p := 'public.ela_prospect_creer(text,text,text,text,text,text,text,text,integer,text)';
  if has_function_privilege('anon', p, 'execute') or has_function_privilege('authenticated', p, 'execute') then
    raise exception 'ECHEC P1 : la porte de création est appelable depuis le navigateur'; end if;
  if not has_function_privilege('service_role', p, 'execute') then
    raise exception 'ECHEC P1 : demande-demo ne pourra pas créer'; end if;
  if not (select prosecdef from pg_proc where oid = p::regprocedure) then
    raise exception 'ECHEC P1 : la porte n''écrit plus avec les droits du propriétaire'; end if;
end $$;

-- ── 2. CRÉER AVEC ET SANS LE PRÉNOM (service_role) ─────────────────────
set role service_role;
do $$
declare r record; l public.prospects;
begin
  -- Le nouvel appel : par NOM de paramètre, comme PostgREST.
  select * into r from public.ela_prospect_creer(p_type => 'hotel', p_etablissement => 'Hôtel des Tilleuls',
    p_nom => ' Durand ', p_fonction => '', p_email => 'accueil@tilleuls.fr', p_telephone => '+33612340000',
    p_langue => 'fr', p_jeton_empreinte => repeat('d', 64), p_par_jour => 3, p_prenom => '  Claire ');
  select * into l from public.prospects where id = r.id;
  if l.prenom is distinct from 'Claire' or l.nom <> 'Durand' then
    raise exception 'ECHEC P2 : prénom ou nom mal rangés : %', row_to_json(l); end if;
  -- L'appel d'AVANT (sans p_prenom) trouve toujours sa fonction : une page
  -- ou une fonction restée à l'ancienne version ne casse pas.
  select * into r from public.ela_prospect_creer(p_type => 'agence', p_etablissement => 'Voyages Leroy',
    p_nom => 'Luc Leroy', p_fonction => '', p_email => 'luc@leroy-voyages.fr', p_telephone => '+33612340001',
    p_langue => 'fr', p_jeton_empreinte => repeat('e', 64), p_par_jour => 3);
  select * into l from public.prospects where id = r.id;
  if l.prenom is not null or l.nom <> 'Luc Leroy' then
    raise exception 'ECHEC P2 : un appel sans prénom ne garde pas le nom complet : %', row_to_json(l); end if;
  -- Un prénom d'espaces devient NULL, jamais une chaîne vide.
  select * into r from public.ela_prospect_creer('entreprise', 'Société T', 'Tran', '', 't@societe-t.fr',
    '+33612340002', 'en', null, 3, '   ');
  if (select prenom from public.prospects where id = r.id) is not null then
    raise exception 'ECHEC P2 : un prénom vide est gardé'; end if;
  perform set_config('test.pp', (select id::text from public.prospects where email = 'accueil@tilleuls.fr'), false);
end $$;
select epreuve.refus('P2a prénom avec chevron',
  $q$select public.ela_prospect_creer('hotel','Hôtel A','Nom B','','x1@b.fr','+33612345678','fr',null,3,'<b>')$q$, 'prospects_prenom');
select epreuve.refus('P2b prénom de 61 caractères',
  $q$select public.ela_prospect_creer('hotel','Hôtel A','Nom B','','x2@b.fr','+33612345678','fr',null,3,repeat('a',61))$q$, 'prospects_prenom');
do $$ begin
  perform public.ela_prospect_creer('hotel','Hôtel A','Nom B','','x3@b.fr','+33612345678','fr',null,3,repeat('a',60));
end $$;
reset role;

-- ── 3. ANON : RIEN ─────────────────────────────────────────────────────
set role anon;
select epreuve.refus('P3a anon lit le prénom', 'select prenom from public.prospects', '42501');
select epreuve.refus('P3b anon crée par la porte',
  $q$select public.ela_prospect_creer('hotel','Hôtel A','Nom B','','a@b.fr','+33612345678','fr',null,3,'Ana')$q$, '42501');
reset role;

-- ── 4. L'ADMIN LIT LE PRÉNOM, NE LE CHANGE PAS ; L'AGENT NE VOIT RIEN ──
select set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000001', false);
set role authenticated;
do $$ begin
  if (select prenom from public.prospects where id = current_setting('test.pp')::uuid) is distinct from 'Claire' then
    raise exception 'ECHEC P4 : l''admin ne lit pas le prénom'; end if;
end $$;
select epreuve.refus('P4a admin modifie le prénom', $q$update public.prospects set prenom = 'X'$q$, '42501');
select epreuve.refus('P4b admin appelle la porte',
  $q$select public.ela_prospect_creer('hotel','Hôtel A','Nom B','','a@b.fr','+33612345678','fr',null,3,'Ana')$q$, '42501');
reset role;
select set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000002', false);
set role authenticated;
do $$ declare n bigint; begin
  select count(*) into n from public.prospects where prenom is not null;
  if n <> 0 then raise exception 'ECHEC P4 : l''agent lit % prénoms', n; end if;
end $$;
reset role;
select set_config('test.uid', '', false);

select 'prospects (prénom) : toutes les épreuves passent' as resultat;
