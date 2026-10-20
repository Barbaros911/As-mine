-- ============================================================================
-- LE REGISTRE COMPTE SUR LE SERVEUR — épreuves APRÈS 20261020040000.
-- Le décor (socle + rôles + est_admin) est posé avant ; ce fichier ajoute la
-- colonne « cree_le » que la production porte, des courses aux valeurs
-- connues, puis un VOLUME (25 000 courses) : au-delà des 1 000 que l'appareil
-- relit, le total et les chiffres doivent rester vrais.
-- Les deux côtés sont éprouvés : ce qui doit compter compte, ce qui ne doit
-- pas compter (essai, refusée, autre semaine) n'est pas compté — une RPC qui
-- rendrait tout ou rien passerait sinon.
-- ============================================================================
alter table public.courses add column if not exists cree_le timestamptz not null default now();

-- Les dates sont relatives à AUJOURD'HUI, heure de Paris : lundi de cette
-- semaine (l0) et lundi de la précédente.
create temporary table j as
  select (now() at time zone 'Europe/Paris')::date as auj,
         date_trunc('week', (now() at time zone 'Europe/Paris')::date)::date as l0;
grant select on j to authenticated;

insert into public.courses(ref, statut, bon, cree_le)
select v.ref, v.statut, v.bon, now() - interval '1 day'
  from j, lateral (values
  -- Réalisée cette semaine, commission en % posée sur la course (15 % de 80 = 12).
  ('ELA-T-0001', 'realisee', jsonb_build_object('ref','ELA-T-0001','numero',1001,
     'course', jsonb_build_object('date', j.l0::text, 'heure','09:00','depart','Place Vendôme, Paris','arrivee','Aéroport CDG'),
     'client', jsonb_build_object('nom','Mme Martin','telephone','06 12 34 56 78'),
     'prix', jsonb_build_object('total', 80), 'chauffeur', jsonb_build_object('nom','Mehmet'),
     'commission', jsonb_build_object('mode','pct','valeur',15), 'provenance','Affiche · Ibis CDG', 'via','ibis-cdg')),
  -- Réalisée cette semaine, commission FIGÉE de 20 €, même chauffeur.
  ('ELA-T-0002', 'realisee', jsonb_build_object('ref','ELA-T-0002','numero',1002,
     'course', jsonb_build_object('date', j.l0::text, 'heure','14:00','depart','Orly 1','arrivee','Paris 15e'),
     'client', jsonb_build_object('nom','M. Durand','telephone','0798765432'),
     'prix', jsonb_build_object('total', 100), 'chauffeur', jsonb_build_object('nom','Mehmet'),
     'commissionFigee', jsonb_build_object('montant',20,'mode','eur','source','canal'))),
  -- Réalisée cette semaine, SANS aucune commission connue du serveur.
  ('ELA-T-0003', 'realisee', jsonb_build_object('ref','ELA-T-0003',
     'course', jsonb_build_object('date', j.l0::text, 'heure','18:00','depart','Gare de Lyon','arrivee','Orly'),
     'client', jsonb_build_object('nom','M. Petit'), 'prix', jsonb_build_object('total', 60),
     'chauffeur', jsonb_build_object('nom','Karim'), 'provenance','Affiche · Ibis CDG')),
  -- Réalisée la semaine dernière.
  ('ELA-T-0004', 'realisee', jsonb_build_object('ref','ELA-T-0004',
     'course', jsonb_build_object('date', (j.l0 - 3)::text, 'heure','10:00','depart','Disneyland','arrivee','CDG'),
     'client', jsonb_build_object('nom','Mrs Smith'), 'prix', jsonb_build_object('total', 90),
     'chauffeur', jsonb_build_object('nom','Karim'), 'via','ibis-cdg')),
  -- ESSAI réalisé cette semaine : ne compte NULLE PART dans les chiffres.
  ('ELA-T-0005', 'realisee', jsonb_build_object('ref','ELA-T-0005','essai',true,
     'course', jsonb_build_object('date', j.l0::text, 'heure','11:00','depart','Essai','arrivee','Essai'),
     'client', jsonb_build_object('nom','Essai'), 'prix', jsonb_build_object('total', 999),
     'chauffeur', jsonb_build_object('nom','Mehmet'), 'via','ibis-cdg', 'provenance','Affiche · Ibis CDG')),
  -- Refusée cette semaine : une demande, pas de l'argent.
  ('ELA-T-0006', 'refusee', jsonb_build_object('ref','ELA-T-0006',
     'course', jsonb_build_object('date', j.l0::text, 'heure','12:00','depart','Versailles','arrivee','CDG'),
     'client', jsonb_build_object('nom','M. Refus'), 'prix', jsonb_build_object('total', 150), 'via','ibis-cdg')),
  -- Confirmée, venue du lien, à venir.
  ('ELA-T-0007', 'confirmee', jsonb_build_object('ref','ELA-T-0007',
     'course', jsonb_build_object('date', (j.auj + 2)::text, 'heure','07:00','depart','Ibis CDG','arrivee','Paris'),
     'client', jsonb_build_object('nom','Mme Conf'), 'prix', jsonb_build_object('total', 70), 'via','ibis-cdg',
     'chauffeur', jsonb_build_object('nom','Karim'))),
  -- Statut absent de la colonne : celui du bon fait foi, sinon « attente ».
  ('ELA-T-0008', null, jsonb_build_object('ref','ELA-T-0008','statut','attente',
     'course', jsonb_build_object('date', (j.auj + 1)::text, 'heure','08:00','depart','Montparnasse','arrivee','Orly'),
     'client', jsonb_build_object('nom','M. Attente'), 'prix', jsonb_build_object('total', 50))),
  -- DÉLAI : déposée par le site cette semaine, confirmée 10 min après.
  ('ELA-T-0009', 'confirmee', jsonb_build_object('ref','ELA-T-0009',
     'cree', to_char((j.l0::timestamp at time zone 'Europe/Paris') + interval '1 hour', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
     'confirmeeLe', to_char((j.l0::timestamp at time zone 'Europe/Paris') + interval '1 hour 10 minutes', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
     'securite', jsonb_build_object('empreinteDepot','abc'),
     'course', jsonb_build_object('date', (j.auj + 3)::text, 'heure','06:00','depart','Opéra','arrivee','CDG'),
     'client', jsonb_build_object('nom','Mme Délai'), 'prix', jsonb_build_object('total', 75))),
  -- DÉLAI : déposée par le site cette semaine, confirmée 50 min après.
  ('ELA-T-0010', 'confirmee', jsonb_build_object('ref','ELA-T-0010',
     'cree', to_char((j.l0::timestamp at time zone 'Europe/Paris') + interval '2 hours', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
     'confirmeeLe', to_char((j.l0::timestamp at time zone 'Europe/Paris') + interval '2 hours 50 minutes', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
     'securite', jsonb_build_object('empreinteDepot','def'),
     'course', jsonb_build_object('date', (j.auj + 3)::text, 'heure','07:30','depart','Bastille','arrivee','Orly'),
     'client', jsonb_build_object('nom','M. Lent'), 'prix', jsonb_build_object('total', 65))),
  -- Une date illisible ne fait pas tomber le Registre.
  ('ELA-T-0011', 'realisee', jsonb_build_object('ref','ELA-T-0011',
     'course', jsonb_build_object('date','2026-02-31','heure','10:00','depart','X','arrivee','Y'),
     'client', jsonb_build_object('nom','Date fausse'), 'prix', jsonb_build_object('total', 10))),
  -- UNE PROVENANCE ÉCRITE À LA MAIN (« Lien · … », texte libre qu'un client
  -- peut envoyer) SANS code « via » posé par le serveur : ne compte pour
  -- AUCUN lien de partenaire.
  ('ELA-T-0012', 'realisee', jsonb_build_object('ref','ELA-T-0012',
     'course', jsonb_build_object('date', j.l0::text, 'heure','16:00','depart','Faux','arrivee','Faux'),
     'client', jsonb_build_object('nom','Faux lien'), 'prix', jsonb_build_object('total', 500),
     'provenance','Lien · ibis-cdg'))
  ) as v(ref, statut, bon);

-- 1. Les droits : anon n'exécute rien ; l'agent cherche mais ne lit pas l'argent.
do $$
begin
  if has_function_privilege('anon', 'public.ela_registre_resume(text)', 'execute') then raise exception 'ECHEC 1 : anon lit le résumé'; end if;
  if has_function_privilege('anon', 'public.ela_registre_courses(text,text,text,text,date,date,integer,integer)', 'execute') then raise exception 'ECHEC 1 : anon cherche'; end if;
  if has_function_privilege('anon', 'public.ela_liens_resultats(integer)', 'execute') then raise exception 'ECHEC 1 : anon lit les liens'; end if;
  if has_function_privilege('authenticated', 'public.ela_registre_nombre(jsonb)', 'execute') then raise exception 'ECHEC 1 : un outil interne est exposé'; end if;
end $$;

select set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000002', false);
set role authenticated;
do $$
declare r jsonb;
begin
  begin
    perform public.ela_registre_resume('semaine');
    raise exception 'ECHEC 1 : l''agent lit les chiffres du Registre';
  exception when insufficient_privilege then null; end;
  begin
    perform * from public.ela_liens_resultats(30);
    raise exception 'ECHEC 1 : l''agent lit l''argent des liens';
  exception when insufficient_privilege then null; end;
  r := public.ela_registre_courses('martin');
  if (r->>'total')::int <> 1 then raise exception 'ECHEC 1 : l''agent ne cherche plus (%)', r; end if;
end $$;
reset role;

-- Un compte qui n'est pas exploitant ne cherche pas non plus.
select set_config('test.uid', 'bbbbbbbb-0000-0000-0000-000000000009', false);
set role authenticated;
do $$
begin
  begin
    perform public.ela_registre_courses('martin');
    raise exception 'ECHEC 1 : un inconnu cherche dans le registre';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- 2. Les chiffres, sur les valeurs connues (admin).
select set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000001', false);
set role authenticated;
do $$
declare r jsonb; ch jsonb; pr jsonb;
begin
  r := public.ela_registre_resume('semaine');
  -- 11 courses, dont 1 essai : 10 comptées.
  if (r->>'total')::int <> 11 then raise exception 'ECHEC 2 : total % au lieu de 11', r->>'total'; end if;
  if (r->'par_statut'->>'realisee')::int <> 6 then raise exception 'ECHEC 2 : % réalisées au lieu de 6 (essai exclu, date fausse comprise)', r->'par_statut'->>'realisee'; end if;
  if (r->'par_statut'->>'attente')::int <> 1 then raise exception 'ECHEC 2 : le statut du bon ne fait pas foi quand la colonne est vide'; end if;
  -- Cette semaine : 80 + 100 + 60 + 500 (l'essai et la refusée ne comptent pas).
  if (r->'semaine'->>'n')::int <> 4 or (r->'semaine'->>'total')::numeric <> 740 then
    raise exception 'ECHEC 2 : semaine % au lieu de 4 courses / 740 €', r->'semaine'; end if;
  if (r->'semaine_avant'->>'n')::int <> 1 or (r->'semaine_avant'->>'total')::numeric <> 90 then
    raise exception 'ECHEC 2 : semaine précédente % au lieu de 1 / 90 €', r->'semaine_avant'; end if;
  -- Chauffeurs : Mehmet 180 € (12 + 20 de commission), Karim 150 € dont 1 sans commission connue.
  select x into ch from jsonb_array_elements(r->'chauffeurs') x where x->>'nom' = 'Mehmet';
  if (ch->>'total')::numeric <> 180 or (ch->>'commission')::numeric <> 32 or (ch->>'sans_commission')::int <> 0 then
    raise exception 'ECHEC 2 : Mehmet %', ch; end if;
  select x into ch from jsonb_array_elements(r->'chauffeurs') x where x->>'nom' = 'Karim';
  if (ch->>'n')::int <> 2 or (ch->>'total')::numeric <> 150 or (ch->>'sans_commission')::int <> 2 then
    raise exception 'ECHEC 2 : Karim % (la commission inconnue doit être comptée à part, jamais à zéro en silence)', ch; end if;
  if (r->'chauffeurs'->0->>'nom') <> 'Mehmet' then raise exception 'ECHEC 2 : les chauffeurs ne sont pas rangés du plus rapporteur au moins'; end if;
  -- Provenance : 2 demandes de l'affiche (l'essai exclu), 2 réalisées, 140 €.
  select x into pr from jsonb_array_elements(r->'provenances') x where x->>'nom' = 'Affiche · Ibis CDG';
  if (pr->>'demandes')::int <> 2 or (pr->>'realisees')::int <> 2 or (pr->>'total')::numeric <> 140 then
    raise exception 'ECHEC 2 : provenance %', pr; end if;
  -- Délai : deux demandes du site cette semaine, 10 et 50 min : médiane 30 min, 1 en moins de 15 min.
  if (r->'delai'->>'n')::int <> 2 or (r->'delai'->>'mediane_ms')::numeric <> 1800000 or (r->'delai'->>'vite')::int <> 1 then
    raise exception 'ECHEC 2 : délai %', r->'delai'; end if;
  if r->'delai'->'pire'->>'ref' <> 'ELA-T-0010' then raise exception 'ECHEC 2 : la plus longue n''est pas la bonne (%)', r->'delai'->'pire'; end if;
  -- Les listes des filtres viennent du serveur.
  if not (r->'options'->'chauffeurs') @> '["Karim","Mehmet"]'::jsonb then raise exception 'ECHEC 2 : options chauffeurs %', r->'options'; end if;
  if jsonb_array_length(r->'periodes') < 2 then raise exception 'ECHEC 2 : résultat par période %', r->'periodes'; end if;
  -- Par mois : la clé est « AAAA-MM ».
  r := public.ela_registre_resume('mois');
  if (r->'periodes'->0->>'cle') !~ '^\d{4}-\d{2}$' then raise exception 'ECHEC 2 : période mensuelle %', r->'periodes'->0; end if;
  r := public.ela_registre_resume('n-importe-quoi');
  if r->>'periode' <> 'semaine' then raise exception 'ECHEC 2 : une période inconnue n''est pas ramenée à la semaine'; end if;
end $$;

-- 3. Rechercher, filtrer, paginer.
do $$
declare r jsonb;
begin
  r := public.ela_registre_courses('vendome');
  if (r->>'total')::int <> 1 or r->'courses'->0->>'ref' <> 'ELA-T-0001' then raise exception 'ECHEC 3 : « vendome » ne trouve pas « Vendôme » (%)', r; end if;
  r := public.ela_registre_courses('0612345678');
  if (r->>'total')::int <> 1 then raise exception 'ECHEC 3 : le téléphone tapé d''une traite ne trouve pas « 06 12 34 56 78 »'; end if;
  if r->'courses'->0 ? 'telephone' or (r->'courses'->0)::text like '%06 12%' then raise exception 'ECHEC 3 : la liste renvoie le téléphone'; end if;
  r := public.ela_registre_courses('1002');
  if r->'courses'->0->>'ref' <> 'ELA-T-0002' then raise exception 'ECHEC 3 : le N° court ne trouve pas sa course'; end if;
  r := public.ela_registre_courses('essai');
  if (r->>'total')::int <> 1 or (r->'courses'->0->>'essai')::boolean is not true then raise exception 'ECHEC 3 : la recherche ne trouve pas un essai, ou ne le dit pas'; end if;
  r := public.ela_registre_courses(null, 'realisee');
  if (r->>'total')::int <> 7 then raise exception 'ECHEC 3 : filtre statut % au lieu de 7 (la recherche couvre aussi les essais)', r->>'total'; end if;
  r := public.ela_registre_courses(null, null, 'karim');
  if (r->>'total')::int <> 3 then raise exception 'ECHEC 3 : filtre chauffeur % au lieu de 3', r->>'total'; end if;
  r := public.ela_registre_courses(null, null, null, 'Affiche · Ibis CDG');
  if (r->>'total')::int <> 3 then raise exception 'ECHEC 3 : filtre source % au lieu de 3', r->>'total'; end if;
  r := public.ela_registre_courses(null, null, null, '(direct)');
  if (r->>'total')::int <> 8 then raise exception 'ECHEC 3 : filtre « venue directe » % au lieu de 8', r->>'total'; end if;
  r := public.ela_registre_courses(null, null, null, null, (select l0 - 7 from j), (select l0 - 1 from j));
  if (r->>'total')::int <> 1 or r->'courses'->0->>'ref' <> 'ELA-T-0004' then raise exception 'ECHEC 3 : filtre dates %', r; end if;
  r := public.ela_registre_courses(null, null, null, null, null, null, 4, 0);
  if (r->>'total')::int <> 12 or jsonb_array_length(r->'courses') <> 4 then raise exception 'ECHEC 3 : page 1 %', r->>'total'; end if;
  -- Les plus récentes d'abord (date de course) : la confirmée du jour + 3.
  if r->'courses'->0->>'date' <> (select (auj + 3)::text from j) then raise exception 'ECHEC 3 : ordre %', r->'courses'->0; end if;
  r := public.ela_registre_courses(null, null, null, null, null, null, 4, 8);
  if jsonb_array_length(r->'courses') <> 4 then raise exception 'ECHEC 3 : dernière page % au lieu de 4', jsonb_array_length(r->'courses'); end if;
  r := public.ela_registre_courses(null, null, null, null, null, null, 5000, 0);
  if (r->>'limite')::int <> 100 then raise exception 'ECHEC 3 : la page n''est pas bornée à 100'; end if;
  r := public.ela_registre_courses('aucune-course-ne-porte-ce-texte');
  if (r->>'total')::int <> 0 or jsonb_array_length(r->'courses') <> 0 then raise exception 'ECHEC 3 : une recherche vide rend %', r; end if;
end $$;

-- 4. Les liens : la vérité serveur, essai exclu, refusée comptée en demande.
do $$
declare l record;
begin
  if exists (select 1 from public.ela_liens_resultats(30) where code like 'Lien%' or demandes > 4) then
    raise exception 'ECHEC 4 : une provenance « Lien · … » écrite à la main compte pour un lien'; end if;
  select * into l from public.ela_liens_resultats(30) where code = 'ibis-cdg';
  if l.demandes <> 4 or l.confirmees <> 3 or l.realisees <> 2 or l.chiffre <> 170 then
    raise exception 'ECHEC 4 : lien ibis-cdg % / % / % / %', l.demandes, l.confirmees, l.realisees, l.chiffre; end if;
end $$;
reset role;

-- 4 bis. Les outils de date ne lèvent JAMAIS d'erreur, et tiennent sous un
-- plan parallèle (le premier jet, en PL/pgSQL avec exception, y tombait).
do $$
begin
  if public.ela_registre_jour('2026-02-31') is not null or public.ela_registre_jour('0000-01-01') is not null
     or public.ela_registre_jour('2026-13-01') is not null or public.ela_registre_jour('n''importe') is not null
     or public.ela_registre_jour(null) is not null then raise exception 'ECHEC 4 bis : une date fausse passe'; end if;
  if public.ela_registre_jour('2024-02-29') <> date '2024-02-29' then raise exception 'ECHEC 4 bis : le 29 février bissextile est refusé'; end if;
  if public.ela_registre_instant('2026-10-20T25:00:00Z') is not null or public.ela_registre_instant('2026-10-20') is not null then
    raise exception 'ECHEC 4 bis : un horodatage faux passe'; end if;
  if public.ela_registre_instant('2026-10-20T08:15:00.123Z') <> timestamptz '2026-10-20 08:15:00.123+00' then
    raise exception 'ECHEC 4 bis : un horodatage ISO juste est refusé'; end if;
end $$;

-- 5. LE VOLUME : 25 000 courses de plus, sur deux ans. Le total et l'argent
-- doivent être exacts au-delà des 1 000 que l'appareil relit.
insert into public.courses(ref, statut, bon, cree_le)
select 'ELA-V-' || lpad(i::text, 6, '0'),
       case when i % 4 = 0 then 'realisee' when i % 4 = 1 then 'confirmee' when i % 4 = 2 then 'attente' else 'refusee' end,
       jsonb_build_object('ref', 'ELA-V-' || lpad(i::text, 6, '0'), 'numero', 5000 + i,
         'course', jsonb_build_object('date', ((select auj from j) - 400 - (i % 300))::text, 'heure', '10:00',
                                      'depart', 'Rue ' || i || ' Paris', 'arrivee', 'CDG'),
         'client', jsonb_build_object('nom', 'Client ' || i, 'telephone', '06 00 00 ' || lpad((i % 100)::text, 2, '0') || ' 00'),
         'prix', jsonb_build_object('total', 50),
         'chauffeur', jsonb_build_object('nom', 'Chauffeur ' || (i % 7)),
         'provenance', case when i % 10 = 0 then 'Affiche · Volume' else '' end),
       now() - make_interval(days => i % 700)
  from generate_series(1, 25000) i;

select set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000001', false);
set role authenticated;
do $$
declare r jsonb; t0 timestamptz; ms_resume numeric; ms_cherche numeric; n_real bigint; tot numeric;
begin
  t0 := clock_timestamp();
  r := public.ela_registre_resume('annee');
  ms_resume := extract(epoch from clock_timestamp() - t0) * 1000;
  if (r->>'total')::int <> 25011 then raise exception 'ECHEC 5 : total % au lieu de 25 011', r->>'total'; end if;
  if (r->'par_statut'->>'realisee')::int <> 6256 then raise exception 'ECHEC 5 : % réalisées au lieu de 6 256', r->'par_statut'->>'realisee'; end if;
  select x into r from jsonb_array_elements(r->'provenances') x where x->>'nom' = 'Affiche · Volume';
  -- i % 10 = 0 : 2 500 demandes ; parmi elles i % 4 = 0 (i multiple de 20) : 1 250 réalisées à 50 €.
  if (r->>'demandes')::int <> 2500 or (r->>'realisees')::int <> 1250 or (r->>'total')::numeric <> 62500 then
    raise exception 'ECHEC 5 : provenance au volume %', r; end if;
  t0 := clock_timestamp();
  r := public.ela_registre_courses('client 24999');
  ms_cherche := extract(epoch from clock_timestamp() - t0) * 1000;
  if (r->>'total')::int <> 1 then raise exception 'ECHEC 5 : la course la plus ancienne n''est pas trouvée (%)', r->>'total'; end if;
  r := public.ela_registre_courses(null, 'realisee', null, null, null, null, 20, 0);
  if (r->>'total')::int <> 6257 or jsonb_array_length(r->'courses') <> 20 then
    raise exception 'ECHEC 5 : % réalisées, page de % lignes', r->>'total', jsonb_array_length(r->'courses'); end if;
  r := public.ela_registre_courses(null, null, 'chauffeur 3', null, null, null, 20, 3500);
  if (r->>'total')::int <> 3572 or jsonb_array_length(r->'courses') <> 20 then
    raise exception 'ECHEC 5 : pagination profonde % / %', r->>'total', jsonb_array_length(r->'courses'); end if;
  raise notice 'VOLUME 25 011 courses : résumé % ms, recherche % ms', round(ms_resume), round(ms_cherche);
  if ms_resume > 15000 or ms_cherche > 15000 then raise exception 'ECHEC 5 : trop lent (résumé % ms, recherche % ms)', round(ms_resume), round(ms_cherche); end if;
end $$;
reset role;


-- Le même calcul, plan parallèle FORCÉ.
set parallel_setup_cost = 0; set parallel_tuple_cost = 0; set min_parallel_table_scan_size = 0;
set max_parallel_workers_per_gather = 2;
do $$
declare n bigint;
begin
  select count(public.ela_registre_date(bon)) + count(public.ela_registre_instant(bon->>'cree')) into n from public.courses;
  if n < 25000 then raise exception 'ECHEC 5 : % dates lues sous un plan parallèle', n; end if;
end $$;
reset parallel_setup_cost; reset parallel_tuple_cost; reset min_parallel_table_scan_size; reset max_parallel_workers_per_gather;

do $$ begin raise notice 'registre-serveur : toutes les épreuves passent'; end $$;
