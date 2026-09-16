-- ÉPREUVE RÉELLE DE LA MIGRATION « chauffeurs_papiers ».
--
-- Elle s'exécute sur un PostgreSQL vide : elle pose le socle minimal dont la
-- migration depend, applique la migration, et VERIFIE LE COMPORTEMENT.
-- Une regex sur le fichier SQL ne prouve rien -- elle ne sait pas si la
-- requete s'execute, ni ce qu'elle rend. Ici on lit le resultat.
--
--   psql -f supabase/tests/socle.sql
--   psql -f supabase/migrations/20260916140000_chauffeurs_papiers.sql
--   psql -f supabase/tests/papiers-chauffeurs.sql
--
-- Chaque echec leve une exception : psql -v ON_ERROR_STOP=1 rend alors 3.

insert into public.chauffeurs(id,nom_affiche,telephone_whatsapp,statut,
                              carte_vtc_fin,registre_fin,assurance_fin) values
 ('11111111-1111-1111-1111-111111111111','Mehmet','0612','valide',
   current_date+300, current_date+400, current_date+200),
 ('22222222-2222-2222-2222-222222222222','Ayse','0698','valide',
   current_date+300, current_date+400, current_date-2),
 ('33333333-3333-3333-3333-333333333333','Karim','0611','valide',
   current_date+12,  current_date+400, current_date+200),
 ('44444444-4444-4444-4444-444444444444','Luis','0755','valide',
   null, null, null),
 ('55555555-5555-5555-5555-555555555555','Aujourdhui','0700','valide',
   current_date,     current_date+400, current_date+200),
 ('66666666-6666-6666-6666-666666666666','BloqueMain','0701','bloque',
   current_date+300, current_date+400, current_date+200);

do $$
declare r record;
  procedure_echec text;
begin
  -- 1. UN PAPIER EXPIRE BLOQUE L'ATTRIBUTION, meme avec « statut = valide ».
  select * into r from public.chauffeurs_etat where nom_affiche='Ayse';
  if r.statut <> 'valide' then raise exception 'socle du test faux'; end if;
  if r.papiers_etat <> 'perime' then raise exception 'Ayse : etat attendu perime, recu %', r.papiers_etat; end if;
  if r.attribuable then raise exception 'Ayse est ATTRIBUABLE alors que son assurance a expire'; end if;

  -- 2. LE PIRE DES TROIS DECIDE : carte et registre valides ne rattrapent rien.
  if r.etat_effectif <> 'papiers' then raise exception 'Ayse : etat_effectif %', r.etat_effectif; end if;

  -- 3. UN PAPIER ABSENT EST AU ROUGE MAIS NE BLOQUE PAS -- on ne sait pas, on
  --    n'invente pas, et bloquer rendrait tout le carnet inattribuable le jour
  --    du deploiement.
  select * into r from public.chauffeurs_etat where nom_affiche='Luis';
  if r.papiers_etat <> 'manquant' then raise exception 'Luis : etat %', r.papiers_etat; end if;
  if r.etat_effectif <> 'papiers' then raise exception 'Luis : doit etre au rouge'; end if;
  if not r.attribuable then raise exception 'Luis : un papier ABSENT ne doit pas bloquer'; end if;

  -- 4. UN PAPIER QUI EXPIRE AUJOURD'HUI VAUT ENCORE AUJOURD'HUI.
  select * into r from public.chauffeurs_etat where nom_affiche='Aujourdhui';
  if r.papiers_etat = 'perime' then raise exception 'un papier qui expire aujourd''hui est declare perime'; end if;
  if r.papiers_jours <> 0 then raise exception 'Aujourdhui : % jours', r.papiers_jours; end if;
  if not r.attribuable then raise exception 'Aujourdhui : doit rester attribuable'; end if;

  -- 5. BIENTOT : alerte, pas blocage, et le nombre de jours est juste.
  select * into r from public.chauffeurs_etat where nom_affiche='Karim';
  if r.papiers_etat <> 'bientot' then raise exception 'Karim : etat %', r.papiers_etat; end if;
  if r.papiers_jours <> 12 then raise exception 'Karim : % jours au lieu de 12', r.papiers_jours; end if;
  if not r.attribuable then raise exception 'Karim : un papier qui expire dans 12 j ne bloque pas'; end if;

  -- 6. UN BLOCAGE HUMAIN L'EMPORTE TOUJOURS, papiers a jour ou non.
  select * into r from public.chauffeurs_etat where nom_affiche='BloqueMain';
  if r.attribuable then raise exception 'un chauffeur bloque a la main reste attribuable'; end if;

  -- 7. TOUT A JOUR : rien ne crie.
  select * into r from public.chauffeurs_etat where nom_affiche='Mehmet';
  if r.etat_effectif <> 'valide' or not r.attribuable then
    raise exception 'Mehmet : % / %', r.etat_effectif, r.attribuable; end if;
end $$;

-- 8. LA FILE D'ACTIONS : elle voit les papiers, et elle NE SE DUPLIQUE PAS.
--    Deux NULL sont distincts pour un index unique Postgres : sans l'index
--    dedie, trois rafraichissements donneraient douze lignes.
select public.ela_rafraichir_actions();
select public.ela_rafraichir_actions();
select public.ela_rafraichir_actions();

do $$
declare n integer;
begin
  select count(*) into n from public.actions_requises
   where type_action='papiers_a_regulariser';
  if n <> 4 then raise exception
    'file papiers : % lignes au lieu de 4 -- doublons ou chauffeur manquant', n; end if;

  select count(*) into n from public.actions_requises
   where type_action='papiers_a_regulariser' and priorite=85;
  if n <> 2 then raise exception 'perime/manquant doivent etre prioritaires (85), % trouve(s)', n; end if;

  -- On ne reclame pas les papiers de quelqu'un qu'on ne fait plus rouler.
  select count(*) into n from public.actions_requises a
   join public.chauffeurs c on c.id=a.chauffeur_id
   where c.statut='bloque';
  if n <> 0 then raise exception 'une action a ete creee pour un chauffeur bloque'; end if;

  -- LE NOM DU TYPE EST LU PAR DU CODE : le tableau de bord compte « Sans
  -- chauffeur » avec un includes('chauffeur') sur le type.
  select count(*) into n from public.actions_requises
   where type_action like '%chauffeur%' and chauffeur_id is not null;
  if n <> 0 then raise exception
    'le type d''action contient « chauffeur » : la metrique « Sans chauffeur » se gonflera'; end if;
end $$;

-- 9. LES TROIS ACTIONS D'ORIGINE SURVIVENT AU REMPLACEMENT DE LA FONCTION.
insert into public.courses(ref,statut,bon) values ('ELA-TEST-0001','attente','{}'::jsonb);
select public.ela_rafraichir_actions();
do $$
declare n integer;
begin
  select count(*) into n from public.actions_requises where type_action='nouvelle_demande';
  if n <> 1 then raise exception
    'l''insert « nouvelle_demande » a disparu en remplacant la fonction'; end if;
end $$;

select 'PAPIERS CHAUFFEURS : toutes les epreuves passent' as resultat;
