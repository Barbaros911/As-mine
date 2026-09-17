-- ============================================================================
-- LA FACTURE DE COMMISSION — epreuves sur un vrai PostgreSQL.
--
-- On APPELLE les fonctions, on ne relit pas leur source.
--
-- LES DEUX CONTROLES QUI COMPTENT LE PLUS, et aucun des deux ne se voit :
--   1. LE NUMERO NE SE REPETE JAMAIS. Deux emissions simultanees qui
--      obtiendraient le meme rang produiraient deux documents qui s'impriment
--      parfaitement -- on l'apprend chez le comptable, six mois plus tard, et
--      c'est une infraction (L441-9).
--   2. L'APERCU NE BRULE PAS DE NUMERO. Un rang consomme sans facture est un
--      TROU dans la numerotation, donc la meme infraction a l'envers.
-- ============================================================================

-- ── le decor ───────────────────────────────────────────────────────────────
insert into public.parametres_commerciaux(cle, valeur) values
  ('commission_ela_defaut', '{"pourcentage":20}'::jsonb)
on conflict (cle) do update set valeur = excluded.valeur;

insert into public.chauffeurs(id, nom_affiche, telephone_whatsapp, siret, adresse,
                              taux_commission, statut, actif)
values ('11111111-1111-1111-1111-111111111111','Mehmet','0612345678',
        '90112233400015','12 rue des Lilas, 93200 Saint-Denis', 25, 'valide', true),
       ('22222222-2222-2222-2222-222222222222','Karim','0698765432',
        '90144556600021','4 avenue Gambetta, 75020 Paris', null, 'valide', true);

-- Quatre courses de Mehmet : trois realisees, une confirmee (non facturable).
-- Une course de Karim, pour verifier qu'elle ne part pas dans la facture de
-- Mehmet -- et pour eprouver le taux par defaut.
insert into public.courses(ref, statut, bon) values
 ('ELA-26-09-0001','realisee', '{"course":{"date":"2026-09-02","heure":"08:00","depart":"Roissy","arrivee":"Paris 8e"},"prix":{"total":100}}'),
 ('ELA-26-09-0002','realisee', '{"course":{"date":"2026-09-05","heure":"10:00","depart":"Orly","arrivee":"Melun"},"prix":{"total":80}}'),
 ('ELA-26-09-0003','realisee', '{"course":{"date":"2026-10-02","heure":"09:00","depart":"Paris","arrivee":"Roissy"},"prix":{"total":60}}'),
 ('ELA-26-09-0004','confirmee','{"course":{"date":"2026-09-06","heure":"11:00","depart":"Paris","arrivee":"Orly"},"prix":{"total":999}}'),
 ('ELA-26-09-0005','realisee', '{"course":{"date":"2026-09-03","heure":"07:00","depart":"Gare du Nord","arrivee":"CDG"},"prix":{"total":200}}');

insert into public.attributions_chauffeur(course_ref, chauffeur_id, statut)
values ('ELA-26-09-0001','11111111-1111-1111-1111-111111111111','active'),
       ('ELA-26-09-0002','11111111-1111-1111-1111-111111111111','active'),
       ('ELA-26-09-0003','11111111-1111-1111-1111-111111111111','active'),
       ('ELA-26-09-0004','11111111-1111-1111-1111-111111111111','active'),
       ('ELA-26-09-0005','22222222-2222-2222-2222-222222222222','active');

-- 1. PAS DE SIRET, PAS DE FACTURE.
--    L'emetteur n'est pas encore renseigne : on refuse d'editer plutot que
--    d'envoyer a un TIERS un document qui n'est pas une facture (L441-9).
--    C'est le cas REEL aujourd'hui -- Barbaros n'a pas encore de SIRET.
do $$
declare erreur text; r jsonb;
begin
  begin
    perform public.ela_emettre_facture_commission(
      '11111111-1111-1111-1111-111111111111', '2026-09-01', '2026-09-30');
    raise exception 'une facture a ete emise SANS emetteur';
  exception when others then
    erreur := sqlerrm;
    if erreur <> 'emetteur_incomplet' then
      raise exception 'attendu « emetteur_incomplet », recu « % »', erreur; end if;
  end;
  -- L'APERCU, LUI, RESTE POSSIBLE et le DIT : on doit pouvoir regarder ce
  -- qu'on facturera avant d'avoir son SIRET, sinon l'ecran ne sert a rien
  -- tant que la micro-entreprise n'existe pas.
  r := public.ela_apercu_facture_commission(
    '11111111-1111-1111-1111-111111111111', '2026-09-01', '2026-09-30');
  if (r->>'emetteur_pret')::boolean then
    raise exception 'l''apercu pretend que l''emetteur est pret alors qu''il est vide'; end if;
  if jsonb_array_length(r->'lignes') <> 2 then
    raise exception 'l''apercu devrait deja montrer 2 lignes, il en montre %',
      jsonb_array_length(r->'lignes'); end if;
end $$;

insert into public.parametres_commerciaux(cle, valeur) values
  ('entreprise_emettrice',
   '{"nom":"ELA Transfer","siret":"00000000000000","adresse":"1 rue de Paris, 93000","taux_tva":0}'::jsonb)
on conflict (cle) do update set valeur = excluded.valeur;

-- 2. L'APERCU NE BRULE AUCUN NUMERO.
--    Un rang consomme sans facture est un TROU dans la numerotation.
do $$
declare avant integer; apres integer;
begin
  select coalesce(max(rang),0) into avant from public.compteur_factures;
  perform public.ela_apercu_facture_commission(
    '11111111-1111-1111-1111-111111111111','2026-09-01','2026-09-30');
  perform public.ela_apercu_facture_commission(
    '11111111-1111-1111-1111-111111111111','2026-09-01','2026-09-30');
  perform public.ela_apercu_facture_commission(
    '11111111-1111-1111-1111-111111111111','2026-09-01','2026-09-30');
  select coalesce(max(rang),0) into apres from public.compteur_factures;
  if apres <> avant then
    raise exception 'TROIS APERCUS ONT BRULE % numero(s) : la numerotation aura un trou',
      apres - avant; end if;
  if exists(select 1 from public.factures_commission) then
    raise exception 'un apercu a ecrit une facture'; end if;
end $$;

-- 3. CE QUE LA FACTURE CONTIENT, ET CE QU'ELLE LAISSE DEHORS.
--    Mehmet, septembre : 100 + 80 = 180 € de courses, a 25 % = 45 € de
--    commission. La confirmee a 999 € et l'octobre a 60 € n'y sont pas, la
--    course de Karim non plus. Recalcule a la main, jamais repris de la sortie.
do $$
declare f jsonb;
begin
  f := public.ela_emettre_facture_commission(
    '11111111-1111-1111-1111-111111111111','2026-09-01','2026-09-30');

  if f->>'num' <> 'F-' || extract(year from (now() at time zone 'Europe/Paris'))::int || '-0001' then
    raise exception 'premier numero attendu « …-0001 », recu « % »', f->>'num'; end if;
  if jsonb_array_length(f->'lignes') <> 2 then
    raise exception 'attendu 2 lignes, recu % — %',
      jsonb_array_length(f->'lignes'), f->'lignes'; end if;
  if (f->>'ht')::numeric <> 45 then
    raise exception 'attendu 45 € de commission (180 x 25 %%), recu % €', f->>'ht'; end if;
  if (f->>'ttc')::numeric <> 45 then
    raise exception 'sans TVA, le TTC doit egaler le HT : recu % €', f->>'ttc'; end if;

  if f::text like '%999%' then
    raise exception 'UNE COURSE CONFIRMEE EST ENTREE DANS LA FACTURE : une promesse n''est pas un encaissement'; end if;
  if f::text like '%ELA-26-09-0003%' then
    raise exception 'une course d''OCTOBRE est entree dans la facture de septembre'; end if;
  if f::text like '%ELA-26-09-0005%' then
    raise exception 'LA COURSE D''UN AUTRE CHAUFFEUR EST ENTREE DANS LA FACTURE'; end if;

  -- LA FACTURE EST FIGEE : le SIRET et l'adresse du chauffeur sont RECOPIES.
  if f->'client'->>'siret' is distinct from '90112233400015' then
    raise exception 'le SIRET du chauffeur n''est pas fige dans la facture'; end if;
  if f->'emetteur'->>'siret' is distinct from '00000000000000' then
    raise exception 'le SIRET de l''emetteur n''est pas fige dans la facture'; end if;
end $$;

-- 4. UNE COURSE N'EST FACTUREE QU'UNE FOIS.
--    Le doublon ne se voit que six mois plus tard, chez le comptable.
do $$
declare erreur text;
begin
  if (select count(*) from public.courses
       where ref in ('ELA-26-09-0001','ELA-26-09-0002')
         and bon->>'factureNum' is not null) <> 2 then
    raise exception 'les courses facturees ne portent pas leur numero de facture'; end if;

  begin
    perform public.ela_emettre_facture_commission(
      '11111111-1111-1111-1111-111111111111','2026-09-01','2026-09-30');
    raise exception 'LES MEMES COURSES ONT ETE FACTUREES DEUX FOIS';
  exception when others then
    erreur := sqlerrm;
    if erreur <> 'aucune_course_a_facturer' then
      raise exception 'attendu « aucune_course_a_facturer », recu « % »', erreur; end if;
  end;
end $$;

-- 5. LE CONTROLE QUI COMPTE LE PLUS : AUCUN NUMERO EN DOUBLE, AUCUN TROU.
--    On emet plusieurs factures d'affilee et on verifie que les rangs forment
--    une suite continue et unique. Un « lire puis ecrire » rendrait deux fois
--    le meme rang sous concurrence ; ici on eprouve au moins l'invariant, et
--    le bloc 6 eprouve l'atomicite elle-meme.
do $$
declare f jsonb; n int; attendu text;
begin
  -- Karim, sans taux propre : il retombe sur le defaut de 20 %. 200 x 20 % = 40.
  f := public.ela_emettre_facture_commission(
    '22222222-2222-2222-2222-222222222222','2026-09-01','2026-09-30');
  if (f->>'ht')::numeric <> 40 then
    raise exception 'le taux par defaut (20 %%) n''a pas ete applique : recu % €', f->>'ht'; end if;

  attendu := 'F-' || extract(year from (now() at time zone 'Europe/Paris'))::int || '-0002';
  if f->>'num' <> attendu then
    raise exception 'deuxieme numero attendu « % », recu « % »', attendu, f->>'num'; end if;

  select count(*) into n from public.factures_commission;
  if n <> 2 then raise exception 'attendu 2 factures, recu %', n; end if;
  if (select count(distinct num) from public.factures_commission) <> n then
    raise exception 'DEUX FACTURES PORTENT LE MEME NUMERO'; end if;
end $$;

-- 6. L'ATOMICITE DU COMPTEUR, EPROUVEE POUR DE VRAI.
--    On simule la lecture-puis-ecriture qui serait fausse, et on montre que
--    l'instruction reelle, elle, ne peut pas rendre deux fois le meme rang :
--    cent increments donnent cent valeurs distinctes et contigues.
do $$
declare i int; r int; vus int[] := '{}'; an int;
begin
  an := 1900;   -- une annee a part, pour ne pas toucher au compteur reel
  for i in 1..100 loop
    insert into public.compteur_factures(annee, rang) values (an, 1)
      on conflict (annee) do update set rang = public.compteur_factures.rang + 1
      returning rang into r;
    vus := vus || r;
  end loop;
  if (select count(distinct x) from unnest(vus) x) <> 100 then
    raise exception 'le compteur a rendu un rang EN DOUBLE sur 100 increments'; end if;
  if (select min(x) from unnest(vus) x) <> 1
     or (select max(x) from unnest(vus) x) <> 100 then
    raise exception 'la suite des rangs a un TROU : de % a %',
      (select min(x) from unnest(vus) x), (select max(x) from unnest(vus) x); end if;
  delete from public.compteur_factures where annee = an;
end $$;

-- 7. LE VERROU D'ACCES PASSE AVANT TOUT LE RESTE.
--    Meme epreuve d'ORDRE que pour l'intake : un non-exploitant qui vise une
--    periode SANS AUCUNE course doit recevoir « acces_refuse », jamais
--    « aucune_course_a_facturer » -- lequel lui apprendrait ce que contient
--    le registre.
update public.socle_reglages set exploitant = false;
do $$
declare erreur text;
begin
  begin
    perform public.ela_emettre_facture_commission(
      '11111111-1111-1111-1111-111111111111','2030-01-01','2030-01-31');
    raise exception 'un non-exploitant a pu emettre une facture';
  exception when others then
    erreur := sqlerrm;
    if erreur = 'aucune_course_a_facturer' then raise exception
      'le verrou d''acces ne passe pas en premier : un inconnu apprend ce que contient le registre'; end if;
    if erreur <> 'acces_refuse' then
      raise exception 'attendu « acces_refuse », recu « % »', erreur; end if;
  end;
  begin
    perform public.ela_apercu_facture_commission(
      '11111111-1111-1111-1111-111111111111','2026-09-01','2026-09-30');
    raise exception 'un non-exploitant a pu voir un apercu de facture';
  exception when others then
    if sqlerrm <> 'acces_refuse' then
      raise exception 'apercu : attendu « acces_refuse », recu « % »', sqlerrm; end if;
  end;
end $$;
update public.socle_reglages set exploitant = true;

-- 8. LES GARDE-FOUS DU SERVEUR.
do $$
declare p record; n int := 0;
begin
  for p in select proname, prosecdef, proconfig from pg_proc
            where pronamespace = 'public'::regnamespace
              and proname in ('ela_emettre_facture_commission',
                              'ela_apercu_facture_commission') loop
    n := n + 1;
    if not p.prosecdef then
      raise exception '% a perdu « security definer »', p.proname; end if;
    if p.proconfig is null or not ('search_path=public, pg_temp' = any(p.proconfig)) then
      raise exception '% : search_path non fige (%)', p.proname, p.proconfig; end if;
  end loop;
  if n <> 2 then raise exception 'attendu 2 fonctions, trouve %', n; end if;

  if has_function_privilege('anon','public.ela_emettre_facture_commission(uuid,date,date)','execute')
    then raise exception 'anon peut emettre une facture'; end if;
  if has_function_privilege('anon','public.ela_apercu_facture_commission(uuid,date,date)','execute')
    then raise exception 'anon peut voir un apercu de facture'; end if;
  if not has_function_privilege('authenticated','public.ela_emettre_facture_commission(uuid,date,date)','execute')
    then raise exception 'authenticated ne peut pas emettre de facture'; end if;

  -- AUCUNE ECRITURE DIRECTE SUR LA TABLE : la fonction seule sait prendre un
  -- numero. Une policy d'insertion contournerait le compteur.
  if exists(select 1 from pg_policies
             where schemaname='public' and tablename='factures_commission'
               and cmd in ('INSERT','UPDATE','DELETE','ALL')) then
    raise exception 'une policy d''ecriture existe sur factures_commission : le compteur se contourne'; end if;
end $$;

-- ============================================================================
-- 9. DEUX EMISSIONS CONCURRENTES SUR LE MEME LOT — A DEUX VRAIES SESSIONS.
--
-- L'epreuve des « 100 increments » plus haut prouve que le COMPTEUR est
-- atomique. Elle ne prouve RIEN sur deux appels concurrents a
-- « ela_emettre_facture_commission » sur les MEMES courses -- c'est un autre
-- risque, et il a ete trouve en relecture, pas par ce fichier.
--
-- CE QU'ON A MESURE AVANT DE CORRIGER : le document etait reconstruit par un
-- SECOND appel independant a « ela_lignes_facture », sur toute la periode, et
-- son resultat n'etait jamais compare a l'ensemble verrouille. Le « coalesce »
-- ramenait « [] » et 0 SANS UN MOT. Resultat mesure sur un vrai PostgreSQL :
-- facture F-2026-0001 emise a 0,00 EUR, 0 ligne, UN NUMERO CONSOMME, et les
-- deux courses marquees « facturees » -- donc PLUS JAMAIS FACTURABLES.
--
-- LE VERROU NE COUVRE QUE « courses ». Il ne protege pas
-- « attributions_chauffeur » : c'est par la que les deux calculs divergent, et
-- c'est ce que cette epreuve construit.
--
-- POURQUOI DEUX SESSIONS ET PAS UNE SIMULATION : une divergence de snapshot ne
-- se fabrique pas dans une seule transaction. « dblink » ouvre une vraie
-- seconde connexion, et le BLOCAGE SUR UN VERROU rend l'experience
-- DETERMINISTE -- on sait exactement ou la session bloquee se trouve.
-- ============================================================================
create extension if not exists dblink;

-- On repart d'un lot propre : deux courses realisees, attribuees, non facturees.
delete from public.evenements_reservation;
delete from public.factures_commission;
delete from public.compteur_factures;
update public.courses set bon = bon - 'factureNum';
update public.attributions_chauffeur set statut = 'active';

insert into public.courses(ref, statut, bon) values
 ('ELA-26-09-9001','realisee','{"course":{"date":"2026-09-05"},"prix":{"total":100}}'),
 ('ELA-26-09-9002','realisee','{"course":{"date":"2026-09-06"},"prix":{"total":200}}')
on conflict (ref) do nothing;
insert into public.attributions_chauffeur(course_ref, chauffeur_id, statut)
 select r, '11111111-1111-1111-1111-111111111111', 'active'
   from unnest(array['ELA-26-09-9001','ELA-26-09-9002']) r
on conflict (course_ref) do update set statut = 'active';

-- ── 9a. DEUX EMISSIONS SUR LE MEME LOT : UNE SEULE DOIT PASSER ────────────
do $$
declare v_num text; v_err text;
begin
  -- La session courante emet et GARDE sa transaction : ses verrous tiennent.
  v_num := public.ela_emettre_facture_commission(
    '11111111-1111-1111-1111-111111111111','2026-09-01','2026-09-30')->>'num';
  if v_num is null then raise exception 'la premiere emission a echoue'; end if;

  perform dblink_connect('conc',
    'host=127.0.0.1 port=' || current_setting('port')
    || ' dbname=' || current_database() || ' user=postgres password=postgres');
  -- ASYNCHRONE, sinon on s'attendrait soi-meme : la seconde session veut un
  -- verrou que celle-ci detient.
  perform dblink_send_query('conc',
    'select coalesce((public.ela_emettre_facture_commission('
    || '''11111111-1111-1111-1111-111111111111'',''2026-09-01'',''2026-09-30'')'
    || '->>''num''),''?'')');
exception when others then
  raise exception 'preparation de l''epreuve de concurrence : %', sqlerrm;
end $$;

-- On sort de la transaction du bloc precedent : les verrous tombent, la
-- seconde session repart.
do $$
declare r text; v_err text := null;
begin
  begin
    select * into r from dblink_get_result('conc') as t(x text);
  exception when others then
    v_err := sqlerrm;
  end;
  perform dblink_disconnect('conc');

  -- EXACTEMENT UNE EMISSION. La seconde doit etre REFUSEE, et nommement.
  if v_err is null then
    raise exception 'DEUX EMISSIONS ONT REUSSI SUR LE MEME LOT (la seconde a rendu %)', r;
  end if;
  if v_err not like '%aucune_course_a_facturer%'
     and v_err not like '%lot_modifie_pendant_emission%' then
    raise exception 'la seconde emission a echoue pour une autre raison : %', v_err;
  end if;
end $$;

do $$
declare n integer; v_rang integer; vides integer;
begin
  select count(*) into n from public.factures_commission;
  if n <> 1 then raise exception 'attendu 1 facture, trouve %', n; end if;

  -- AUCUN SECOND NUMERO CONSOMME : un rang brule sans facture est un TROU
  -- dans la numerotation, donc la meme infraction que le doublon (L441-9).
  select rang into v_rang from public.compteur_factures;
  if v_rang <> 1 then raise exception 'le compteur a consomme % numeros pour 1 facture', v_rang; end if;

  -- AUCUNE FACTURE VIDE. C'est la forme exacte du defaut d'origine.
  select count(*) into vides from public.factures_commission
   where ht = 0 or jsonb_array_length(lignes) = 0;
  if vides > 0 then raise exception
    'UNE FACTURE VIDE A ETE EMISE (% ligne(s) a 0 EUR) : le document ne vient pas de l''ensemble verrouille', vides; end if;

  -- AUCUN DOUBLON : une course ne porte qu'un seul numero de facture.
  if exists(select 1 from public.courses
             where bon ? 'factureNum'
             group by bon->>'factureNum' having count(*) = 0) then
    raise exception 'doublon de facturation'; end if;
end $$;

-- ── 9b. LE LOT QUI BOUGE PENDANT L'ATTENTE DU VERROU ──────────────────────
--    C'est la reproduction exacte du defaut mesure. La session bloquee sur un
--    verrou de « courses » voit, en repartant, ses attributions retirees : son
--    second calcul rendait « [] » et elle facturait 0,00 EUR quand meme.
delete from public.evenements_reservation;
delete from public.factures_commission;
delete from public.compteur_factures;
update public.courses set bon = bon - 'factureNum';
update public.attributions_chauffeur set statut = 'active';

do $$
begin
  perform dblink_connect('conc2',
    'host=127.0.0.1 port=' || current_setting('port')
    || ' dbname=' || current_database() || ' user=postgres password=postgres');
  -- On tient UNE course : la seconde session s'y bloquera a coup sur.
  perform (select ref from public.courses where ref='ELA-26-09-9002' for update);
  perform dblink_send_query('conc2',
    'select coalesce((public.ela_emettre_facture_commission('
    || '''11111111-1111-1111-1111-111111111111'',''2026-09-01'',''2026-09-30'')'
    || '->>''num''),''?'')');
  perform pg_sleep(1);        -- elle attend maintenant le verrou
  -- LE VERROU DE « courses » NE COUVRE PAS CECI.
  update public.attributions_chauffeur set statut='retiree'
   where chauffeur_id='11111111-1111-1111-1111-111111111111';
end $$;
-- fin de transaction : les verrous tombent, et la retraite est visible.

do $$
declare r text; v_err text := null; n integer; v_rang integer;
begin
  begin
    select * into r from dblink_get_result('conc2') as t(x text);
  exception when others then
    v_err := sqlerrm;
  end;
  perform dblink_disconnect('conc2');

  if v_err is null then
    raise exception 'UNE FACTURE A ETE EMISE SUR UN LOT DEVENU VIDE (numero %) '
      '-- c''est le defaut d''origine : 0,00 EUR, un numero brule, et des '
      'courses marquees facturees donc plus jamais facturables', r;
  end if;
  -- LE MESSAGE COMPTE AUTANT QUE LE REFUS : les deux gardes appellent deux
  -- gestes differents. Un lot devenu VIDE, c'est « il n'y a rien a facturer »
  -- -- lui dire « recommence » l'enverrait tourner en rond.
  if v_err not like '%aucune_course_a_facturer%' then
    raise exception 'sur un lot vide, attendu « aucune_course_a_facturer », recu : %', v_err;
  end if;

  select count(*) into n from public.factures_commission;
  if n <> 0 then raise exception 'une facture a ete ecrite malgre le refus'; end if;
  select coalesce(max(rang),0) into v_rang from public.compteur_factures;
  if v_rang <> 0 then raise exception 'un numero a ete consomme pour rien : %', v_rang; end if;
  if exists(select 1 from public.courses where bon ? 'factureNum') then
    raise exception 'des courses ont ete marquees facturees sans facture'; end if;
end $$;

-- ── 9c. LE LOT QUI RETRECIT SANS SE VIDER ─────────────────────────────────
--    Sans ce cas, la garde « l'ensemble differe » ne serait JAMAIS exercee :
--    en 9b le lot devient vide, et c'est l'autre garde qui attrape. Un
--    controle qu'aucun scenario n'atteint est un controle decoratif.
--    Ici une seule attribution est retiree : deux courses verrouillees, une
--    seule facturable. Facturer la moitie en silence ferait PERDRE l'autre --
--    elle serait marquee facturee sans figurer au document.
delete from public.evenements_reservation;
delete from public.factures_commission;
delete from public.compteur_factures;
update public.courses set bon = bon - 'factureNum';
update public.attributions_chauffeur set statut = 'active';

do $$
begin
  perform dblink_connect('conc3',
    'host=127.0.0.1 port=' || current_setting('port')
    || ' dbname=' || current_database() || ' user=postgres password=postgres');
  perform (select ref from public.courses where ref='ELA-26-09-9002' for update);
  perform dblink_send_query('conc3',
    'select coalesce((public.ela_emettre_facture_commission('
    || '''11111111-1111-1111-1111-111111111111'',''2026-09-01'',''2026-09-30'')'
    || '->>''num''),''?'')');
  perform pg_sleep(1);
  update public.attributions_chauffeur set statut='retiree'
   where course_ref = 'ELA-26-09-9001';   -- UNE SEULE
end $$;

do $$
declare r text; v_err text := null; n integer; v_rang integer;
begin
  begin
    select * into r from dblink_get_result('conc3') as t(x text);
  exception when others then
    v_err := sqlerrm;
  end;
  perform dblink_disconnect('conc3');

  if v_err is null then
    raise exception 'UNE FACTURE A ETE EMISE SUR UN LOT QUI A RETRECI (numero %) : '
      'les courses disparues sont marquees facturees sans figurer au document', r;
  end if;
  -- Un lot qui a RETRECI sans se vider, c'est « recommence » -- il reste des
  -- courses a facturer, simplement plus les memes.
  if v_err not like '%lot_modifie_pendant_emission%' then
    raise exception 'sur un lot qui a retreci, attendu « lot_modifie_pendant_emission », recu : %', v_err;
  end if;

  select count(*) into n from public.factures_commission;
  if n <> 0 then raise exception 'une facture a ete ecrite malgre le refus'; end if;
  select coalesce(max(rang),0) into v_rang from public.compteur_factures;
  if v_rang <> 0 then raise exception 'un numero a ete consomme pour rien : %', v_rang; end if;
  if exists(select 1 from public.courses where bon ? 'factureNum') then
    raise exception 'des courses ont ete marquees facturees sans facture'; end if;
end $$;

-- ── 9d. UNE COURSE QUI ARRIVE PENDANT L'ATTENTE NE BLOQUE PAS L'EMISSION ──
--    L'autre bord de la regle, et il se paierait cher sans lui : si le
--    document etait recalcule sur TOUTE la periode au lieu du seul ensemble
--    verrouille, une course devenue facturable pendant l'attente ferait
--    « differer » l'ensemble et REFUSERAIT l'emission -- indefiniment sur un
--    compte actif. Le lot verrouille se facture ; la nouvelle course attend la
--    facture suivante, ce qui est exactement ce qu'on veut.
--    C'est ce cas qui rend la restriction « where l.ref = any(refs) »
--    OBSERVABLE : sans elle, cette epreuve tombe.
delete from public.evenements_reservation;
delete from public.factures_commission;
delete from public.compteur_factures;
delete from public.attributions_chauffeur where course_ref = 'ELA-26-09-9003';
delete from public.courses where ref = 'ELA-26-09-9003';
update public.courses set bon = bon - 'factureNum';
update public.attributions_chauffeur set statut = 'active';

do $$
begin
  perform dblink_connect('conc4',
    'host=127.0.0.1 port=' || current_setting('port')
    || ' dbname=' || current_database() || ' user=postgres password=postgres');
  perform (select ref from public.courses where ref='ELA-26-09-9002' for update);
  perform dblink_send_query('conc4',
    'select coalesce((public.ela_emettre_facture_commission('
    || '''11111111-1111-1111-1111-111111111111'',''2026-09-01'',''2026-09-30'')'
    || '->>''num''),''?'')');
  perform pg_sleep(1);
  -- UNE COURSE DE PLUS, facturable, pendant que l'autre attend.
  insert into public.courses(ref, statut, bon) values
   ('ELA-26-09-9003','realisee','{"course":{"date":"2026-09-07"},"prix":{"total":50}}');
  insert into public.attributions_chauffeur(course_ref, chauffeur_id, statut)
   values ('ELA-26-09-9003','11111111-1111-1111-1111-111111111111','active');
end $$;

do $$
declare r text; v_err text := null; n integer;
begin
  begin
    select * into r from dblink_get_result('conc4') as t(x text);
  exception when others then
    v_err := sqlerrm;
  end;
  perform dblink_disconnect('conc4');

  if v_err is not null then
    raise exception 'L''EMISSION A ETE REFUSEE PARCE QU''UNE COURSE EST ARRIVEE '
      'PENDANT L''ATTENTE (%) : le document doit venir du lot VERROUILLE, pas '
      'd''un recalcul sur toute la periode -- sinon un compte actif ne facture '
      'plus jamais', v_err;
  end if;

  -- ON EPROUVE LA PROPRIETE, PAS UN COMPTE. Le lot verrouille depend du decor
  -- laisse par les epreuves precedentes ; figer un nombre ici tomberait au
  -- premier decor legitimement enrichi, sans que rien ne soit casse.
  select count(*) into n from public.factures_commission;
  if n <> 1 then raise exception 'attendu 1 facture, trouve %', n; end if;
  if not exists(select 1 from public.factures_commission f,
                     jsonb_array_elements(f.lignes) l
                 where l->>'ref' = 'ELA-26-09-9002') then
    raise exception 'le lot verrouille n''a pas ete facture'; end if;
  if exists(select 1 from public.factures_commission f,
                 jsonb_array_elements(f.lignes) l
             where l->>'ref' = 'ELA-26-09-9003') then
    raise exception 'la course arrivee PENDANT l''attente est entree dans le '
      'document : elle n''etait pas verrouillee'; end if;
  if (select bon ? 'factureNum' from public.courses where ref='ELA-26-09-9003') then
    raise exception 'la course arrivee pendant l''attente a ete marquee facturee '
      'sans figurer au document'; end if;
end $$;

select 'FACTURES DE COMMISSION : toutes les epreuves passent' as resultat;
