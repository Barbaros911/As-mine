-- =====================================================================
-- DIAGNOSTIC DU CLOISONNEMENT — lecture seule, 5 octobre 2026
-- ---------------------------------------------------------------------
-- Suite de l'audit du cloisonnement des quatre espaces (4 octobre 2026).
-- Toutes les données du serveur sont gardées par est_exploitant() ou
-- est_admin() — relevé en production le 2 octobre. Restait ce qu'on ne
-- pouvait pas lire d'ici :
--   · des comptes qui ne sont PAS des opérateurs existent-ils ? Si
--     l'inscription publique de Supabase est ouverte, n'importe qui peut
--     s'en créer un avec la clé publique du site, et passer la première
--     porte (« authenticated ») ;
--   · deux fonctions créées hors dépôt, qui s'exécutent avec les droits de
--     leur propriétaire (« definer ») : vérifient-elles le droit ?
--   · après 20261005000000_vues_lecture_seule.sql : plus aucune vue
--     modifiable, et rien d'autre d'ouvert à anon.
--
-- À lancer par le workflow « Appliquer une migration Supabase », APRÈS
-- 20261005000000. Il ne modifie RIEN. Le journal GitHub est PUBLIC : il ne
-- sort aucune adresse e-mail, aucun identifiant de compte, aucune donnée de
-- course — des nombres, des noms d'objets, et le code des deux fonctions
-- avec ses chaînes de texte masquées.
--
-- Comment lire (ce que chaque ligne DOIT valoir) :
--   comptes             : comptes_sans_droit = 0. Sinon, quelqu'un s'est
--                         inscrit sans être opérateur : il ne voit rien
--                         (tout est gardé par est_exploitant), mais il faut
--                         savoir qui, puis fermer l'inscription.
--   fonctions_presence  : verifie_le_droit = true pour chacune ; sinon lire
--                         « code » et décider.
--   vues_modifiables    : [] (vide). Sinon une vue a été créée depuis
--                         20261005000000 : la rejouer, elle est faite pour.
--   droits_anon_tables  : seulement « abonnements : INSERT » (le client qui
--                         demande à être prévenu).
--   definer_anon        : seulement « suivi(…) » (le suivi par jeton).
-- =====================================================================
select 'comptes' as quoi,
       jsonb_build_object(
         'total', (select count(*) from auth.users),
         'operateurs_actifs', (select count(*) from public.operateurs where actif),
         'comptes_sans_droit', (select count(*) from auth.users u
                                 where not exists (select 1 from public.operateurs o
                                                    where o.user_id = u.id and o.actif)),
         'sans_droit_crees_30_jours', (select count(*) from auth.users u
                                 where u.created_at > now() - interval '30 days'
                                   and not exists (select 1 from public.operateurs o
                                                    where o.user_id = u.id and o.actif)),
         'sans_droit_deja_connectes', (select count(*) from auth.users u
                                 where u.last_sign_in_at is not null
                                   and not exists (select 1 from public.operateurs o
                                                    where o.user_id = u.id and o.actif))
       ) as detail
union all
select 'fonctions_presence',
       coalesce(jsonb_agg(jsonb_build_object(
           'fonction', p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')',
           'securite', case when p.prosecdef then 'definer' else 'invoker' end,
           'authenticated_execute', has_function_privilege('authenticated', p.oid, 'EXECUTE'),
           'anon_execute', has_function_privilege('anon', p.oid, 'EXECUTE'),
           -- Vrai si le code appelle l'une des deux gardes ou lit la table
           -- des opérateurs. Un indice, pas une preuve : le code est rendu
           -- juste après pour qu'on le lise.
           'verifie_le_droit', p.prosrc ~* '(est_exploitant|est_admin)\s*\(|from\s+(public\.)?operateurs\M',
           'code', regexp_replace(p.prosrc, '''[^'']*''', '''…''', 'g'))
         order by p.proname), '[]'::jsonb)
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public'
   and p.proname in ('presences_operateurs', 'signaler_presence', 'role_operateur')
union all
select 'vues_modifiables',
       coalesce(jsonb_agg(distinct c.relname || ' : ' || r.role || ' ' || d.droit), '[]'::jsonb)
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  cross join (values ('anon'), ('authenticated')) r(role)
  cross join (values ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE'), ('REFERENCES'), ('TRIGGER')) d(droit)
 where n.nspname = 'public' and c.relkind = 'v'
   and (has_table_privilege(r.role, c.oid, d.droit)
        or (d.droit in ('INSERT', 'UPDATE', 'REFERENCES')
            and has_any_column_privilege(r.role, c.oid, d.droit)))
union all
select 'droits_anon_tables',
       coalesce(jsonb_agg(distinct c.relname || ' : ' || d.droit), '[]'::jsonb)
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  cross join (values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE')) d(droit)
 where n.nspname = 'public' and c.relkind in ('r', 'p')
   and has_table_privilege('anon', c.oid, d.droit)
union all
select 'definer_anon',
       coalesce(jsonb_agg(p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')'
                          order by p.proname), '[]'::jsonb)
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.prosecdef
   and has_function_privilege('anon', p.oid, 'EXECUTE');
