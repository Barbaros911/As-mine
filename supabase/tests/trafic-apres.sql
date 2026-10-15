-- ============================================================================
-- LA MESURE DU TRAFIC (15 octobre 2026) — ÉPREUVES, APRÈS la migration
-- (appliquée deux fois). Chaque refus est vérifié POUR SA RAISON, et chaque
-- refus est précédé de la preuve que le même chemin répond à qui y a droit :
-- une base fermée à tout le monde rendrait les mêmes refus.
-- Comptes du décor : …0001 l'admin · …0002 l'agent · …0009 un inconnu.
-- ============================================================================

-- ── 1. LA STRUCTURE : personne ne lit ni n'écrit depuis le navigateur ────
do $$
declare t text; d text; f text;
begin
  foreach t in array array['public.evenements_site', 'public.trafic_sels'] loop
    if not (select relrowsecurity from pg_class where oid = t::regclass) then
      raise exception 'ECHEC 1 : RLS inactive sur %', t; end if;
    foreach d in array array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'] loop
      if has_table_privilege('anon', t, d) or has_table_privilege('authenticated', t, d) then
        raise exception 'ECHEC 1 : % accordé sur % depuis le navigateur', d, t; end if;
    end loop;
  end loop;
  foreach f in array array['public.ela_mesurer_evenement(jsonb,text)', 'public.ela_trafic_retention()',
                           'public.trafic_lignes(timestamptz,timestamptz)',
                           'public.trafic_agreger(timestamptz,timestamptz,text)',
                           'public.trafic_totaux(timestamptz,timestamptz)'] loop
    if has_function_privilege('anon', f, 'execute') or has_function_privilege('authenticated', f, 'execute') then
      raise exception 'ECHEC 1 : % exécutable depuis le navigateur', f; end if;
  end loop;
  if not has_function_privilege('service_role', 'public.ela_mesurer_evenement(jsonb,text)', 'execute') then
    raise exception 'ECHEC 1 : la fonction « mesure » ne pourra pas écrire'; end if;
  foreach f in array array['public.ela_trafic(text)', 'public.ela_trafic_direct()'] loop
    if has_function_privilege('anon', f, 'execute') then
      raise exception 'ECHEC 1 : % exécutable par un anonyme', f; end if;
    if not has_function_privilege('authenticated', f, 'execute') then
      raise exception 'ECHEC 1 : l''admin ne pourra pas appeler %', f; end if;
    if position('est_admin()' in pg_get_functiondef(to_regprocedure(f))) = 0 then
      raise exception 'ECHEC 1 : % n''a pas le verrou admin', f; end if;
  end loop;
  -- Le compteur d'origine est toujours là, toujours ouvert aux pages en cache.
  if not has_function_privilege('anon', 'public.ela_mesurer(text,text,text)', 'execute') then
    raise exception 'ECHEC 1 : le compteur d''origine a été fermé — les pages en cache ne compteraient plus'; end if;
end $$;

-- ── 2. L'ÉCRITURE (service_role) ───────────────────────────────────────
-- A = un téléphone (empreinte brute a…), B = un ordinateur (b…).
set role service_role;
do $$
declare ok boolean; a text := repeat('a', 64); b text := repeat('b', 64);
begin
  ok := public.ela_mesurer_evenement('{"evenement":"page_vue","page":"fr-cdg","source":"google","referent":"google.com","utm_source":"google","utm_campaign":"ete-2026","langue":"fr","appareil":"mobile","pays":"fr"}', a);
  if not ok then raise exception 'ECHEC 2 : une page vue valide est refusée'; end if;
  if (select pays from public.evenements_site limit 1) is distinct from 'FR' then raise exception 'ECHEC 2 : pays pas en majuscules'; end if;
  -- La même page vue dans la demi-heure ne compte pas…
  ok := public.ela_mesurer_evenement('{"evenement":"page_vue","page":"fr-cdg","source":"google"}', a);
  if ok then raise exception 'ECHEC 2 : une page vue en double est comptée'; end if;
  -- …mais le moteur ouvert ensuite, si. Arrivé SANS référent (navigation
  -- interne) : « direct » ici, et la visite restera « google ».
  ok := public.ela_mesurer_evenement('{"evenement":"moteur_ouvert","page":"fr-cdg","source":"direct"}', a);
  if not ok then raise exception 'ECHEC 2 : le moteur ouvert est refusé'; end if;
  ok := public.ela_mesurer_evenement('{"evenement":"clic_whatsapp","page":"fr-cdg","source":"direct","detail":{"choix_wa":"infos"}}', a);
  if not ok then raise exception 'ECHEC 2 : le premier appui WhatsApp est refusé'; end if;
  ok := public.ela_mesurer_evenement('{"evenement":"clic_whatsapp","page":"fr-cdg","source":"direct"}', a);
  if ok then raise exception 'ECHEC 2 : un double appui WhatsApp est compté deux fois'; end if;
  ok := public.ela_mesurer_evenement('{"evenement":"prix_demande","page":"fr-cdg","source":"direct","detail":{"aeroport":"cdg"}}', a);
  ok := public.ela_mesurer_evenement('{"evenement":"demande_envoyee","page":"fr-cdg","source":"direct","detail":{"ref":"ELA-26-10-AB12C"}}', a);
  if not ok then raise exception 'ECHEC 2 : la demande envoyée est refusée'; end if;
  ok := public.ela_mesurer_evenement('{"evenement":"demande_envoyee","page":"accueil","source":"direct","detail":{"ref":"ELA-26-10-AB12C"}}', b);
  if ok then raise exception 'ECHEC 2 : la même référence est comptée deux fois'; end if;
  -- B arrive par le lien d'un partenaire, sur la version anglaise.
  ok := public.ela_mesurer_evenement('{"evenement":"page_vue","page":"en-orly","source":"direct","lien":"hotel-exemple","langue":"en","appareil":"ordinateur"}', b);
  if not ok then raise exception 'ECHEC 2 : la page vue de B est refusée'; end if;
  -- Un code de lien inventé est une visite sans lien.
  ok := public.ela_mesurer_evenement('{"evenement":"page_vue","page":"pro","source":"direct","lien":"code-invente"}', b);
end $$;

select epreuve.refus('2 geste hors liste',
  $q$select public.ela_mesurer_evenement('{"evenement":"mouse_move","page":"fr-cdg"}', repeat('c',64))$q$, 'evenement_invalide');
select epreuve.refus('2 source inventée',
  $q$select public.ela_mesurer_evenement('{"evenement":"page_vue","page":"fr-cdg","source":"tiktok"}', repeat('c',64))$q$, 'evenement_invalide');
select epreuve.refus('2 page hors format (une adresse peut porter une référence)',
  $q$select public.ela_mesurer_evenement('{"evenement":"page_vue","page":"/?ok=abc"}', repeat('c',64))$q$, 'evenement_invalide');
select epreuve.refus('2 detail avec une clé libre (un nom)',
  $q$select public.ela_mesurer_evenement('{"evenement":"page_vue","page":"fr-cdg","detail":{"nom":"Dupont"}}', repeat('c',64))$q$, 'evenement_invalide');
select epreuve.refus('2 référence mal formée',
  $q$select public.ela_mesurer_evenement('{"evenement":"demande_envoyee","page":"fr-cdg","detail":{"ref":"Dupont 0612"}}', repeat('c',64))$q$, 'evenement_invalide');
select epreuve.refus('2 demande envoyée sans référence',
  $q$select public.ela_mesurer_evenement('{"evenement":"demande_envoyee","page":"fr-cdg"}', repeat('c',64))$q$, 'evenement_invalide');
select epreuve.refus('2 empreinte brute absente ou mal formée',
  $q$select public.ela_mesurer_evenement('{"evenement":"page_vue","page":"fr-cdg"}', '10.0.0.1')$q$, 'evenement_invalide');
select epreuve.refus('2 référent qui n''est pas un domaine',
  $q$select public.ela_mesurer_evenement('{"evenement":"page_vue","page":"fr-cdg","referent":"https://x.com/u?id=1"}', repeat('c',64))$q$, 'evenement_invalide');
reset role;

do $$
declare n int;
begin
  if exists (select 1 from public.evenements_site where visiteur !~ '^[0-9a-f]{32}$') then
    raise exception 'ECHEC 2 : une empreinte n''a pas la forme attendue'; end if;
  if exists (select 1 from public.evenements_site where visiteur in (left(repeat('a',64),32), left(repeat('b',64),32))) then
    raise exception 'ECHEC 2 : l''empreinte brute est écrite telle quelle — la clé du jour n''a pas servi'; end if;
  if (select count(distinct visiteur) from public.evenements_site) <> 2 then
    raise exception 'ECHEC 2 : deux appareils ne donnent pas deux visiteurs'; end if;
  select count(*) into n from public.evenements_site;
  if n <> 7 then raise exception 'ECHEC 2 : % lignes au lieu de 7 (un refus ou un doublon est écrit)', n; end if;
  if (select lien from public.evenements_site where page = 'en-orly') is distinct from 'hotel-exemple'
     or (select source from public.evenements_site where page = 'en-orly') is distinct from 'partenaire' then
    raise exception 'ECHEC 2 : le lien du partenaire n''est pas reconnu'; end if;
  if (select lien from public.evenements_site where page = 'pro') is not null then
    raise exception 'ECHEC 2 : un code de lien inventé est gardé'; end if;
  if (select count(*) from public.trafic_sels) <> 1 then
    raise exception 'ECHEC 2 : il n''y a pas exactement une clé du jour'; end if;
  -- LE COMPTEUR D'ORIGINE A SUIVI, par sa propre fonction : les écrans du
  -- registre continuent. Les deux gestes du prix n'y sont pas.
  if coalesce((select sum(nombre) from public.mesures_acquisition where page = 'fr-cdg' and evenement = 'page_vue'), 0) <> 1 then
    raise exception 'ECHEC 2 : le compteur n''a pas reçu la page vue (ou a reçu le doublon)'; end if;
  if coalesce((select sum(nombre) from public.mesures_acquisition where page = 'en-orly' and source = 'hotel-exemple'), 0) <> 1 then
    raise exception 'ECHEC 2 : le compteur n''a pas reçu le lien du partenaire'; end if;
  if exists (select 1 from public.mesures_acquisition where evenement like 'prix%') then
    raise exception 'ECHEC 2 : le compteur a reçu un geste qu''il ne connaît pas'; end if;
end $$;

-- ── 3. LA LECTURE : l'admin lit, l'agent et un inconnu sont refusés ───────
insert into public.courses(ref, statut, bon) values ('ELA-26-10-AB12C', 'realisee', '{}'::jsonb)
  on conflict (ref) do update set statut = 'realisee';

set role authenticated;
do $$
declare r jsonb; d jsonb; s jsonb;
begin
  perform set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000001', false);
  r := public.ela_trafic('aujourdhui');
  if (r->'totaux'->>'visiteurs')::int <> 2 then raise exception 'ECHEC 3 : % visiteurs au lieu de 2', r->'totaux'->>'visiteurs'; end if;
  if (r->'totaux'->>'pages_vues')::int <> 4 then raise exception 'ECHEC 3 : % pages vues au lieu de 4', r->'totaux'->>'pages_vues'; end if;
  if (r->'totaux'->>'whatsapp')::int <> 1 then raise exception 'ECHEC 3 : WhatsApp = %', r->'totaux'->>'whatsapp'; end if;
  if (r->'totaux'->>'prix')::int <> 1 then raise exception 'ECHEC 3 : prix = %', r->'totaux'->>'prix'; end if;
  if (r->'totaux'->>'reservations')::int <> 1 then raise exception 'ECHEC 3 : réservations = %', r->'totaux'->>'reservations'; end if;
  if (r->'totaux'->>'realisees')::int <> 1 then raise exception 'ECHEC 3 : la course réalisée n''est pas retrouvée par sa référence'; end if;
  -- LA SOURCE EST CELLE DE LA VISITE : la demande est partie d'un geste
  -- « direct », mais la visite est arrivée de Google.
  select x into s from jsonb_array_elements(r->'sources') x where x->>'valeur' = 'google';
  if s is null or (s->'totaux'->>'reservations')::int <> 1 or (s->'totaux'->>'realisees')::int <> 1 then
    raise exception 'ECHEC 3 : la réservation n''est pas attribuée à Google, la source de la visite (%)', r->'sources'; end if;
  if exists (select 1 from jsonb_array_elements(r->'sources') x where x->>'valeur' = 'direct' and (x->'totaux'->>'reservations')::int > 0) then
    raise exception 'ECHEC 3 : la réservation est attribuée à « direct » au changement de page'; end if;
  select x into s from jsonb_array_elements(r->'entrees') x where x->>'valeur' = 'fr-cdg';
  if s is null or (s->'totaux'->>'reservations')::int <> 1 then raise exception 'ECHEC 3 : la page d''entrée ne porte pas la réservation'; end if;
  select x into s from jsonb_array_elements(r->'liens') x where x->>'valeur' = 'hotel-exemple';
  if s is null or (s->'totaux'->>'visiteurs')::int <> 1 then raise exception 'ECHEC 3 : le lien du partenaire n''a pas son visiteur'; end if;
  -- LA CAMPAGNE EST CELLE DE LA VISITE, comme la source ; une visite sans
  -- UTM ne crée pas de ligne.
  select x into s from jsonb_array_elements(r->'campagnes') x where x->>'valeur' = 'ete-2026';
  if s is null or (s->'totaux'->>'reservations')::int <> 1 then raise exception 'ECHEC 3 : la campagne de la visite ne porte pas la réservation (%)', r->'campagnes'; end if;
  if jsonb_array_length(r->'campagnes') <> 1 then raise exception 'ECHEC 3 : une visite sans UTM crée une campagne (%)', r->'campagnes'; end if;
  if (select count(*) from jsonb_array_elements(r->'langues') x where x->>'valeur' in ('fr','en')) <> 2 then
    raise exception 'ECHEC 3 : les deux langues ne sont pas distinguées'; end if;
  if jsonb_array_length(r->'serie') < 1 or r->>'pas' <> 'hour' then raise exception 'ECHEC 3 : la série horaire du jour manque'; end if;
  -- Ce que l'admin reçoit ne porte ni empreinte ni référence.
  if r::text ~ '[0-9a-f]{32}' then raise exception 'ECHEC 3 : une empreinte sort vers l''admin'; end if;
  if r::text like '%AB12C%' then raise exception 'ECHEC 3 : une référence sort dans les agrégats'; end if;

  d := public.ela_trafic_direct();
  if (d->>'en_ligne')::int <> 2 then raise exception 'ECHEC 3 : % en ligne au lieu de 2', d->>'en_ligne'; end if;
  if jsonb_array_length(d->'actifs') <> 2 then raise exception 'ECHEC 3 : % actifs au lieu de 2', jsonb_array_length(d->'actifs'); end if;
  if d::text ~ '[0-9a-f]{32}' then raise exception 'ECHEC 3 : la liste en direct porte une empreinte'; end if;
  if (d->'aujourdhui'->>'visiteurs')::int <> 2 then raise exception 'ECHEC 3 : le jour n''est pas rendu avec le direct'; end if;
  perform public.ela_trafic('hier'); perform public.ela_trafic('7j'); perform public.ela_trafic('30j');
end $$;
select epreuve.refus('3 période inventée', $q$select public.ela_trafic('tout')$q$, 'periode_invalide');
do $$ begin perform set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000002', false); end $$;
select epreuve.refus('3 l''agent lit le trafic', $q$select public.ela_trafic('aujourdhui')$q$, 'acces_refuse');
select epreuve.refus('3 l''agent lit le direct', $q$select public.ela_trafic_direct()$q$, 'acces_refuse');
do $$ begin perform set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000009', false); end $$;
select epreuve.refus('3 un inconnu lit le trafic', $q$select public.ela_trafic('aujourdhui')$q$, 'acces_refuse');
do $$ begin perform set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000001', false); end $$;
select epreuve.refus('3 l''admin lit le journal brut', $q$select count(*) from public.evenements_site$q$, '42501');
select epreuve.refus('3 l''admin lit les clés du jour', $q$select count(*) from public.trafic_sels$q$, '42501');
reset role;
set role anon;
select epreuve.refus('3 un anonyme lit le trafic', $q$select public.ela_trafic('aujourdhui')$q$, '42501');
select epreuve.refus('3 un anonyme écrit un geste',
  $q$select public.ela_mesurer_evenement('{"evenement":"page_vue","page":"fr-cdg"}', repeat('d',64))$q$, '42501');
select epreuve.refus('3 un anonyme lit le journal', $q$select count(*) from public.evenements_site$q$, '42501');
reset role;

-- ── 4. UNE NOUVELLE JOURNÉE : nouvelle clé, l'ancienne détruite ──────────
-- La même empreinte brute, un autre jour, ne donne plus le même visiteur :
-- rien ne relie deux journées.
update public.trafic_sels set jour = jour - 1;
set role service_role;
select public.ela_mesurer_evenement('{"evenement":"page_vue","page":"fr-orly","source":"direct"}', repeat('a',64));
reset role;
do $$ begin
  if (select count(*) from public.trafic_sels) <> 1 or (select jour from public.trafic_sels) <> (now() at time zone 'Europe/Paris')::date then
    raise exception 'ECHEC 4 : la clé de la veille n''est pas détruite'; end if;
  if (select count(distinct visiteur) from public.evenements_site where visiteur in
       (select visiteur from public.evenements_site where page in ('fr-cdg','fr-orly'))) <> 2 then
    raise exception 'ECHEC 4 : la même empreinte brute donne le même visiteur deux jours de suite'; end if;
end $$;

-- ── 5. LA RÉTENTION ─────────────────────────────────────────────────────
update public.evenements_site set cree_le = now() - interval '100 days' where page = 'pro';
select public.ela_trafic_retention();
do $$ begin
  if exists (select 1 from public.evenements_site where page = 'pro') then
    raise exception 'ECHEC 5 : une ligne de 100 jours n''est pas effacée'; end if;
  if not exists (select 1 from public.evenements_site where page = 'fr-cdg') then
    raise exception 'ECHEC 5 : une ligne du jour a été effacée'; end if;
end $$;

select 'TRAFIC : toutes les épreuves passent' as resultat;
