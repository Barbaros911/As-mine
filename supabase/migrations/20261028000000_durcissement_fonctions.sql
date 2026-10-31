-- ============================================================================
-- DEUX DÉCLENCHEURS FIGÉS, UNE PORTE ANONYME FERMÉE — 28 octobre 2026
-- (audit sécurité du 28/10, alertes des conseillers Supabase).
--
-- CE QUE LES CONSEILLERS SIGNALAIENT, ET CE QUI EN RESTE APRÈS VÉRIFICATION
-- (inventaire de production du 24/10, exécutions n° 49 à 52 du workflow) :
--
-- 1. « search_path non fixé » sur neuf fonctions. Deux sont les déclencheurs
--    de « courses » : ela_courses_numero() (le N° court, à l'insertion) et
--    ela_courses_version() (version et date, à chaque modification). Ils
--    tournent avec le search_path de la SESSION qui écrit : celle de
--    « deposer-course », de l'admin, ou d'un outil de maintenance. Aucun
--    rôle public ne peut aujourd'hui changer ce réglage ni créer un objet
--    qui s'intercale (PostgREST n'exécute pas de SQL libre) : ce n'est PAS
--    une faille exploitable. C'est un durcissement : la table qui porte les
--    réservations ne doit pas dépendre du réglage de qui l'écrit.
--    On ne réécrit PAS leur corps : « alter function … set » ne touche que le
--    réglage. search_path vide : leur corps ne nomme que la séquence, déjà
--    écrite « public.courses_numero_seq », et des fonctions de pg_catalog,
--    toujours cherché en premier.
--    LES SEPT AUTRES NE BOUGENT PAS, ET C'EST VOULU (20261020040000) : ce
--    sont les outils SQL du Registre. Une fonction SQL qui porte un réglage
--    n'est plus dépliée dans la requête (mesuré : 0,3 s → 1,1 s sur 25 000
--    courses). Ils ne sont ni « security definer » ni exécutables par anon
--    ou authenticated, et ne tournent que dans des fonctions qui fixent
--    elles-mêmes leur search_path.
--
-- 2. « suivi(p_ref, p_jeton) » : SECURITY DEFINER, exécutable par anon,
--    lit « courses » par-dessus la RLS. AUCUNE page ni fonction du dépôt ne
--    l'appelle ; aucune course déposée aujourd'hui ne porte de « jeton ».
--    C'est une porte de lecture anonyme sur les courses, restée de l'ancien
--    site, alors que la règle dit qu'« etat-course » est la SEULE porte. Elle
--    ne rend que l'état et le nom du chauffeur, et seulement à qui connaît
--    un jeton de 16 caractères au moins : faible, mais inutile. On RETIRE le
--    droit d'exécution d'anon (et d'authenticated, de public) ; la fonction
--    reste, inerte, et service_role la garde. Rien n'est effacé.
--
-- CE QUI N'EST PAS TOUCHÉ, ET POURQUOI : les vues tarifaires (lues avec les
-- droits de leur propriétaire, VOULU : les tables portent la commission ;
-- lecture seule prouvée par 20261005000000), ela_mesurer (compteur anonyme
-- borné), les fonctions de l'admin (toutes vérifient est_exploitant() ou
-- est_admin() avant de lire quoi que ce soit), les tables à RLS sans
-- politique (fermées exprès, ouvertes seulement par des fonctions serveur).
--
-- PROTÉGÉE : si un déclencheur ne porte pas en production le corps que le
-- dépôt décrit, elle s'arrête AVANT de rien changer. Une seule transaction.
-- REJOUABLE : un réglage déjà posé et un droit déjà retiré ne changent rien.
-- AUCUNE DONNÉE n'est lue ni écrite.
-- RETOUR ARRIÈRE : 20261028000900_durcissement_fonctions_retour.sql.
-- Épreuves : supabase/tests/durcissement-fonctions-avant.sql et -apres.sql.
-- ============================================================================

do $$
declare
  attendu_numero constant text :=
    'begin new.numero := nextval(''public.courses_numero_seq''); if jsonb_typeof(new.bon) = ''object'' then new.bon := jsonb_set(new.bon, ''{numero}'', to_jsonb(new.numero)); end if; return new; end';
  attendu_version constant text :=
    'begin new.version := coalesce(old.version, 0) + 1; new.modifie_le := now(); new.numero := old.numero; if old.numero is not null and jsonb_typeof(new.bon) = ''object'' then new.bon := jsonb_set(new.bon, ''{numero}'', to_jsonb(old.numero)); end if; return new; end';
  corps text;
begin
  if to_regprocedure('public.ela_courses_numero()') is null
     or to_regprocedure('public.ela_courses_version()') is null then
    raise exception 'déclencheurs de « courses » introuvables : rien n''a été changé. Lancer 20261003010000_inventaire_schema.sql.';
  end if;
  select btrim(regexp_replace(p.prosrc, '\s+', ' ', 'g')) into corps
    from pg_proc p where p.oid = to_regprocedure('public.ela_courses_numero()');
  if corps is distinct from attendu_numero then
    raise exception 'ela_courses_numero() ne porte pas le corps du dépôt (20261006000000) : rien n''a été changé. Lire sa définition réelle avant d''aller plus loin.';
  end if;
  select btrim(regexp_replace(p.prosrc, '\s+', ' ', 'g')) into corps
    from pg_proc p where p.oid = to_regprocedure('public.ela_courses_version()');
  if corps is distinct from attendu_version then
    raise exception 'ela_courses_version() ne porte pas le corps du dépôt (20261006000000) : rien n''a été changé. Lire sa définition réelle avant d''aller plus loin.';
  end if;
end $$;

alter function public.ela_courses_numero() set search_path = '';
alter function public.ela_courses_version() set search_path = '';

-- « suivi » peut ne pas exister sur une base neuve : on ne retire que ce qui
-- est là. Le nom vient de l'inventaire de production, pas d'une doc.
do $$
begin
  if to_regprocedure('public.suivi(text, text)') is not null then
    revoke all on function public.suivi(text, text) from public, anon, authenticated;
  end if;
end $$;

-- LA PREUVE, DANS LA MIGRATION : sinon elle s'arrête plutôt que de se dire
-- appliquée.
do $$
declare
  f text;
begin
  foreach f in array array['public.ela_courses_numero()', 'public.ela_courses_version()'] loop
    if not exists (select 1 from pg_proc p
                    where p.oid = to_regprocedure(f)
                      and 'search_path=""' = any(coalesce(p.proconfig, '{}'))) then
      raise exception '% : search_path non fixé', f;
    end if;
  end loop;
  if to_regprocedure('public.suivi(text, text)') is not null
     and (has_function_privilege('anon', 'public.suivi(text, text)', 'EXECUTE')
          or has_function_privilege('authenticated', 'public.suivi(text, text)', 'EXECUTE')) then
    raise exception 'suivi(text, text) reste exécutable par anon ou authenticated';
  end if;
end $$;

-- Ce que rend le workflow : le réglage de chaque fonction touchée et qui peut
-- l'exécuter. Aucune donnée de course.
select p.oid::regprocedure::text as fonction,
       p.prosecdef as security_definer,
       p.proconfig as reglages,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute
  from pg_proc p
 where p.oid in (select to_regprocedure(x) from unnest(array[
         'public.ela_courses_numero()', 'public.ela_courses_version()',
         'public.suivi(text, text)']) as x)
 order by 1;
