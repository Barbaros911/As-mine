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

-- ===========================================================================
-- LES FIXTURES DATENT DANS LE FUSEAU DE LA REGLE, PAS DANS CELUI DU COUREUR
-- ---------------------------------------------------------------------------
-- Elles utilisaient « current_date », qui est le jour de la SESSION -- UTC
-- sur un coureur GitHub. La regle, elle, compare au jour de PARIS. Entre
-- 22 h et minuit UTC les deux ne sont plus le meme jour, et « expire
-- aujourd'hui » devenait « expire hier » : la suite tombait, alors que le
-- code etait juste.
--
-- ELLE EST PASSEE AU VERT PENDANT DES HEURES POUR UNE SEULE RAISON : on ne
-- l'a lancee qu'a des heures ou UTC et Paris tombaient le meme jour. Meme
-- famille que le « toISOString » du site, qui ne se voyait qu'entre minuit
-- et 2 h -- exactement quand personne ne teste.
create temporary view aujourdhui_paris as
  select (now() at time zone 'Europe/Paris')::date as j;

insert into public.chauffeurs(id,nom_affiche,telephone_whatsapp,statut,
                              carte_vtc_fin,registre_fin,assurance_fin) values
 ('11111111-1111-1111-1111-111111111111','Mehmet','0612','valide',
   (select j from aujourdhui_paris)+300, (select j from aujourdhui_paris)+400, (select j from aujourdhui_paris)+200),
 ('22222222-2222-2222-2222-222222222222','Ayse','0698','valide',
   (select j from aujourdhui_paris)+300, (select j from aujourdhui_paris)+400, (select j from aujourdhui_paris)-2),
 ('33333333-3333-3333-3333-333333333333','Karim','0611','valide',
   (select j from aujourdhui_paris)+12,  (select j from aujourdhui_paris)+400, (select j from aujourdhui_paris)+200),
 ('44444444-4444-4444-4444-444444444444','Luis','0755','valide',
   null, null, null),
 ('55555555-5555-5555-5555-555555555555','Aujourdhui','0700','valide',
   (select j from aujourdhui_paris), (select j from aujourdhui_paris)+400, (select j from aujourdhui_paris)+200),
 ('66666666-6666-6666-6666-666666666666','BloqueMain','0701','bloque',
   (select j from aujourdhui_paris)+300, (select j from aujourdhui_paris)+400, (select j from aujourdhui_paris)+200),
 -- Les deux bornes du 30e jour. Le site alerte a « j <= 30 » : le 30e jour est
 -- DEDANS, le 31e dehors. Un « < » cote serveur ferait dire « a jour » le jour
 -- meme ou l'ecran dit « expire dans 30 j », et un desaccord pareil ne se voit
 -- que le jour du controle.
 ('77777777-7777-7777-7777-777777777777','Trente','0702','valide',
   (select j from aujourdhui_paris)+30,  (select j from aujourdhui_paris)+400, (select j from aujourdhui_paris)+200),
 ('88888888-8888-8888-8888-888888888888','TrenteEtUn','0703','valide',
   (select j from aujourdhui_paris)+31,  (select j from aujourdhui_paris)+400, (select j from aujourdhui_paris)+200),
 -- Une fiche d'avant, au statut que le formulaire ne propose plus.
 ('99999999-9999-9999-9999-999999999999','Ancien','0704','a_renouveler',
   (select j from aujourdhui_paris)+300, (select j from aujourdhui_paris)+400, (select j from aujourdhui_paris)+200);

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

  -- 6 bis. LE 30e JOUR EST DANS LA FENETRE, LE 31e N'Y EST PAS.
  select * into r from public.chauffeurs_etat where nom_affiche='Trente';
  if r.papiers_jours <> 30 then raise exception 'Trente : % jours', r.papiers_jours; end if;
  if r.papiers_etat <> 'bientot' then raise exception
    'le 30e jour rend « % » : le serveur et l''ecran ne comptent pas pareil', r.papiers_etat; end if;
  select * into r from public.chauffeurs_etat where nom_affiche='TrenteEtUn';
  if r.papiers_etat <> 'valide' then raise exception
    'le 31e jour rend « % » : la fenetre deborde', r.papiers_etat; end if;

  -- 6 ter. L'ECRAN ET LE SERVEUR DISENT LA MEME CHOSE D'UNE FICHE D'AVANT.
  --        « a_renouveler » a toujours ete refuse a l'attribution ; l'afficher
  --        « a jour » ferait chercher pendant dix minutes pourquoi il n'est
  --        pas dans la liste.
  select * into r from public.chauffeurs_etat where nom_affiche='Ancien';
  if r.attribuable then raise exception 'un statut « a_renouveler » redevient attribuable'; end if;
  if r.etat_effectif = 'valide' then raise exception
    'Ancien s''affiche « a jour » alors que l''attribution le refuse'; end if;

  -- 7. TOUT A JOUR : rien ne crie.
  select * into r from public.chauffeurs_etat where nom_affiche='Mehmet';
  if r.etat_effectif <> 'valide' or not r.attribuable then
    raise exception 'Mehmet : % / %', r.etat_effectif, r.attribuable; end if;
end $$;

-- 7 bis. LA REGLE SUIT PARIS, ET NE BOUGE PAS AVEC LE FUSEAU DE LA SESSION.
--
--        CE CONTROLE MANQUAIT, ET SON ABSENCE A COUTE UN ROUGE EN CI a
--        00 h 21 heure de Paris : rien ne verifiait que « aujourd'hui »
--        soit le jour PARISIEN et non celui du coureur.
--
--        LE PREMIER JET NE PROUVAIT RIEN : il decalait la session a
--        Kiritimati (UTC+14) et comparait au jour de Paris. Or a 22 h UTC
--        les deux tombent le MEME jour -- le controle passait au vert sur la
--        version fausse. Un controle qui ne mord qu'a certaines heures est
--        exactement le defaut qu'on repare.
--
--        CE QU'ON EPROUVE MAINTENANT EST DETERMINISTE, a n'importe quelle
--        heure : Midway (UTC-11) et Kiritimati (UTC+14) sont a vingt-cinq
--        heures d'ecart, donc TOUJOURS sur deux jours differents. On prend
--        « aujourd'hui » vu de Midway et on demande son etat depuis les deux
--        fuseaux. Une regle ancree a Paris rend deux fois la meme chose ;
--        une regle qui lit « current_date » rend « valide » ici et
--        « perime » la-bas.
do $$
declare jour date; a text; b text; ancien text := current_setting('TimeZone');
begin
  set time zone 'Pacific/Midway';
  select current_date into jour;
  select public.ela_etat_papier(jour) into a;
  set time zone 'Pacific/Kiritimati';
  select public.ela_etat_papier(jour) into b;
  execute format('set time zone %L', ancien);
  if a is distinct from b then raise exception
    'la regle suit le fuseau de la session : le meme jour rend « % » a Midway et « % » a Kiritimati', a, b;
  end if;
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
  if n <> 5 then raise exception
    'file papiers : % lignes au lieu de 5 -- doublons ou chauffeur manquant', n; end if;

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

-- ===========================================================================
-- 10. LE SERVEUR REFUSE, PAS SEULEMENT L'ECRAN
-- ===========================================================================
-- Le filtre de la liste deroulante n'est pas une frontiere de securite : un
-- appel direct a la RPC ne passe par aucun ecran. On APPELLE donc les deux
-- fonctions, on ne relit pas leur source.
insert into public.courses(ref,statut,bon)
  values ('ELA-RPC-0001','confirmee','{}'::jsonb);

do $$
declare erreur text; sortie text;
begin
  -- 10a. ATTRIBUER UN CHAUFFEUR DONT L'ASSURANCE A EXPIRE : refuse.
  begin
    perform public.ela_attribuer_chauffeur('ELA-RPC-0001',
      '22222222-2222-2222-2222-222222222222');
    raise exception 'ela_attribuer_chauffeur A ACCEPTE Ayse, assurance expiree depuis 2 jours';
  exception when others then
    erreur := sqlerrm;
    if erreur <> 'chauffeur_non_attribuable' then raise exception
      'refus attendu « chauffeur_non_attribuable », recu « % »', erreur; end if;
  end;

  -- L'attribution ne doit avoir laisse AUCUNE trace : une RPC qui echoue apres
  -- avoir ecrit laisserait la course attribuee a quelqu'un qu'elle refuse.
  if exists(select 1 from public.attributions_chauffeur where course_ref='ELA-RPC-0001')
    then raise exception 'une attribution a ete ecrite malgre le refus'; end if;
  if (select statut from public.courses where ref='ELA-RPC-0001') <> 'confirmee'
    then raise exception 'la course a change de statut malgre le refus'; end if;

  -- 10b. MEME REFUS SUR LA PROPOSITION : les deux portes, pas une seule.
  begin
    perform public.ela_journaliser_proposition_chauffeur('ELA-RPC-0001',
      '22222222-2222-2222-2222-222222222222');
    raise exception 'ela_journaliser_proposition_chauffeur A ACCEPTE Ayse';
  exception when others then
    erreur := sqlerrm;
    if erreur <> 'chauffeur_non_attribuable' then raise exception
      'proposition : refus attendu, recu « % »', erreur; end if;
  end;

  -- 10c. UN CHAUFFEUR SANS AUCUNE DATE PASSE ENCORE -- decision de Barbaros,
  --      le temps que le carnet soit rempli. Si ce controle tombe un jour,
  --      c'est que la regle transitoire est devenue bloquante : c'est une
  --      decision, pas un correctif a appliquer en silence.
  if not public.ela_journaliser_proposition_chauffeur('ELA-RPC-0001',
      '44444444-4444-4444-4444-444444444444')
    then raise exception 'Luis (dates absentes) refuse : la regle transitoire a change'; end if;

  -- 10d. ET LE CHAUFFEUR EN REGLE PASSE. Sans ce controle, une RPC qui
  --      refuserait TOUT rendrait exactement les memes erreurs plus haut.
  sortie := public.ela_attribuer_chauffeur('ELA-RPC-0001',
    '11111111-1111-1111-1111-111111111111');
  if sortie <> 'attribuee' then raise exception
    'Mehmet, papiers a jour : la RPC rend « % »', sortie; end if;
  if (select chauffeur_id from public.attributions_chauffeur where course_ref='ELA-RPC-0001')
     <> '11111111-1111-1111-1111-111111111111'
    then raise exception 'l''attribution n''a pas ete ecrite'; end if;
end $$;

-- 10e. LE DOUTE LEVE : le refus venait bien du CHAUFFEUR, pas d'un refus
--      d'acces global. On eteint l'exploitant et on verifie que le message
--      change -- deux causes, deux messages.
update public.socle_reglages set exploitant=false;
do $$
declare erreur text;
begin
  begin
    perform public.ela_attribuer_chauffeur('ELA-RPC-0001',
      '11111111-1111-1111-1111-111111111111');
    raise exception 'un non-exploitant a pu attribuer une course';
  exception when others then
    erreur := sqlerrm;
    if erreur <> 'acces_refuse' then raise exception
      'non-exploitant : attendu « acces_refuse », recu « % »', erreur; end if;
  end;
end $$;
update public.socle_reglages set exploitant=true;

-- 11. LES GARDE-FOUS DU SERVEUR SONT-ILS TOUJOURS POSES ? Une redefinition
--     par « create or replace » remplace la definition ENTIERE : un oubli de
--     « security definer » ou de search_path ne se voit qu'en production.
do $$
declare p record; n integer := 0;
begin
  for p in select proname, prosecdef, proconfig from pg_proc
    where pronamespace='public'::regnamespace
      and proname in ('ela_attribuer_chauffeur','ela_journaliser_proposition_chauffeur')
  loop
    n := n + 1;
    if not p.prosecdef then raise exception
      '%() a perdu « security definer »', p.proname; end if;
    if p.proconfig is null or not ('search_path=public, pg_temp' = any(p.proconfig))
      then raise exception '%() a perdu son search_path fige : %', p.proname, p.proconfig; end if;
  end loop;
  if n <> 2 then raise exception 'les deux RPC ne sont pas toutes les deux presentes (% trouvee(s))', n; end if;

  -- anon ne doit jamais pouvoir appeler l'attribution.
  if has_function_privilege('anon','public.ela_attribuer_chauffeur(text,uuid)','execute')
    then raise exception 'anon peut appeler ela_attribuer_chauffeur'; end if;
  if not has_function_privilege('authenticated','public.ela_attribuer_chauffeur(text,uuid)','execute')
    then raise exception 'authenticated ne peut plus appeler ela_attribuer_chauffeur'; end if;
end $$;

select 'PAPIERS CHAUFFEURS : toutes les epreuves passent' as resultat;
