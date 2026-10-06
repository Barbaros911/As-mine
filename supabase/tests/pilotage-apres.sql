-- ============================================================================
-- LE PILOTAGE (Issue #197, bloc 1) — ÉPREUVES, APRÈS la migration (appliquée
-- deux fois). Chaque refus est vérifié POUR SA RAISON (epreuve.refus), et
-- chaque refus est précédé de la preuve que la même table répond à l'admin :
-- une table fermée à tout le monde rendrait les mêmes refus.
--
-- Trois comptes, ceux du décor role-agent-avant.sql :
--   …0001 l'admin · …0002 l'agent de réservation (exploitant, pas admin)
--   …0009 un compte connecté qui n'est pas opérateur du tout.
-- ============================================================================

-- ── 1. LA STRUCTURE : droits, policies, fonctions, déclencheurs ──────────
do $$
declare t text; p text; n int;
begin
  foreach t in array array['public.pilotage_cartes', 'public.pilotage_journal'] loop
    if not (select relrowsecurity from pg_class where oid = t::regclass) then
      raise exception 'ECHEC 1 : RLS inactive sur %', t; end if;
    foreach p in array array['SELECT','INSERT','UPDATE','REFERENCES'] loop
      if has_any_column_privilege('anon', t, p) then
        raise exception 'ECHEC 1 : anon a % sur %', p, t; end if;
    end loop;
    foreach p in array array['DELETE','TRUNCATE','TRIGGER'] loop
      if has_table_privilege('anon', t, p) or has_table_privilege('authenticated', t, p) then
        raise exception 'ECHEC 1 : % accordé sur %', p, t; end if;
    end loop;
    if not has_table_privilege('authenticated', t, 'SELECT') then
      raise exception 'ECHEC 1 : l''admin ne pourra pas lire %', t; end if;
  end loop;
  if has_any_column_privilege('authenticated', 'public.pilotage_journal', 'INSERT')
     or has_any_column_privilege('authenticated', 'public.pilotage_journal', 'UPDATE') then
    raise exception 'ECHEC 1 : le journal s''écrit depuis le navigateur'; end if;
  foreach p in array array['id','version','cree_le','modifie_le','archivee_le','termine_le'] loop
    if has_column_privilege('authenticated', 'public.pilotage_cartes', p, 'INSERT')
       or has_column_privilege('authenticated', 'public.pilotage_cartes', p, 'UPDATE') then
      raise exception 'ECHEC 1 : le navigateur peut écrire « % »', p; end if;
  end loop;
  if has_column_privilege('authenticated', 'public.pilotage_cartes', 'archivee', 'INSERT')
     or not has_column_privilege('authenticated', 'public.pilotage_cartes', 'archivee', 'UPDATE') then
    raise exception 'ECHEC 1 : l''archivage se fait par modification, jamais à la création'; end if;

  select count(*) into n from pg_policies where schemaname = 'public' and tablename = 'pilotage_cartes';
  if n <> 3 then raise exception 'ECHEC 1 : % policies sur les cartes (3 attendues : lire, créer, modifier)', n; end if;
  select count(*) into n from pg_policies where schemaname = 'public' and tablename = 'pilotage_journal';
  if n <> 1 then raise exception 'ECHEC 1 : % policies sur le journal (1 attendue : lire)', n; end if;
  if exists (select 1 from pg_policies where schemaname = 'public'
              and tablename in ('pilotage_cartes', 'pilotage_journal')
              and (cmd in ('DELETE', 'ALL') or roles::text <> '{authenticated}'
                   or (qual is null and with_check is null)
                   or coalesce(qual, '') || coalesce(with_check, '') like '%est_exploitant%'
                   or (qual is not null and qual not like '%est_admin()%')
                   or (with_check is not null and with_check not like '%est_admin()%'))) then
    raise exception 'ECHEC 1 : une policy du Pilotage n''est pas « authenticated + est_admin() »'; end if;

  if not (select prosecdef from pg_proc where oid = 'public.pilotage_journaliser()'::regprocedure) then
    raise exception 'ECHEC 1 : le journal n''est plus écrit avec les droits du propriétaire'; end if;
  if (select prosecdef from pg_proc where oid = 'public.pilotage_avant_ecriture()'::regprocedure) then
    raise exception 'ECHEC 1 : le contrôle d''écriture ne doit pas contourner la RLS'; end if;
  foreach p in array array['public.pilotage_journaliser()', 'public.pilotage_avant_ecriture()'] loop
    if has_function_privilege('anon', p, 'execute') or has_function_privilege('authenticated', p, 'execute') then
      raise exception 'ECHEC 1 : % est appelable directement', p; end if;
  end loop;
  foreach p in array array['public.pilotage_categorie_valide(text,text)',
                           'public.pilotage_checklist_valide(jsonb)',
                           'public.pilotage_checklist_complete(jsonb)'] loop
    if has_function_privilege('anon', p, 'execute') then
      raise exception 'ECHEC 1 : anon peut exécuter %', p; end if;
  end loop;

  select count(*) into n from pg_trigger where tgrelid = 'public.pilotage_cartes'::regclass and not tgisinternal;
  if n <> 2 then raise exception 'ECHEC 1 : % déclencheurs après rejeu (2 attendus)', n; end if;

  -- Les courses n'ont pas bougé.
  if (select row(declencheurs, policies, droits, colonnes) from public.epreuve_courses_avant) is distinct from
     (select row((select count(*) from pg_trigger where tgrelid = 'public.courses'::regclass and not tgisinternal),
                 (select count(*) from pg_policies where schemaname = 'public' and tablename = 'courses'),
                 (select string_agg(grantee || ':' || privilege_type, ',' order by grantee, privilege_type)
                    from information_schema.role_table_grants
                   where table_schema = 'public' and table_name = 'courses'),
                 (select string_agg(column_name || ':' || data_type, ',' order by ordinal_position)
                    from information_schema.columns
                   where table_schema = 'public' and table_name = 'courses'))) then
    raise exception 'ECHEC 1 : la migration du Pilotage a touché à la table des courses'; end if;
end $$;

-- ── 2. L'ADMIN CRÉE ──────────────────────────────────────────────────
select set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000001', false);
set role authenticated;
do $$
declare r public.pilotage_cartes; n int;
begin
  if not public.est_admin() then raise exception 'ECHEC 2 : décor — l''admin n''est pas reconnu'; end if;

  insert into public.pilotage_cartes(tableau, titre)
  values ('produit', '  Bouton « Voir mon prix » trop bas  ') returning * into r;
  if r.titre <> 'Bouton « Voir mon prix » trop bas' then
    raise exception 'ECHEC 2 : le titre n''est pas nettoyé (« % »)', r.titre; end if;
  if r.statut <> 'idee' or r.priorite <> 'P2' or r.version <> 1 or r.archivee
     or r.categorie is not null or r.termine_le is not null or r.archivee_le is not null
     or r.impacts <> '{}' or r.checklist <> '[]'::jsonb or r.description <> '' then
    raise exception 'ECHEC 2 : valeurs par défaut inattendues : %', row_to_json(r); end if;
  if r.cree_le <> now() or r.modifie_le <> now() then
    raise exception 'ECHEC 2 : les dates ne sont pas celles du serveur'; end if;
  perform set_config('test.carte_a', r.id::text, false);

  -- Une carte Opérations qui DÉPEND d'une carte Produit : les dépendances
  -- traversent les tableaux.
  insert into public.pilotage_cartes(tableau, categorie, titre, description, statut, priorite,
      responsable, prochaine_action, impacts, echeance, dependances, checklist, lien_github)
  values ('operations', 'societe', 'Créer la micro-entreprise (SIRET)', 'Formalités en ligne',
      'a_faire', 'P1', '  Barbaros ', 'Remplir le formulaire', array['image','ca','ca'],
      date '2026-10-12', array[r.id, r.id],
      '[{"texte":" Numéro SIRET reçu ","fait":false},{"texte":"Mentions légales à jour","fait":false}]',
      'https://github.com/Barbaros911/As-mine/issues/197')
  returning * into r;
  if r.responsable <> 'Barbaros' or r.impacts <> array['ca','image']
     or r.dependances <> array[current_setting('test.carte_a')::uuid]
     or r.checklist->0->>'texte' <> 'Numéro SIRET reçu' then
    raise exception 'ECHEC 2 : la carte n''est pas normalisée : %', row_to_json(r); end if;
  perform set_config('test.carte_b', r.id::text, false);

  select count(*) into n from public.pilotage_journal
   where action = 'creation' and acteur = 'aaaaaaaa-0000-0000-0000-000000000001'
     and carte_id in (current_setting('test.carte_a')::uuid, r.id);
  if n <> 2 then raise exception 'ECHEC 2 : % créations journalisées au nom de l''admin (2 attendues)', n; end if;
end $$;

-- 2b. Ce que seule la base pose : le navigateur n'a pas le droit de l'envoyer.
do $$
declare b text := current_setting('test.carte_b');
begin
  perform epreuve.refus('2b créer avec une date', $q$insert into public.pilotage_cartes(tableau, titre, cree_le) values ('produit', 'Date imposée', '2020-01-01')$q$, '42501');
  perform epreuve.refus('2b créer avec une version', $q$insert into public.pilotage_cartes(tableau, titre, version) values ('produit', 'Version imposée', 7)$q$, '42501');
  perform epreuve.refus('2b créer avec un identifiant', $q$insert into public.pilotage_cartes(id, tableau, titre) values (gen_random_uuid(), 'produit', 'Identifiant imposé')$q$, '42501');
  perform epreuve.refus('2b créer déjà archivée', $q$insert into public.pilotage_cartes(tableau, titre, archivee) values ('produit', 'Archivée d''office', true)$q$, '42501');
  perform epreuve.refus('2b créer déjà terminée hier', $q$insert into public.pilotage_cartes(tableau, titre, termine_le) values ('produit', 'Terminée hier', now())$q$, '42501');
  perform epreuve.refus('2b changer la version', format('update public.pilotage_cartes set version = 99 where id = %L', b), '42501');
  perform epreuve.refus('2b changer la date de création', format('update public.pilotage_cartes set cree_le = now() - interval ''1 year'' where id = %L', b), '42501');
  perform epreuve.refus('2b changer la date de modification', format('update public.pilotage_cartes set modifie_le = now() where id = %L', b), '42501');
  perform epreuve.refus('2b changer l''identifiant', format('update public.pilotage_cartes set id = gen_random_uuid() where id = %L', b), '42501');
  -- Jamais de suppression, même pour l'admin.
  perform epreuve.refus('2b supprimer une carte', format('delete from public.pilotage_cartes where id = %L', b), '42501');
  perform epreuve.refus('2b vider les cartes', 'truncate public.pilotage_cartes', '42501');
  -- Le journal ne s'écrit pas à la main, même par l'admin.
  perform epreuve.refus('2b écrire au journal', format($q$insert into public.pilotage_journal(carte_id, action) values (%L, 'statut')$q$, b), '42501');
  perform epreuve.refus('2b réécrire le journal', 'update public.pilotage_journal set action = ''statut''', '42501');
  perform epreuve.refus('2b effacer le journal', 'delete from public.pilotage_journal', '42501');
  perform epreuve.refus('2b vider le journal', 'truncate public.pilotage_journal', '42501');
end $$;
reset role;

-- ── 3. L'ADMIN MODIFIE, ET UNE COPIE PÉRIMÉE N'ÉCRASE RIEN ──────────────
-- Une transaction à part : sans elle, la modification aurait la même heure
-- que la création, et l'épreuve de la date ne prouverait rien.
select pg_sleep(0.02);
select set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000001', false);
set role authenticated;
do $$
declare b uuid := current_setting('test.carte_b')::uuid; n bigint; r public.pilotage_cartes; j jsonb;
begin
  n := epreuve.lignes(format($q$update public.pilotage_cartes
         set titre = 'Créer l''entreprise (SIRET)', description = 'contenu-qui-ne-doit-pas-entrer-au-journal'
       where id = %L and version = 1$q$, b));
  if n <> 1 then raise exception 'ECHEC 3 : la modification sous version 1 a touché % ligne(s)', n; end if;
  select * into r from public.pilotage_cartes where id = b;
  if r.version <> 2 then raise exception 'ECHEC 3 : version % après une modification (2 attendue)', r.version; end if;
  if r.modifie_le <= r.cree_le then raise exception 'ECHEC 3 : la date de modification n''a pas avancé'; end if;

  -- Le téléphone avait la version 1 : il ne doit rien écraser.
  n := epreuve.lignes(format($q$update public.pilotage_cartes set titre = 'Écrasement' where id = %L and version = 1$q$, b));
  if n <> 0 then raise exception 'ECHEC 3 : une copie périmée a écrasé la carte'; end if;

  select apres into j from public.pilotage_journal where carte_id = b and action = 'contenu' order by id desc limit 1;
  if j is distinct from '{"champs":["titre","description"]}'::jsonb then
    raise exception 'ECHEC 3 : journal du contenu inattendu : %', j; end if;
  if exists (select 1 from public.pilotage_journal
              where coalesce(avant::text, '') || coalesce(apres::text, '') like '%contenu-qui-ne-doit-pas%') then
    raise exception 'ECHEC 3 : le contenu d''un champ libre est entré au journal'; end if;
end $$;

-- ── 4. LE DÉROULÉ ET SES RÈGLES ──────────────────────────────────────
do $$
declare
  a text := current_setting('test.carte_a');
  b text := current_setting('test.carte_b');
  r public.pilotage_cartes;
  j record;
begin
  -- Une idée peut rester sans catégorie ; « À faire » en exige une, de SON tableau.
  perform epreuve.refus('4 à faire sans catégorie', format($q$update public.pilotage_cartes set statut = 'a_faire' where id = %L$q$, a), 'pilotage_cartes_categorie');
  perform epreuve.refus('4 catégorie de l''autre tableau', format($q$update public.pilotage_cartes set categorie = 'societe' where id = %L$q$, a), 'pilotage_cartes_categorie');
  perform epreuve.refus('4 catégorie inconnue', format($q$update public.pilotage_cartes set categorie = 'lancement' where id = %L$q$, a), 'pilotage_cartes_categorie');
  update public.pilotage_cartes set categorie = 'reservation', statut = 'a_faire' where id = a::uuid;
  -- Une dépendance vise une carte qui existe, jamais elle-même.
  perform epreuve.refus('4 dépendre de soi', format($q$update public.pilotage_cartes set dependances = array[%L::uuid] where id = %L$q$, a, a), 'pilotage_dependance_elle_meme');
  perform epreuve.refus('4 dépendre de rien', format($q$update public.pilotage_cartes set dependances = array[gen_random_uuid()] where id = %L$q$, a), 'pilotage_dependance_inconnue');

  -- « Terminé » exige la checklist complète.
  perform epreuve.refus('4 terminer sans checklist', format($q$update public.pilotage_cartes set statut = 'termine' where id = %L$q$, b), 'pilotage_cartes_termine_checklist');
  -- « Bloqué » exige une raison.
  perform epreuve.refus('4 bloquer sans raison', format($q$update public.pilotage_cartes set bloque = true where id = %L$q$, b), 'pilotage_cartes_blocage');
  perform epreuve.refus('4 bloquer avec une raison vide', format($q$update public.pilotage_cartes set bloque = true, raison_blocage = '   ' where id = %L$q$, b), 'pilotage_cartes_blocage');
  update public.pilotage_cartes set bloque = true, raison_blocage = ' En attente de l''URSSAF ' where id = b::uuid;
  update public.pilotage_cartes set checklist = jsonb_set(jsonb_set(checklist, '{0,fait}', 'true'), '{1,fait}', 'true') where id = b::uuid;
  -- Une carte bloquée ne se termine pas.
  perform epreuve.refus('4 terminer bloquée', format($q$update public.pilotage_cartes set statut = 'termine' where id = %L$q$, b), 'pilotage_cartes_termine_debloque');
  -- Débloquer efface la raison, même si on la renvoie.
  update public.pilotage_cartes set bloque = false, raison_blocage = 'reste collée' where id = b::uuid;
  select * into r from public.pilotage_cartes where id = b::uuid;
  if r.raison_blocage is not null then raise exception 'ECHEC 4 : la raison survit au déblocage'; end if;

  update public.pilotage_cartes set statut = 'termine' where id = b::uuid;
  select * into r from public.pilotage_cartes where id = b::uuid;
  if r.termine_le is null then raise exception 'ECHEC 4 : « terminé le » n''est pas posé'; end if;
  perform epreuve.refus('4 décocher une carte terminée', format($q$update public.pilotage_cartes set checklist = jsonb_set(checklist, '{0,fait}', 'false') where id = %L$q$, b), 'pilotage_cartes_termine_checklist');
  perform epreuve.refus('4 bloquer une carte terminée', format($q$update public.pilotage_cartes set bloque = true, raison_blocage = 'Après coup' where id = %L$q$, b), 'pilotage_cartes_termine_debloque');
  -- Rouvrir efface la date de fin.
  update public.pilotage_cartes set statut = 'en_cours' where id = b::uuid;
  select * into r from public.pilotage_cartes where id = b::uuid;
  if r.termine_le is not null then raise exception 'ECHEC 4 : la date de fin survit à la réouverture'; end if;

  update public.pilotage_cartes set priorite = 'P0' where id = b::uuid;
  update public.pilotage_cartes set responsable = 'Claude' where id = b::uuid;
  update public.pilotage_cartes set echeance = date '2026-10-10' where id = b::uuid;
  -- Changer de tableau oblige à changer de catégorie.
  perform epreuve.refus('4 tableau sans sa catégorie', format($q$update public.pilotage_cartes set tableau = 'produit' where id = %L$q$, b), 'pilotage_cartes_categorie');
  update public.pilotage_cartes set tableau = 'produit', categorie = 'admin' where id = b::uuid;

  -- Le journal a tout gardé, avec l'avant, l'après et l'auteur.
  for j in select * from (values
      ('statut', '{"statut":"a_faire"}', '{"statut":"termine"}'),
      ('statut', '{"statut":"termine"}', '{"statut":"en_cours"}'),
      ('priorite', '{"priorite":"P1"}', '{"priorite":"P0"}'),
      ('responsable', '{"responsable":"Barbaros"}', '{"responsable":"Claude"}'),
      ('echeance', '{"echeance":"2026-10-12"}', '{"echeance":"2026-10-10"}'),
      ('tableau', '{"tableau":"operations"}', '{"tableau":"produit"}'),
      ('categorie', '{"categorie":"societe"}', '{"categorie":"admin"}'),
      ('blocage', '{"bloque":false,"raison":null}', '{"bloque":true,"raison":"En attente de l''URSSAF"}'),
      ('deblocage', '{"bloque":true,"raison":"En attente de l''URSSAF"}', '{"bloque":false,"raison":null}')
    ) as v(action, avant, apres) loop
    if not exists (select 1 from public.pilotage_journal
                    where carte_id = b::uuid and action = j.action
                      and avant = j.avant::jsonb and apres = j.apres::jsonb
                      and acteur = 'aaaaaaaa-0000-0000-0000-000000000001') then
      raise exception 'ECHEC 4 : le journal n''a pas « % » % → %', j.action, j.avant, j.apres; end if;
  end loop;
  if not exists (select 1 from public.pilotage_journal where carte_id = a::uuid and action = 'statut'
                  and apres = '{"statut":"a_faire"}') then
    raise exception 'ECHEC 4 : le passage de l''idée à « À faire » n''est pas journalisé'; end if;
end $$;

-- ── 5. ARCHIVER PLUTÔT QUE SUPPRIMER ─────────────────────────────────
do $$
declare a text := current_setting('test.carte_a'); r public.pilotage_cartes;
begin
  update public.pilotage_cartes set archivee = true where id = a::uuid;
  select * into r from public.pilotage_cartes where id = a::uuid;
  if r.archivee_le is null then raise exception 'ECHEC 5 : la date d''archivage n''est pas posée'; end if;
  perform epreuve.refus('5 modifier une archivée', format($q$update public.pilotage_cartes set titre = 'Retouche en douce' where id = %L$q$, a), 'pilotage_carte_archivee');
  perform epreuve.refus('5 changer le statut d''une archivée', format($q$update public.pilotage_cartes set statut = 'en_cours' where id = %L$q$, a), 'pilotage_carte_archivee');
  update public.pilotage_cartes set archivee = false where id = a::uuid;
  select * into r from public.pilotage_cartes where id = a::uuid;
  if r.archivee or r.archivee_le is not null then raise exception 'ECHEC 5 : la restauration n''a pas abouti'; end if;
  update public.pilotage_cartes set titre = 'Bouton « Voir mon prix » sous la barre du bas' where id = a::uuid;
  update public.pilotage_cartes set archivee = true where id = a::uuid;
  if (select count(*) from public.pilotage_journal where carte_id = a::uuid and action in ('archivage', 'restauration')) <> 3 then
    raise exception 'ECHEC 5 : archivage et restauration ne sont pas tous journalisés'; end if;
end $$;

-- ── 6. L'INTÉGRITÉ : chaque valeur interdite est refusée par SA règle ───
do $$
declare
  i int; ids uuid[] := '{}'; v uuid;
  base text := $q$insert into public.pilotage_cartes(tableau, categorie, statut, titre%s) values ('produit', 'admin', 'a_faire', 'Carte valide'%s)$q$;
begin
  perform epreuve.refus('6 tableau', $q$insert into public.pilotage_cartes(tableau, titre) values ('finance', 'Tableau inconnu')$q$, 'pilotage_cartes_tableau');
  perform epreuve.refus('6 statut', $q$insert into public.pilotage_cartes(tableau, categorie, titre, statut) values ('produit', 'admin', 'Statut inconnu', 'a_tester')$q$, 'pilotage_cartes_statut');
  perform epreuve.refus('6 priorité', $q$insert into public.pilotage_cartes(tableau, titre, priorite) values ('produit', 'Priorité inconnue', 'P4')$q$, 'pilotage_cartes_priorite');
  perform epreuve.refus('6 titre court', $q$insert into public.pilotage_cartes(tableau, titre) values ('produit', ' ab ')$q$, 'pilotage_cartes_titre');
  perform epreuve.refus('6 titre long', format($q$insert into public.pilotage_cartes(tableau, titre) values ('produit', %L)$q$, repeat('x', 121)), 'pilotage_cartes_titre');
  perform epreuve.refus('6 titre sur deux lignes', $q$insert into public.pilotage_cartes(tableau, titre) values ('produit', E'Deux\nlignes')$q$, 'pilotage_cartes_titre');
  perform epreuve.refus('6 description', format(base, ', description', ', ' || quote_literal(repeat('x', 4001))), 'pilotage_cartes_description');
  perform epreuve.refus('6 responsable', format(base, ', responsable', ', ' || quote_literal(repeat('x', 41))), 'pilotage_cartes_responsable');
  perform epreuve.refus('6 prochaine action', format(base, ', prochaine_action', ', ' || quote_literal(repeat('x', 201))), 'pilotage_cartes_prochaine_action');
  perform epreuve.refus('6 impact', format(base, ', impacts', $q$, array['ca','licorne']$q$), 'pilotage_cartes_impacts');
  perform epreuve.refus('6 checklist objet', format(base, ', checklist', $q$, '{"texte":"x","fait":false}'$q$), 'pilotage_cartes_checklist');
  perform epreuve.refus('6 checklist texte vide', format(base, ', checklist', $q$, '[{"texte":"  ","fait":false}]'$q$), 'pilotage_cartes_checklist');
  perform epreuve.refus('6 checklist « fait » texte', format(base, ', checklist', $q$, '[{"texte":"x","fait":"oui"}]'$q$), 'pilotage_cartes_checklist');
  perform epreuve.refus('6 checklist clé en trop', format(base, ', checklist', $q$, '[{"texte":"x","fait":true,"html":"<b>"}]'$q$), 'pilotage_cartes_checklist');
  perform epreuve.refus('6 checklist trop longue', format(base, ', checklist', ', ' || quote_literal(
    (select jsonb_agg(jsonb_build_object('texte', 'critère ' || g, 'fait', false)) from generate_series(1, 21) g)::text)),
    'pilotage_cartes_checklist');
  perform epreuve.refus('6 lien hors GitHub', format(base, ', lien_github', $q$, 'https://exemple.com/issues/1'$q$), 'pilotage_cartes_lien_github');
  perform epreuve.refus('6 lien javascript', format(base, ', lien_github', $q$, 'javascript:alert(1)'$q$), 'pilotage_cartes_lien_github');
  perform epreuve.refus('6 lien autre dépôt', format(base, ', lien_github', $q$, 'https://github.com/autre/depot/issues/1'$q$), 'pilotage_cartes_lien_github');
  perform epreuve.refus('6 lien avec suite', format(base, ', lien_github', $q$, 'https://github.com/Barbaros911/As-mine/issues/1"onmouseover="x'$q$), 'pilotage_cartes_lien_github');
  perform epreuve.refus('6 échéance absurde', format(base, ', echeance', $q$, date '1999-01-01'$q$), 'pilotage_cartes_echeance');
  perform epreuve.refus('6 raison trop courte', format(base, ', bloque, raison_blocage', $q$, true, 'ab'$q$), 'pilotage_cartes_blocage');
  perform epreuve.refus('6 dépendance inconnue', format(base, ', dependances', $q$, array[gen_random_uuid()]$q$), 'pilotage_dependance_inconnue');
  -- Les règles du « terminé » valent aussi à la création.
  perform epreuve.refus('6 créée terminée, checklist non cochée', $q$insert into public.pilotage_cartes(tableau, categorie, statut, titre, checklist) values ('produit', 'admin', 'termine', 'Terminée trop vite', '[{"texte":"x","fait":false}]')$q$, 'pilotage_cartes_termine_checklist');
  perform epreuve.refus('6 créée terminée et bloquée', $q$insert into public.pilotage_cartes(tableau, categorie, statut, titre, bloque, raison_blocage) values ('produit', 'admin', 'termine', 'Terminée bloquée', true, 'Attente')$q$, 'pilotage_cartes_termine_debloque');
  -- Plus de dix dépendances : il faut onze cartes qui EXISTENT, sinon c'est
  -- la règle d'existence qui répondrait à la place de celle du nombre.
  for i in 1..11 loop
    insert into public.pilotage_cartes(tableau, titre) values ('operations', 'Carte de remplissage ' || i) returning id into v;
    ids := ids || v;
  end loop;
  perform epreuve.refus('6 onze dépendances', format(base, ', dependances', ', ' || quote_literal(ids::text) || '::uuid[]'), 'pilotage_cartes_dependances');
  -- Et la valeur juste passe : un refus généralisé rendrait les mêmes refus.
  execute format(base, ', impacts, checklist, lien_github, dependances',
    $q$, array['securite','conformite'], '[{"texte":"Vérifié en production","fait":false}]', 'https://github.com/barbaros911/as-mine/pull/326', $q$
    || quote_literal(ids[1:10]::text) || '::uuid[]');
end $$;
reset role;

-- ── 7. L'AGENT DE RÉSERVATION : exploitant, mais pas admin ──────────────
select set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000002', false);
set role authenticated;
do $$
declare n bigint; b text := current_setting('test.carte_b');
begin
  if not public.est_exploitant() or public.est_admin() then
    raise exception 'ECHEC 7 : décor — l''agent doit être exploitant et pas admin'; end if;
  select count(*) into n from public.pilotage_cartes;
  if n <> 0 then raise exception 'ECHEC 7 : l''agent lit % carte(s)', n; end if;
  select count(*) into n from public.pilotage_journal;
  if n <> 0 then raise exception 'ECHEC 7 : l''agent lit % ligne(s) du journal', n; end if;
  perform epreuve.refus('7 agent crée', $q$insert into public.pilotage_cartes(tableau, titre) values ('produit', 'Carte de l''agent')$q$, 'row-level security');
  n := epreuve.lignes(format($q$update public.pilotage_cartes set titre = 'Réécrite par l''agent' where id = %L$q$, b));
  if n <> 0 then raise exception 'ECHEC 7 : l''agent a modifié une carte'; end if;
  n := epreuve.lignes(format($q$update public.pilotage_cartes set archivee = true where id = %L$q$, b));
  if n <> 0 then raise exception 'ECHEC 7 : l''agent a archivé une carte'; end if;
  perform epreuve.refus('7 agent supprime', format('delete from public.pilotage_cartes where id = %L', b), '42501');
end $$;
reset role;

-- ── 8. UN COMPTE CONNECTÉ QUI N'EST PAS OPÉRATEUR ─────────────────────
select set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000009', false);
set role authenticated;
do $$
declare n bigint; b text := current_setting('test.carte_b');
begin
  if public.est_exploitant() then raise exception 'ECHEC 8 : décor — ce compte ne doit être opérateur de rien'; end if;
  select count(*) into n from public.pilotage_cartes;
  if n <> 0 then raise exception 'ECHEC 8 : un compte quelconque lit % carte(s)', n; end if;
  select count(*) into n from public.pilotage_journal;
  if n <> 0 then raise exception 'ECHEC 8 : un compte quelconque lit le journal'; end if;
  perform epreuve.refus('8 compte quelconque crée', $q$insert into public.pilotage_cartes(tableau, titre) values ('produit', 'Intrusion')$q$, 'row-level security');
  n := epreuve.lignes(format($q$update public.pilotage_cartes set priorite = 'P3' where id = %L$q$, b));
  if n <> 0 then raise exception 'ECHEC 8 : un compte quelconque a modifié une carte'; end if;
end $$;
reset role;

-- ── 9. LE PUBLIC (la clé du site, « anon ») ───────────────────────────
select set_config('test.uid', '', false);
set role anon;
do $$
declare b text := current_setting('test.carte_b');
begin
  perform epreuve.refus('9 anon lit les cartes', 'select * from public.pilotage_cartes', 'permission denied');
  perform epreuve.refus('9 anon lit le journal', 'select * from public.pilotage_journal', 'permission denied');
  perform epreuve.refus('9 anon crée', $q$insert into public.pilotage_cartes(tableau, titre) values ('produit', 'Anonyme')$q$, 'permission denied');
  perform epreuve.refus('9 anon modifie', format($q$update public.pilotage_cartes set titre = 'Anonyme' where id = %L$q$, b), 'permission denied');
  perform epreuve.refus('9 anon supprime', 'delete from public.pilotage_cartes', 'permission denied');
  perform epreuve.refus('9 anon vide', 'truncate public.pilotage_cartes', 'permission denied');
  perform epreuve.refus('9 anon écrit au journal', format($q$insert into public.pilotage_journal(carte_id, action) values (%L, 'statut')$q$, b), 'permission denied');
  perform epreuve.refus('9 anon appelle un contrôle', $q$select public.pilotage_categorie_valide('produit', 'admin')$q$, 'permission denied');
end $$;
reset role;

-- ── 10. LA PREUVE QUE LES REFUS NE VIENNENT PAS D'UNE TABLE VIDE ──────────
do $$
declare n bigint;
begin
  select count(*) into n from public.pilotage_cartes;
  if n < 13 then raise exception 'ECHEC 10 : % cartes en base — les refus ci-dessus ne prouveraient rien', n; end if;
  select count(*) into n from public.pilotage_journal;
  if n < 20 then raise exception 'ECHEC 10 : % lignes de journal seulement', n; end if;
end $$;

select 'PILOTAGE : 10 blocs au vert' as resultat;
