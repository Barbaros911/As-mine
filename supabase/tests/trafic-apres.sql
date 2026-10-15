-- ============================================================================
-- LA MESURE DU TRAFIC (15 octobre 2026) — ÉPREUVES, APRÈS la migration
-- (appliquée deux fois). Décor : socle.sql, role-agent-avant.sql, la vraie
-- est_admin(), prospects.sql (privilèges par défaut de Supabase, service_role,
-- l'outil epreuve.refus). Chaque refus est vérifié POUR SA RAISON, et chaque
-- refus est précédé de la preuve que le même chemin répond à qui y a droit :
-- une base fermée à tout le monde rendrait les mêmes refus.
--
-- Les trois comptes du décor : …0001 l'admin · …0002 l'agent · …0009 un
-- compte connecté qui n'est opérateur de rien.
-- ============================================================================

-- ── 1. LA STRUCTURE : personne ne lit ni n'écrit la table depuis le navigateur
do $$
declare t text; p text; f text;
begin
  foreach t in array array['public.evenements_site', 'public.trafic_journalier'] loop
    if not (select relrowsecurity from pg_class where oid = t::regclass) then
      raise exception 'ECHEC 1 : RLS inactive sur %', t; end if;
    foreach p in array array['SELECT','INSERT','UPDATE','REFERENCES'] loop
      if has_any_column_privilege('anon', t, p) or has_any_column_privilege('authenticated', t, p) then
        raise exception 'ECHEC 1 : % accordé sur % depuis le navigateur', p, t; end if;
    end loop;
    foreach p in array array['DELETE','TRUNCATE','TRIGGER'] loop
      if has_table_privilege('anon', t, p) or has_table_privilege('authenticated', t, p) then
        raise exception 'ECHEC 1 : % accordé sur % depuis le navigateur', p, t; end if;
    end loop;
  end loop;
  foreach f in array array['public.ela_mesurer_evenement(jsonb)', 'public.ela_trafic_retention()',
                           'public.trafic_totaux(timestamptz,timestamptz,text,text)',
                           'public.trafic_tableau(timestamptz,timestamptz,text)'] loop
    if has_function_privilege('anon', f, 'execute') or has_function_privilege('authenticated', f, 'execute') then
      raise exception 'ECHEC 1 : % exécutable depuis le navigateur', f; end if;
    if not (select prosecdef from pg_proc where oid = to_regprocedure(f)) and f not like '%retention%' then
      raise exception 'ECHEC 1 : % sans security definer', f; end if;
  end loop;
  if not has_function_privilege('service_role', 'public.ela_mesurer_evenement(jsonb)', 'execute') then
    raise exception 'ECHEC 1 : la fonction « mesure » ne pourra pas écrire'; end if;
  foreach f in array array['public.ela_trafic(text)', 'public.ela_trafic_direct()'] loop
    if has_function_privilege('anon', f, 'execute') then
      raise exception 'ECHEC 1 : % exécutable par un anonyme', f; end if;
    if not has_function_privilege('authenticated', f, 'execute') then
      raise exception 'ECHEC 1 : l''admin ne pourra pas appeler %', f; end if;
    if position('est_admin()' in pg_get_functiondef(to_regprocedure(f))) = 0 then
      raise exception 'ECHEC 1 : % n''a pas le verrou admin', f; end if;
  end loop;
end $$;

-- ── 2. L'ÉCRITURE (service_role) : ce qui passe, ce qui est refusé ─────────
set role service_role;
do $$
declare ok boolean;
begin
  ok := public.ela_mesurer_evenement('{"session":"s1aaaaaaaa","visiteur":"v1aaaaaaaa","evenement":"page_view",
    "page":"/","landing":"/","source":"google","referent":"www.google.com","langue":"fr","appareil":"mobile","pays":"fr","espace":"public"}');
  if not ok then raise exception 'ECHEC 2 : une page vue valide est refusée'; end if;
  if (select pays from public.evenements_site where session = 's1aaaaaaaa') <> 'FR' then
    raise exception 'ECHEC 2 : le pays n''est pas mis en majuscules'; end if;

  -- Déduplication : la même page vue dans la même session ne compte pas.
  ok := public.ela_mesurer_evenement('{"session":"s1aaaaaaaa","visiteur":"v1aaaaaaaa","evenement":"page_view",
    "page":"/","source":"google","langue":"fr","appareil":"mobile","espace":"public"}');
  if ok then raise exception 'ECHEC 2 : une page vue en double est comptée'; end if;
  -- …mais une AUTRE page de la même session compte.
  ok := public.ela_mesurer_evenement('{"session":"s1aaaaaaaa","visiteur":"v1aaaaaaaa","evenement":"page_view",
    "page":"/transfert-cdg-paris.html","landing":"/","source":"google","langue":"fr","appareil":"mobile","espace":"public"}');
  if not ok then raise exception 'ECHEC 2 : une seconde page de la session est refusée'; end if;

  -- Un double appui sur WhatsApp n'est qu'une intention.
  ok := public.ela_mesurer_evenement('{"session":"s1aaaaaaaa","visiteur":"v1aaaaaaaa","evenement":"whatsapp_click",
    "page":"/","source":"google","langue":"fr","appareil":"mobile","espace":"public","detail":{"choix_wa":"infos"}}');
  if not ok then raise exception 'ECHEC 2 : le premier appui WhatsApp est refusé'; end if;
  ok := public.ela_mesurer_evenement('{"session":"s1aaaaaaaa","visiteur":"v1aaaaaaaa","evenement":"whatsapp_click",
    "page":"/","source":"google","langue":"fr","appareil":"mobile","espace":"public"}');
  if ok then raise exception 'ECHEC 2 : le double appui WhatsApp est compté deux fois'; end if;

  -- Une demande envoyée : une fois par référence, même depuis une autre session.
  ok := public.ela_mesurer_evenement('{"session":"s1aaaaaaaa","visiteur":"v1aaaaaaaa","evenement":"booking_submitted",
    "page":"/","landing":"/","source":"google","langue":"fr","appareil":"mobile","espace":"public","detail":{"ref":"ELA-26-10-AB12C"}}');
  if not ok then raise exception 'ECHEC 2 : la demande envoyée est refusée'; end if;
  ok := public.ela_mesurer_evenement('{"session":"s2bbbbbbbb","visiteur":"v2bbbbbbbb","evenement":"booking_submitted",
    "page":"/","source":"direct","langue":"en","appareil":"ordinateur","espace":"public","detail":{"ref":"ELA-26-10-AB12C"}}');
  if ok then raise exception 'ECHEC 2 : la même référence est comptée deux fois'; end if;

  -- Une seconde session, un autre visiteur, une autre page : c'est elle qui
  -- rend les « distincts » éprouvables plus bas.
  ok := public.ela_mesurer_evenement('{"session":"s2bbbbbbbb","visiteur":"v2bbbbbbbb","evenement":"page_view",
    "page":"/transfert-orly-paris.html","landing":"/transfert-orly-paris.html","source":"direct","langue":"en","appareil":"ordinateur","espace":"public"}');
  if not ok then raise exception 'ECHEC 2 : la page vue de la seconde session est refusée'; end if;
end $$;

-- Refus : chacun pour SA raison.
select epreuve.refus('2 événement hors liste',
  $q$select public.ela_mesurer_evenement('{"session":"s3cccccccc","visiteur":"v3cccccccc","evenement":"mouse_move","page":"/","espace":"public"}')$q$,
  'evenement_invalide');
select epreuve.refus('2 source inventée',
  $q$select public.ela_mesurer_evenement('{"session":"s3cccccccc","visiteur":"v3cccccccc","evenement":"page_view","page":"/","source":"tiktok","espace":"public"}')$q$,
  'evenement_invalide');
select epreuve.refus('2 page avec chaîne de requête (une adresse peut porter une référence)',
  $q$select public.ela_mesurer_evenement('{"session":"s3cccccccc","visiteur":"v3cccccccc","evenement":"page_view","page":"/?ok=abc","espace":"public"}')$q$,
  'evenement_invalide');
select epreuve.refus('2 detail avec une clé libre (un nom, un téléphone)',
  $q$select public.ela_mesurer_evenement('{"session":"s3cccccccc","visiteur":"v3cccccccc","evenement":"page_view","page":"/","espace":"public","detail":{"nom":"Dupont"}}')$q$,
  'evenement_invalide');
select epreuve.refus('2 espace admin (jamais mesuré)',
  $q$select public.ela_mesurer_evenement('{"session":"s3cccccccc","visiteur":"v3cccccccc","evenement":"page_view","page":"/","espace":"admin"}')$q$,
  'evenement_invalide');
select epreuve.refus('2 session trop courte',
  $q$select public.ela_mesurer_evenement('{"session":"abc","visiteur":"v3cccccccc","evenement":"page_view","page":"/","espace":"public"}')$q$,
  'evenement_invalide');
select epreuve.refus('2 demande envoyée sans référence',
  $q$select public.ela_mesurer_evenement('{"session":"s3cccccccc","visiteur":"v3cccccccc","evenement":"booking_submitted","page":"/","espace":"public"}')$q$,
  'evenement_invalide');
select epreuve.refus('2 referent qui n''est pas un domaine',
  $q$select public.ela_mesurer_evenement('{"session":"s3cccccccc","visiteur":"v3cccccccc","evenement":"page_view","page":"/","referent":"https://x.com/u?id=1","espace":"public"}')$q$,
  'evenement_invalide');
reset role;

-- Rien de refusé n'a laissé de ligne.
do $$ begin
  if exists (select 1 from public.evenements_site where session = 's3cccccccc') then
    raise exception 'ECHEC 2 : un événement refusé a été écrit'; end if;
  if (select count(*) from public.evenements_site) <> 5 then
    raise exception 'ECHEC 2 : % lignes au lieu de 5', (select count(*) from public.evenements_site); end if;
end $$;

-- ── 3. LA LECTURE : l'admin lit, l'agent et un inconnu sont refusés ─────────
insert into public.courses(ref, statut, bon) values ('ELA-26-10-AB12C', 'realisee', '{}'::jsonb)
  on conflict (ref) do update set statut = 'realisee';

set role authenticated;
do $$
declare r jsonb; d jsonb;
begin
  perform set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000001', false);
  r := public.ela_trafic('aujourdhui');
  if (r->'totaux'->>'visiteurs')::int <> 2 then
    raise exception 'ECHEC 3 : % visiteurs au lieu de 2 (deux identifiants distincts)', r->'totaux'->>'visiteurs'; end if;
  if (r->'totaux'->>'pages_vues')::int <> 3 then
    raise exception 'ECHEC 3 : % pages vues au lieu de 3 — le doublon a compté', r->'totaux'->>'pages_vues'; end if;
  if (r->'totaux'->>'whatsapp')::int <> 1 then
    raise exception 'ECHEC 3 : % WhatsApp au lieu de 1', r->'totaux'->>'whatsapp'; end if;
  if (r->'totaux'->>'reservations')::int <> 1 then
    raise exception 'ECHEC 3 : % réservations au lieu de 1', r->'totaux'->>'reservations'; end if;
  if (r->'totaux'->>'realisees')::int <> 1 then
    raise exception 'ECHEC 3 : la course réalisée n''est pas retrouvée par sa référence'; end if;
  if jsonb_array_length(r->'pages') <> 3 then
    raise exception 'ECHEC 3 : % pages au lieu de 3', jsonb_array_length(r->'pages'); end if;
  if r->'pages'->0->>'valeur' <> '/' then
    raise exception 'ECHEC 3 : la page la plus visitée n''est pas en tête'; end if;
  if (r->'pages'->0->'totaux'->>'reservations')::int <> 1 or (r->'pages'->0->'totaux'->>'whatsapp')::int <> 1 then
    raise exception 'ECHEC 3 : la page « / » ne porte pas sa réservation et son WhatsApp'; end if;
  if (select count(*) from jsonb_array_elements(r->'langues') l where l->>'valeur' in ('fr','en')) <> 2 then
    raise exception 'ECHEC 3 : les deux langues ne sont pas distinguées'; end if;
  -- À égalité de visiteurs (1 et 1), l'ordre est alphabétique : la règle
  -- qu'on éprouve est que la réservation est attribuée à google, pas à direct.
  if (select (l->'totaux'->>'reservations')::int from jsonb_array_elements(r->'sources') l where l->>'valeur' = 'google') <> 1
     or (select (l->'totaux'->>'reservations')::int from jsonb_array_elements(r->'sources') l where l->>'valeur' = 'direct') <> 0 then
    raise exception 'ECHEC 3 : la réservation n''est pas attribuée à sa source'; end if;
  if (select (l->'totaux'->>'reservations')::int from jsonb_array_elements(r->'landings') l where l->>'valeur' = '/') <> 1 then
    raise exception 'ECHEC 3 : la réservation n''est pas attribuée à sa page d''entrée'; end if;
  if jsonb_array_length(r->'serie') < 1 or r->>'pas' <> 'hour' then
    raise exception 'ECHEC 3 : la série horaire du jour manque'; end if;
  -- Ce que le navigateur reçoit ne porte AUCUNE ligne brute ni identifiant.
  if r::text like '%s1aaaaaaaa%' or r::text like '%v1aaaaaaaa%' then
    raise exception 'ECHEC 3 : un identifiant de session sort vers l''admin'; end if;
  if r::text like '%AB12C%' then
    raise exception 'ECHEC 3 : une référence de course sort dans les agrégats'; end if;

  d := public.ela_trafic_direct();
  if (d->>'en_ligne')::int <> 2 then
    raise exception 'ECHEC 3 : % en ligne au lieu de 2', d->>'en_ligne'; end if;
  if jsonb_array_length(d->'actifs') <> 2 then
    raise exception 'ECHEC 3 : la liste des actifs a % lignes au lieu de 2', jsonb_array_length(d->'actifs'); end if;
  if d->'actifs'->0 ? 'session' or d->'actifs'->0 ? 'visiteur' then
    raise exception 'ECHEC 3 : la liste en direct porte un identifiant'; end if;
  if (d->'aujourdhui'->>'visiteurs')::int <> 2 then
    raise exception 'ECHEC 3 : le jour en cours n''est pas rendu avec le direct'; end if;

  -- Les quatre périodes répondent ; une cinquième est refusée.
  perform public.ela_trafic('hier'); perform public.ela_trafic('7j'); perform public.ela_trafic('30j');
end $$;
select epreuve.refus('3 période inventée', $q$select public.ela_trafic('tout')$q$, 'periode_invalide');

-- L'agent de réservation : exploitant, mais pas admin — refusé.
do $$ begin perform set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000002', false); end $$;
select epreuve.refus('3 l''agent lit le trafic', $q$select public.ela_trafic('aujourdhui')$q$, 'acces_refuse');
select epreuve.refus('3 l''agent lit le direct', $q$select public.ela_trafic_direct()$q$, 'acces_refuse');
-- Un compte connecté qui n'est opérateur de rien.
do $$ begin perform set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000009', false); end $$;
select epreuve.refus('3 un inconnu lit le trafic', $q$select public.ela_trafic('aujourdhui')$q$, 'acces_refuse');
-- Et la table elle-même reste fermée, même à l'admin : seule la RPC agrège.
do $$ begin perform set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000001', false); end $$;
select epreuve.refus('3 l''admin lit la table brute', $q$select count(*) from public.evenements_site$q$, '42501');
reset role;

set role anon;
select epreuve.refus('3 un anonyme lit le trafic', $q$select public.ela_trafic('aujourdhui')$q$, '42501');
select epreuve.refus('3 un anonyme écrit un événement',
  $q$select public.ela_mesurer_evenement('{"session":"s4dddddddd","visiteur":"v4dddddddd","evenement":"page_view","page":"/","espace":"public"}')$q$, '42501');
select epreuve.refus('3 un anonyme lit la table', $q$select count(*) from public.evenements_site$q$, '42501');
reset role;

-- ── 4. LA RÉTENTION : la veille est agrégée, le vieux est effacé ───────────
-- On antidate deux lignes : une d'hier (agrégée, gardée), une de 100 jours
-- (agrégée, effacée).
set role service_role;
do $$ begin
  perform public.ela_mesurer_evenement('{"session":"s5eeeeeeee","visiteur":"v5eeeeeeee","evenement":"page_view","page":"/orly","source":"direct","langue":"en","appareil":"tablette","espace":"public"}');
  perform public.ela_mesurer_evenement('{"session":"s6ffffffff","visiteur":"v6ffffffff","evenement":"page_view","page":"/orly","source":"direct","langue":"en","appareil":"tablette","espace":"public"}');
end $$;
reset role;
update public.evenements_site set cree_le = now() - interval '1 day' where session = 's5eeeeeeee';
update public.evenements_site set cree_le = now() - interval '100 days' where session = 's6ffffffff';
select public.ela_trafic_retention();
do $$ begin
  if exists (select 1 from public.evenements_site where session = 's6ffffffff') then
    raise exception 'ECHEC 4 : la ligne de 100 jours n''est pas effacée'; end if;
  if not exists (select 1 from public.evenements_site where session = 's5eeeeeeee') then
    raise exception 'ECHEC 4 : la ligne d''hier a été effacée'; end if;
  if (select sum(nb) from public.trafic_journalier where page = '/orly') <> 2 then
    raise exception 'ECHEC 4 : l''agrégat journalier ne porte pas les deux pages vues'; end if;
  if exists (select 1 from public.trafic_journalier where jour = (now() at time zone 'Europe/Paris')::date) then
    raise exception 'ECHEC 4 : le jour en cours a été agrégé (il n''est pas fini)'; end if;
end $$;
-- Rejouée, la rétention ne double rien.
select public.ela_trafic_retention();
do $$ begin
  if (select sum(nb) from public.trafic_journalier where page = '/orly') <> 2 then
    raise exception 'ECHEC 4 : l''agrégat a doublé au second passage'; end if;
end $$;

select 'TRAFIC : toutes les épreuves passent' as resultat;
