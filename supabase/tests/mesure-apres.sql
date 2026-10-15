-- ============================================================================
-- LA MESURE D'AUDIENCE — ÉPREUVES, APRÈS la migration (appliquée deux fois).
-- Chaque refus est précédé de la preuve que la même chose passe pour qui en a
-- le droit : une fonction fermée à tout le monde rendrait les mêmes refus.
-- Comptes (role-agent-avant.sql) : …0001 l'admin · …0002 l'agent.
-- ============================================================================

-- ── 1. LA STRUCTURE ─────────────────────────────────────────────────────
do $$
declare p text;
begin
  if not (select relrowsecurity from pg_class where oid = 'public.mesures_acquisition'::regclass) then
    raise exception 'ECHEC 1 : RLS inactive'; end if;
  foreach p in array array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE'] loop
    if has_table_privilege('anon', 'public.mesures_acquisition', p)
       or has_table_privilege('authenticated', 'public.mesures_acquisition', p) then
      raise exception 'ECHEC 1 : % accordé sur la table', p; end if;
  end loop;
  if not has_function_privilege('anon', 'public.ela_mesurer(text,text)', 'EXECUTE') then
    raise exception 'ECHEC 1 : anon ne peut pas compter — la mesure ne marcherait pas'; end if;
  if has_function_privilege('anon', 'public.ela_mesures_acquisition(integer)', 'EXECUTE') then
    raise exception 'ECHEC 1 : anon peut lire les totaux'; end if;
  if (select count(*) from pg_policies where tablename = 'mesures_acquisition') <> 0 then
    raise exception 'ECHEC 1 : une policy ouvre la table'; end if;
end $$;

-- ── 2. UN ANONYME COMPTE, ET NE FAIT RIEN D'AUTRE ───────────────────────
set role anon;
select public.ela_mesurer('en-cdg', 'page_vue');
select public.ela_mesurer('en-cdg', 'page_vue');
select public.ela_mesurer('en-cdg', 'clic_whatsapp');
-- Ce qui ne correspond à rien est ignoré, sans erreur.
select public.ela_mesurer('en-cdg', 'clic_inconnu');
select public.ela_mesurer('EN-CDG', 'page_vue');
select public.ela_mesurer('<script>', 'page_vue');
select public.ela_mesurer(repeat('a', 41), 'page_vue');
select public.ela_mesurer(null, 'page_vue');
select epreuve.refus('2a anon lit la table', 'select * from public.mesures_acquisition', '42501');
select epreuve.refus('2b anon écrit la table',
  'insert into public.mesures_acquisition values (current_date, ''x1'', ''page_vue'', 999)', '42501');
select epreuve.refus('2c anon lit les totaux', 'select * from public.ela_mesures_acquisition(30)', '42501');
reset role;

do $$
declare n int; total int;
begin
  select nombre into n from public.mesures_acquisition
   where jour = (now() at time zone 'Europe/Paris')::date and page = 'en-cdg' and evenement = 'page_vue';
  if n is distinct from 2 then raise exception 'ECHEC 2 : page_vue en-cdg = % au lieu de 2', n; end if;
  select count(*) into total from public.mesures_acquisition;
  if total <> 2 then raise exception 'ECHEC 2 : % lignes au lieu de 2 — un appel invalide a été compté', total; end if;
end $$;

-- ── 3. L'ADMIN LIT, L'AGENT NON ─────────────────────────────────────────
set role authenticated;
select set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000001', false);
do $$
declare n bigint;
begin
  select m.nombre into n from public.ela_mesures_acquisition(30) m
   where m.page = 'en-cdg' and m.evenement = 'page_vue';
  if n is distinct from 2 then raise exception 'ECHEC 3 : l''admin lit % au lieu de 2', n; end if;
end $$;
select set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000002', false);
select epreuve.refus('3a l''agent lit les totaux', 'select * from public.ela_mesures_acquisition(30)', 'réservée à l''admin');
select set_config('test.uid', '', false);
reset role;

-- ── 4. UNE JOURNÉE NE COMPTE PAS PLUS DE 60 PAGES ───────────────────────
insert into public.mesures_acquisition(jour, page, evenement, nombre)
select (now() at time zone 'Europe/Paris')::date, 'sonde-' || g, 'page_vue', 1
  from generate_series(1, 59) g;
set role anon;
select public.ela_mesurer('page-de-trop', 'page_vue');
select public.ela_mesurer('en-cdg', 'page_vue');
reset role;
do $$
begin
  if exists (select 1 from public.mesures_acquisition where page = 'page-de-trop') then
    raise exception 'ECHEC 4 : une 61e page a été comptée — la table pourrait grossir sans fin'; end if;
  if (select nombre from public.mesures_acquisition
       where jour = (now() at time zone 'Europe/Paris')::date and page = 'en-cdg' and evenement = 'page_vue') <> 3 then
    raise exception 'ECHEC 4 : une page déjà vue ce jour-là ne compte plus'; end if;
end $$;

-- ── 5. LA FENÊTRE DE LECTURE ────────────────────────────────────────────
insert into public.mesures_acquisition(jour, page, evenement, nombre)
values ((now() at time zone 'Europe/Paris')::date - 40, 'en-orly', 'page_vue', 5);
set role authenticated;
select set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000001', false);
do $$
begin
  if exists (select 1 from public.ela_mesures_acquisition(30) m where m.page = 'en-orly') then
    raise exception 'ECHEC 5 : un total de 40 jours sort dans les 30 derniers jours'; end if;
  if not exists (select 1 from public.ela_mesures_acquisition(60) m where m.page = 'en-orly' and m.nombre = 5) then
    raise exception 'ECHEC 5 : la fenêtre de 60 jours ne lit pas le total de 40 jours'; end if;
end $$;
select set_config('test.uid', '', false);
reset role;

select 'MESURE : toutes les épreuves passent' as resultat;
