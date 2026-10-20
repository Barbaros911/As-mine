-- ============================================================================
-- SEUL L'ADMIN SUPPRIME — épreuves APRÈS la migration 20261020020000.
-- Les deux côtés : l'agent est refusé, l'admin efface une course en attente,
-- une réalisée, et une qui portait une attribution. Une règle qui refuserait
-- tout le monde rendrait les mêmes refus : le côté admin lève ce doute.
-- ============================================================================

-- 1. Une seule policy de suppression, et c'est celle de l'admin.
do $$
declare n int;
begin
  select count(*) into n from pg_policies
   where schemaname = 'public' and tablename = 'courses' and cmd = 'DELETE';
  if n <> 1 then raise exception 'ECHEC 1 : % policies de suppression (les anciennes ne sont pas toutes parties)', n; end if;
  if has_table_privilege('anon', 'public.courses', 'delete') then
    raise exception 'ECHEC 1 : anon a le droit de supprimer'; end if;
end $$;

-- 2. L'agent est refusé : zéro ligne, rien n'a bougé.
select set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000002', false);
set role authenticated;
do $$
declare n int;
begin
  delete from public.courses where ref in ('ELA-26-10-AGENT', 'ELA-26-10-FAITE');
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'ECHEC 2 : l''agent a supprimé % course(s)', n; end if;
  -- Il lit encore les courses (il doit les traiter) : la règle ne touche que la suppression.
  select count(*) into n from public.courses;
  if n = 0 then raise exception 'ECHEC 2 : l''agent ne lit plus les courses'; end if;
end $$;
reset role;

-- 3. L'admin efface en attente, réalisée, et réalisée avec attribution.
select set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000001', false);
set role authenticated;
do $$
declare n int;
begin
  delete from public.courses where ref in ('ELA-26-10-AGENT', 'ELA-26-10-FAITE', 'ELA-26-10-ATTRI');
  get diagnostics n = row_count;
  if n <> 3 then raise exception 'ECHEC 3 : l''admin n''a supprimé que % course(s) sur 3', n; end if;
end $$;
reset role;

do $$
begin
  if exists (select 1 from public.attributions_chauffeur where course_ref = 'ELA-26-10-ATTRI') then
    raise exception 'ECHEC 3 : l''attribution a survécu à sa course'; end if;
  if not exists (select 1 from public.courses where ref = 'ELA-26-10-RESTE') then
    raise exception 'ECHEC 3 : une course non visée a disparu'; end if;
end $$;

-- 4. Un admin suspendu (actif = false) ne supprime plus : la règle suit le compte.
update public.operateurs set actif = false where user_id = 'aaaaaaaa-0000-0000-0000-000000000001';
select set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000001', false);
set role authenticated;
do $$
declare n int;
begin
  delete from public.courses where ref = 'ELA-26-10-RESTE';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'ECHEC 4 : un compte suspendu a supprimé'; end if;
end $$;
reset role;
update public.operateurs set actif = true where user_id = 'aaaaaaaa-0000-0000-0000-000000000001';

-- 5. Rejouée, la migration ne casse rien.
\i supabase/migrations/20261020020000_suppression_course_admin.sql

select 'SUPPRESSION ADMIN : 5 blocs au vert' as resultat;
