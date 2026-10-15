-- ============================================================================
-- LES LIENS DE SUIVI — ÉPREUVES, APRÈS 20261014000000 puis 20261015000000
-- (appliquée deux fois). Même décor que la mesure (mesure.sql : privilèges par
-- défaut de Supabase, epreuve.refus). Comptes : …0001 l'admin · …0002 l'agent.
-- Chaque refus est précédé de la preuve que la même chose passe pour qui en a
-- le droit : une table fermée à tout le monde rendrait les mêmes refus.
-- ============================================================================

-- ── 1. LA STRUCTURE ─────────────────────────────────────────────────────
do $$
declare p text; v_cols text;
begin
  if not (select relrowsecurity from pg_class where oid = 'public.liens_suivi'::regclass) then
    raise exception 'ECHEC 1 : RLS inactive sur liens_suivi'; end if;
  foreach p in array array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE'] loop
    if has_table_privilege('anon', 'public.liens_suivi', p) then
      raise exception 'ECHEC 1 : anon a % sur liens_suivi — la liste des partenaires serait publique', p; end if;
  end loop;
  foreach p in array array['UPDATE','DELETE','TRUNCATE'] loop
    if has_table_privilege('authenticated', 'public.liens_suivi', p) then
      raise exception 'ECHEC 1 : authenticated a % sur liens_suivi', p; end if;
  end loop;
  if to_regprocedure('public.ela_mesurer(text,text)') is not null then
    raise exception 'ECHEC 1 : l''ancienne ela_mesurer à deux paramètres existe encore — le serveur ne saurait pas laquelle appeler'; end if;
  if not has_function_privilege('anon', 'public.ela_mesurer(text,text,text)', 'EXECUTE') then
    raise exception 'ECHEC 1 : anon ne peut plus compter'; end if;
  if has_function_privilege('anon', 'public.ela_mesures_liens(integer)', 'EXECUTE') then
    raise exception 'ECHEC 1 : anon peut lire les totaux par lien'; end if;
  select string_agg(a.attname, ',' order by k.ord) into v_cols
    from pg_constraint c
    cross join lateral unnest(c.conkey) with ordinality as k(attnum, ord)
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.attnum
   where c.conrelid = 'public.mesures_acquisition'::regclass and c.contype = 'p';
  if v_cols is distinct from 'jour,page,evenement,source' then
    raise exception 'ECHEC 1 : clé primaire du compteur = %', v_cols; end if;
  if not exists (select 1 from public.liens_suivi where code = 'fiche-hotels') then
    raise exception 'ECHEC 1 : le lien de la fiche papier n''existe pas'; end if;
  if (select count(*) from public.liens_suivi where code = 'fiche-hotels') <> 1 then
    raise exception 'ECHEC 1 : migration rejouée, lien en double'; end if;
  -- La table n'était pas vide : le workflow y a compté une page AVANT la
  -- migration. La clé primaire refaite sur une table pleine garde la ligne,
  -- avec une source vide (relecture du 15/10/2026 : ce cas n'était pas éprouvé).
  if not exists (select 1 from public.mesures_acquisition
                  where page = 'avant-migration' and evenement = 'page_vue'
                    and source = '' and nombre = 5) then
    raise exception 'ECHEC 1 : la ligne comptée avant la migration a disparu ou changé'; end if;
end $$;

-- ── 2. L'ADMIN CRÉE ET LIT ; L'AGENT ET L'ANONYME NON ───────────────────
set role authenticated;
select set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000001', false);
insert into public.liens_suivi (code, nom) values ('hotel-exemple', 'Hôtel Exemple Roissy');
do $$ begin
  if (select count(*) from public.liens_suivi) <> 2 then
    raise exception 'ECHEC 2 : l''admin ne lit pas les deux liens'; end if;
end $$;
select epreuve.refus('2a code mal formé', 'insert into public.liens_suivi (code, nom) values (''Hotel Exemple'', ''x'')', '23514');
select epreuve.refus('2b nom vide', 'insert into public.liens_suivi (code, nom) values (''vide'', ''  '')', '23514');
select epreuve.refus('2c l''admin efface un lien', 'delete from public.liens_suivi where code = ''hotel-exemple''', '42501');
select epreuve.refus('2d l''admin renomme un lien', 'update public.liens_suivi set nom = ''x''', '42501');
select set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000002', false);
do $$ begin
  if (select count(*) from public.liens_suivi) <> 0 then
    raise exception 'ECHEC 2 : l''agent lit la liste des partenaires'; end if;
end $$;
select epreuve.refus('2e l''agent crée un lien', 'insert into public.liens_suivi (code, nom) values (''agent-x'', ''x'')', '42501');
select set_config('test.uid', '', false);
reset role;
set role anon;
select epreuve.refus('2f anon lit les liens', 'select * from public.liens_suivi', '42501');
select epreuve.refus('2g anon crée un lien', 'insert into public.liens_suivi (code, nom) values (''anon-x'', ''x'')', '42501');
reset role;

-- ── 3. UN ANONYME COMPTE, ET LA SOURCE N'EST RETENUE QUE SI ELLE EXISTE ──
delete from public.mesures_acquisition;
set role anon;
select public.ela_mesurer('en-cdg', 'page_vue', 'hotel-exemple');
select public.ela_mesurer('en-cdg', 'page_vue', 'hotel-exemple');
select public.ela_mesurer('en-cdg', 'clic_reserver', 'hotel-exemple');
select public.ela_mesurer('en-cdg', 'page_vue', 'inconnu');          -- inventé : sans source
select public.ela_mesurer('en-cdg', 'page_vue', 'Hotel-Exemple');     -- mal formé : sans source
select public.ela_mesurer('en-cdg', 'page_vue', repeat('a', 41));    -- trop long : sans source
select public.ela_mesurer('en-cdg', 'page_vue');                     -- ancienne page en cache
select public.ela_mesurer('accueil', 'demande_envoyee', 'fiche-hotels');
select public.ela_mesurer('en-cdg', 'clic_inconnu', 'hotel-exemple'); -- geste inconnu : rien
reset role;
do $$
declare v_avec int; v_sans int; v_total int;
begin
  select nombre into v_avec from public.mesures_acquisition
   where page = 'en-cdg' and evenement = 'page_vue' and source = 'hotel-exemple';
  select nombre into v_sans from public.mesures_acquisition
   where page = 'en-cdg' and evenement = 'page_vue' and source = '';
  if v_avec is distinct from 2 then raise exception 'ECHEC 3 : % vues avec la source au lieu de 2', v_avec; end if;
  if v_sans is distinct from 4 then raise exception 'ECHEC 3 : % vues sans source au lieu de 4', v_sans; end if;
  select count(*) into v_total from public.mesures_acquisition;
  if v_total <> 4 then raise exception 'ECHEC 3 : % lignes au lieu de 4', v_total; end if;
  if exists (select 1 from public.mesures_acquisition where source not in ('', 'hotel-exemple', 'fiche-hotels')) then
    raise exception 'ECHEC 3 : une source inventée a été retenue'; end if;
end $$;

-- ── 4. L'ADMIN LIT PAR LIEN ; LES TOTAUX PAR PAGE NE CHANGENT PAS ────────
set role authenticated;
select set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000001', false);
do $$
declare n bigint;
begin
  select l.nombre into n from public.ela_mesures_liens(30) l
   where l.source = 'hotel-exemple' and l.evenement = 'page_vue';
  if n is distinct from 2 then raise exception 'ECHEC 4 : le lien lit % vues au lieu de 2', n; end if;
  if exists (select 1 from public.ela_mesures_liens(30) l where l.source = '') then
    raise exception 'ECHEC 4 : les visites sans lien sortent dans les totaux par lien'; end if;
  select m.nombre into n from public.ela_mesures_acquisition(30) m
   where m.page = 'en-cdg' and m.evenement = 'page_vue';
  if n is distinct from 6 then raise exception 'ECHEC 4 : la page lit % vues au lieu de 6 (avec et sans lien)', n; end if;
end $$;
select set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000002', false);
select epreuve.refus('4a l''agent lit les totaux par lien', 'select * from public.ela_mesures_liens(30)', 'réservée à l''admin');
select set_config('test.uid', '', false);
reset role;
set role anon;
select epreuve.refus('4b anon lit les totaux par lien', 'select * from public.ela_mesures_liens(30)', '42501');
reset role;

-- ── 5. LA LIMITE DE 60 PAGES PAR JOUR TIENT TOUJOURS ────────────────────
insert into public.mesures_acquisition(jour, page, evenement, nombre)
select (now() at time zone 'Europe/Paris')::date, 'sonde-' || g, 'page_vue', 1
  from generate_series(1, 58) g;
set role anon;
select public.ela_mesurer('page-de-trop', 'page_vue', 'hotel-exemple');
select public.ela_mesurer('en-cdg', 'page_vue', 'hotel-exemple');
reset role;
do $$ begin
  if exists (select 1 from public.mesures_acquisition where page = 'page-de-trop') then
    raise exception 'ECHEC 5 : une 61e page a été comptée'; end if;
  if (select nombre from public.mesures_acquisition
       where page = 'en-cdg' and evenement = 'page_vue' and source = 'hotel-exemple') <> 3 then
    raise exception 'ECHEC 5 : une page déjà vue ne compte plus avec sa source'; end if;
end $$;

select 'LIENS DE SUIVI : toutes les épreuves passent' as resultat;
