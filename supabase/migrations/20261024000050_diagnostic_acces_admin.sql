-- =====================================================================
-- DIAGNOSTIC DE L'ACCÈS ADMIN — lecture seule, 24 octobre 2026
-- ---------------------------------------------------------------------
-- Mesure l'état RÉEL avant et après la double vérification
-- (20261024000000) : ce que le dépôt ne peut pas voir. Il ne modifie RIEN.
-- Le journal GitHub est PUBLIC : des nombres et des noms d'objets, jamais
-- une adresse e-mail, un identifiant de compte ni une donnée de course.
--
-- Comment lire :
--   operateurs        : pour chaque rôle, combien d'actifs et combien
--                       d'actifs AVEC un code vérifié. Avant le cliquet
--                       (20261024000100), « actifs_sans_code » doit être 0.
--   portes            : « niveau_de_session » vrai pour les deux, une fois
--                       20261024000000 appliquée ; « exigee_pour_tous » dit
--                       si le cliquet est levé.
--   definer_public    : chaque fonction « definer » du schéma public, qui
--                       peut l'exécuter, et si son code appelle une garde.
--                       Une ligne avec authenticated_execute = true et
--                       verifie_le_droit = false se lit à la main.
--   regles_sans_garde : les règles d'accès (RLS) qui n'appellent ni
--                       est_exploitant() ni est_admin(). Attendu : la seule
--                       « lire son propre droit » d'operateurs, et ce qui
--                       est volontairement public (tarifs, abonnements).
-- =====================================================================
select 'operateurs' as quoi,
       coalesce(jsonb_agg(jsonb_build_object(
         'role', x.role, 'actifs', x.actifs, 'inactifs', x.inactifs,
         'actifs_avec_code', x.avec_code, 'actifs_sans_code', x.actifs - x.avec_code)
         order by x.role), '[]'::jsonb) as detail
  from (select o.role,
               count(*) filter (where o.actif) as actifs,
               count(*) filter (where not o.actif) as inactifs,
               count(*) filter (where o.actif and exists (
                 select 1 from auth.mfa_factors f
                  where f.user_id = o.user_id and f.status = 'verified')) as avec_code
          from public.operateurs o group by o.role) x
union all
select 'portes',
       jsonb_build_object(
         'est_exploitant_niveau_de_session',
           position('ela_session_suffisante' in pg_get_functiondef('public.est_exploitant()'::regprocedure)) > 0,
         'est_admin_niveau_de_session',
           position('ela_session_suffisante' in pg_get_functiondef('public.est_admin()'::regprocedure)) > 0,
         'exigee_pour_tous',
           case when to_regclass('public.securite_admin') is null then null
                else (select to_jsonb(s) -> 'double_verification_exigee'
                        from public.securite_admin s limit 1) end,
         'comptes_avec_code_non_verifie',
           (select count(distinct f.user_id) from auth.mfa_factors f where f.status <> 'verified'))
union all
select 'definer_public',
       coalesce(jsonb_agg(jsonb_build_object(
           'fonction', p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')',
           'anon_execute', has_function_privilege('anon', p.oid, 'EXECUTE'),
           'authenticated_execute', has_function_privilege('authenticated', p.oid, 'EXECUTE'),
           'search_path_fixe', coalesce(array_to_string(p.proconfig, ',') ~ 'search_path', false),
           'verifie_le_droit', p.prosrc ~* '(est_exploitant|est_admin|ela_session_suffisante)\s*\(|auth\.uid\s*\(')
         order by p.proname), '[]'::jsonb)
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.prosecdef
union all
select 'regles_sans_garde',
       coalesce(jsonb_agg(jsonb_build_object(
           'table', tablename, 'regle', policyname, 'commande', cmd, 'roles', roles)
         order by tablename, policyname), '[]'::jsonb)
  from pg_policies
 where schemaname = 'public'
   and coalesce(qual, '') || ' ' || coalesce(with_check, '') !~ '(est_exploitant|est_admin)';
