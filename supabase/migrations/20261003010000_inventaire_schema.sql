-- =====================================================================
-- INVENTAIRE DU SCHÉMA RÉEL — ce que la base contient VRAIMENT (lecture seule)
-- ---------------------------------------------------------------------
-- Audit du 2 octobre 2026. Le dépôt porte 29 migrations ; 12 seulement sont
-- passées par le workflow « Appliquer une migration Supabase », les autres
-- ont été collées dans l'éditeur SQL, et des objets existent en production
-- sans aucune migration dans le dépôt (la table courses elle-même,
-- abonnements, presence_operateurs, role_operateur, signaler_presence,
-- presences_operateurs, le webhook d'alerte). Aucun registre ne dit ce qui
-- a été appliqué : avant de rejouer ou d'écrire une migration, on LIT.
--
-- À lancer par le workflow « Appliquer une migration Supabase » avec ce
-- fichier. Il ne modifie RIEN. Le journal GitHub est PUBLIC : il ne sort ni
-- donnée, ni nom de compte, ni argument de déclencheur (les en-têtes d'un
-- webhook peuvent porter une clé — on ne les affiche donc pas, seulement le
-- nom du déclencheur et de sa fonction). Une ligne par catégorie, en JSON.
--
-- Comment lire :
--   tables          : chaque table du schéma public, RLS activée ou non
--   policies        : nom, commande, rôles, condition — « roles={anon} » sur
--                     courses doit avoir disparu après 20261003000000
--   grants_tables   : droits de anon / authenticated / public sur les tables
--   fonctions       : securite (definer/invoker), config (search_path figé ou
--                     non), et si anon / authenticated peuvent l'exécuter
--   vues            : security_invoker ou non, lisible par anon ou non
--   triggers        : nom du déclencheur et de sa fonction (sans arguments)
--   cron            : les tâches pg_cron et leur cadence
--   extensions      : ce qui est installé
--   colonnes_courses: la forme réelle de la table des courses
-- =====================================================================
select 'tables' as quoi,
       jsonb_agg(jsonb_build_object('table', c.relname, 'rls', c.relrowsecurity, 'rls_forcee', c.relforcerowsecurity)
                 order by c.relname) as detail
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relkind = 'r'
union all
select 'policies',
       jsonb_agg(jsonb_build_object('table', tablename, 'policy', policyname, 'cmd', cmd,
                                    'roles', roles, 'using', qual, 'check', with_check)
                 order by tablename, policyname)
  from pg_policies where schemaname = 'public'
union all
select 'grants_tables',
       jsonb_agg(jsonb_build_object('table', table_name, 'grantee', grantee, 'privilege', privilege_type)
                 order by table_name, grantee, privilege_type)
  from information_schema.role_table_grants
 where table_schema = 'public' and grantee in ('anon', 'authenticated', 'PUBLIC')
union all
select 'fonctions',
       jsonb_agg(jsonb_build_object(
           'fonction', p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')',
           'securite', case when p.prosecdef then 'definer' else 'invoker' end,
           'config', p.proconfig,
           'anon_execute', has_function_privilege('anon', p.oid, 'EXECUTE'),
           'authenticated_execute', has_function_privilege('authenticated', p.oid, 'EXECUTE'))
         order by p.proname)
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public'
union all
select 'vues',
       jsonb_agg(jsonb_build_object('vue', c.relname,
                                    'security_invoker', coalesce('security_invoker=true' = any(c.reloptions), false),
                                    'anon_select', has_table_privilege('anon', c.oid, 'SELECT'))
                 order by c.relname)
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relkind = 'v'
union all
select 'triggers',
       jsonb_agg(jsonb_build_object('table', c.relname, 'trigger', t.tgname,
                                    'fonction', fn.nspname || '.' || p.proname, 'actif', t.tgenabled <> 'D')
                 order by c.relname, t.tgname)
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  join pg_proc p on p.oid = t.tgfoid
  join pg_namespace fn on fn.oid = p.pronamespace
 where n.nspname = 'public' and not t.tgisinternal
union all
select 'cron',
       jsonb_agg(jsonb_build_object('jobid', jobid, 'nom', jobname, 'cadence', schedule, 'actif', active)
                 order by jobid)
  from cron.job
union all
select 'extensions', jsonb_agg(extname order by extname) from pg_extension
union all
select 'colonnes_courses',
       jsonb_agg(column_name || ' ' || data_type order by ordinal_position)
  from information_schema.columns
 where table_schema = 'public' and table_name = 'courses';
