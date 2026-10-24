-- ============================================================================
-- LES DONNÉES MÉTIER SUR LE SERVEUR — ce qui doit être vrai APRÈS la migration
-- Chaque acteur est joué sous son VRAI rôle, avec son jeton. Un refus est
-- exigé pour la bonne raison (acces_refuse / droit SQL), jamais « une erreur ».
-- ============================================================================
create or replace function public.essai_refus(p_sql text, p_cas text) returns void
language plpgsql as $$
begin
  begin
    execute p_sql;
  exception
    when insufficient_privilege then raise notice 'ok — % (refusé)', p_cas; return;
    when others then
      if sqlerrm like '%acces_refuse%' or sqlerrm like '%permission denied%' or sqlerrm like '%row-level security%' then
        raise notice 'ok — % (refusé)', p_cas; return; end if;
      raise exception '% : refusé pour une AUTRE raison : %', p_cas, sqlerrm;
  end;
  raise exception '% : ACCEPTÉ alors qu''il devait être refusé', p_cas;
end $$;
grant execute on function public.essai_refus(text, text) to anon, authenticated;
-- Lire en propriétaire ce qu'un compte connecté ne voit pas (le compteur,
-- les tables d'argent) : l'épreuve contrôle l'état réel sans ouvrir de droit.
create or replace function public.essai_valeur(p_sql text) returns text
language plpgsql security definer as $$
declare v text; begin execute p_sql into v; return v; end $$;
grant execute on function public.essai_valeur(text) to authenticated;
create or replace function public.annee_paris() returns int language sql stable as $$
  select extract(year from (now() at time zone 'Europe/Paris'))::int $$;
grant execute on function public.annee_paris() to anon, authenticated;

-- ════ 1. ANONYME : rien ════
select public.essai_jeton(null, null);
set role anon;
select public.essai_refus('select public.ela_chauffeurs_lister()', 'anon : lister le carnet');
select public.essai_refus('select public.ela_chauffeur_ecrire(''{"id":"CH-x","nom":"x"}'')', 'anon : écrire le carnet');
select public.essai_refus('select public.ela_reglements_lister()', 'anon : lister les règlements');
select public.essai_refus('select public.ela_reglement_ecrire(''{}'')', 'anon : écrire un règlement');
select public.essai_refus('select public.ela_factures_lister()', 'anon : lister les factures');
select public.essai_refus('select public.ela_facture_emettre(''{}'')', 'anon : émettre une facture');
select public.essai_refus('select public.ela_importer_appareil(''{}'')', 'anon : importer');
select public.essai_refus('select * from public.chauffeurs', 'anon : lire la table chauffeurs');
select public.essai_refus('select * from public.reglements_chauffeurs', 'anon : lire les règlements');
select public.essai_refus('insert into public.reglements_chauffeurs(id,cle,montant,date_reglement) values (''P-x'',''x'',1,now())', 'anon : écrire un règlement en direct');
select public.essai_refus('select * from public.factures_commission', 'anon : lire les factures');
select public.essai_refus('update public.compteur_factures set rang = 0', 'anon : remettre le compteur à zéro');
reset role;

-- ════ 2. UN COMPTE CONNECTÉ QUI N'EST PAS OPÉRATEUR, MÊME EN aal2 ════
select public.essai_jeton('aaaaaaaa-0000-0000-0000-000000000004', 'aal2');
set role authenticated;
select public.essai_refus('select public.ela_chauffeurs_lister()', 'non-opérateur : lister le carnet');
select public.essai_refus('select public.ela_importer_appareil(''{}'')', 'non-opérateur : importer');
select public.essai_refus('select public.ela_reglements_lister()', 'non-opérateur : règlements');
select public.essai_refus('select * from public.reglements_chauffeurs', 'non-opérateur : table des règlements');
select public.essai_refus('update public.compteur_factures set rang = 0', 'non-opérateur : compteur');
do $$ begin
  if exists (select 1 from public.chauffeurs) then raise exception 'non-opérateur : lit des chauffeurs'; end if;
end $$;
reset role;

-- ════ 3. L'ADMIN AVEC CODE, AU MOT DE PASSE SEUL (aal1) ════
select public.essai_jeton('aaaaaaaa-0000-0000-0000-000000000001', 'aal1');
set role authenticated;
select public.essai_refus('select public.ela_chauffeurs_lister()', 'admin en aal1 : lister le carnet');
select public.essai_refus('select public.ela_reglements_lister()', 'admin en aal1 : règlements');
select public.essai_refus('select public.ela_importer_appareil(''{}'')', 'admin en aal1 : importer');
reset role;

-- ════ 4. L'ADMIN (aal2) : le carnet, sur « l'appareil A » ════
select public.essai_jeton('aaaaaaaa-0000-0000-0000-000000000001', 'aal2');
set role authenticated;
do $$
declare r jsonb; e text;
begin
  r := public.ela_chauffeur_ecrire('{"id":"CH-ayse","nom":"Ayse","telephone":"+33612345678","carteFin":"2027-01-31","taux":15,"tauxMode":"pct"}');
  if (r->>'version')::int is distinct from 1 or r->>'carteFin' is distinct from '2027-01-31' or (r->>'taux')::numeric is distinct from 15 then
    raise exception 'création : %', r; end if;
  -- Rejouée (réseau coupé après l'envoi) : rien ne change, aucune 2e fiche.
  r := public.ela_chauffeur_ecrire('{"id":"CH-ayse","nom":"Ayse","telephone":"+33612345678","carteFin":"2027-01-31","taux":15,"tauxMode":"pct"}');
  if (r->>'version')::int is distinct from 1 then raise exception 'rejeu de la création : version %', r->>'version'; end if;
  if (select count(*) from public.chauffeurs where id_appareil = 'CH-ayse') is distinct from 1 then raise exception 'rejeu : deux fiches'; end if;
  -- Modifiée depuis la version 1 : version 2.
  r := public.ela_chauffeur_ecrire('{"id":"CH-ayse","nom":"Ayse K.","telephone":"+33612345678","carteFin":"2027-01-31","taux":12,"tauxMode":"eur","version":1}');
  if (r->>'version')::int is distinct from 2 or r->>'tauxMode' is distinct from 'eur' then raise exception 'modification : %', r; end if;
  -- Un 2e appareil qui écrit depuis la version 1 périmée : REFUSÉ, pas écrasé.
  begin
    perform public.ela_chauffeur_ecrire('{"id":"CH-ayse","nom":"Ayse (autre téléphone)","telephone":"+33612345678","version":1}');
    raise exception 'une version périmée a écrasé la fiche';
  exception when others then
    if sqlerrm not like '%conflit_version%' then raise; end if;
  end;
  if (select nom_affiche from public.chauffeurs where id_appareil = 'CH-ayse') is distinct from 'Ayse K.' then
    raise exception 'la fiche a changé malgré le conflit'; end if;
  -- Le rejeu de la modification déjà passée (même contenu, version 1) rend la fiche.
  r := public.ela_chauffeur_ecrire('{"id":"CH-ayse","nom":"Ayse K.","telephone":"+33612345678","carteFin":"2027-01-31","taux":12,"tauxMode":"eur","version":1}');
  if (r->>'version')::int is distinct from 2 then raise exception 'rejeu de la modification : %', r; end if;
  perform public.ela_chauffeur_ecrire('{"id":"CH-bruno","nom":"Bruno","telephone":"+33600000002"}');
  -- Pas de « taux » au-delà de 100 % ; pas d'identifiant fantaisiste.
  begin perform public.ela_chauffeur_ecrire('{"id":"CH-x","nom":"x","taux":150,"tauxMode":"pct"}'); raise exception 'taux 150 %% accepté';
  exception when others then if sqlerrm not like '%taux_invalide%' then raise; end if; end;
  begin perform public.ela_chauffeur_ecrire('{"id":"; drop","nom":"x"}'); raise exception 'identifiant fantaisiste accepté';
  exception when others then if sqlerrm not like '%identifiant_invalide%' then raise; end if; end;
  raise notice 'ok — carnet : création, rejeu sans doublon, version, conflit refusé';
end $$;
reset role;

-- ════ 5. « L'appareil B » (un autre téléphone, même compte) lit la même chose ════
select public.essai_jeton('aaaaaaaa-0000-0000-0000-000000000001', 'aal2');
set role authenticated;
do $$
declare l jsonb;
begin
  l := public.ela_chauffeurs_lister();
  if jsonb_array_length(l) is distinct from 2 then raise exception 'appareil B : % fiches', jsonb_array_length(l); end if;
  if l->0->>'id' is distinct from 'CH-ayse' or l->0->>'nom' is distinct from 'Ayse K.' or (l->0->>'taux')::numeric is distinct from 12 then
    raise exception 'appareil B : %', l->0; end if;
  -- La fiche Admin v2 sans identifiant d'appareil n'apparaît pas (ni perdue : elle reste en table).
  if (select count(*) from public.chauffeurs) is distinct from 3 then raise exception 'une fiche a disparu de la table'; end if;
  raise notice 'ok — appareil B : le carnet de l''appareil A est là';
end $$;
reset role;

-- ════ 6. L'AGENT (aal2) : lit le carnet SANS les taux, n'écrit rien, ne voit pas l'argent ════
select public.essai_jeton('aaaaaaaa-0000-0000-0000-000000000002', 'aal2');
set role authenticated;
do $$
declare l jsonb;
begin
  l := public.ela_chauffeurs_lister();
  if jsonb_array_length(l) is distinct from 2 then raise exception 'agent : % fiches', jsonb_array_length(l); end if;
  if (l->0) ? 'taux' and l->0->>'taux' is not null then raise exception 'agent : voit le taux de commission'; end if;
  raise notice 'ok — agent : lit le carnet, sans les taux';
end $$;
select public.essai_refus('select public.ela_chauffeur_ecrire(''{"id":"CH-agent","nom":"x"}'')', 'agent : écrire une fiche');
select public.essai_refus('select public.ela_chauffeur_retirer(''CH-ayse'')', 'agent : retirer une fiche');
do $$ begin
  update public.chauffeurs set taux_commission = 50;
  if found then raise exception 'agent : a modifié le carnet en direct'; end if;
exception when insufficient_privilege then null;
end $$;
select public.essai_refus('select public.ela_reglements_lister()', 'agent : règlements');
select public.essai_refus('select public.ela_factures_lister()', 'agent : factures');
select public.essai_refus('select public.ela_facture_emettre(''{}'')', 'agent : émettre');
select public.essai_refus('select public.ela_importer_appareil(''{}'')', 'agent : importer');
reset role;

-- ════ 7. LES RÈGLEMENTS ════
select public.essai_jeton('aaaaaaaa-0000-0000-0000-000000000001', 'aal2');
set role authenticated;
do $$
declare r jsonb;
begin
  r := public.ela_reglement_ecrire('{"id":"P-k1","cle":"id:CH-ayse","nom":"Ayse","tel":"+33612345678","montant":40,"date":"2026-10-20","mode":"virement"}');
  -- DOUBLE APPUI / REQUÊTE REJOUÉE : même identifiant, une seule ligne.
  r := public.ela_reglement_ecrire('{"id":"P-k1","cle":"id:CH-ayse","nom":"Ayse","tel":"+33612345678","montant":40,"date":"2026-10-20","mode":"virement"}');
  if jsonb_array_length(public.ela_reglements_lister()) is distinct from 1 then raise exception 'le rejeu a créé un 2e règlement'; end if;
  begin
    perform public.ela_reglement_ecrire('{"id":"P-k1","cle":"id:CH-ayse","montant":400,"date":"2026-10-20"}');
    raise exception 'un identifiant réutilisé pour un autre montant est accepté';
  exception when others then if sqlerrm not like '%identifiant_reutilise%' then raise; end if; end;
  begin perform public.ela_reglement_ecrire('{"id":"P-k2","cle":"id:CH-ayse","montant":-5,"date":"2026-10-20"}'); raise exception 'montant négatif accepté';
  exception when others then if sqlerrm not like '%montant_invalide%' then raise; end if; end;
  perform public.ela_reglement_ecrire('{"id":"P-k3","cle":"nom:bruno","montant":"25.50","date":"2026-10-21","mode":"especes"}');
  perform public.ela_reglement_retirer('P-k3');
  perform public.ela_reglement_retirer('P-k3');
  if jsonb_array_length(public.ela_reglements_lister()) is distinct from 1 then raise exception 'le règlement retiré est encore listé'; end if;
  raise notice 'ok — règlements : une ligne par saisie, rejeu sans doublon, retrait tracé';
end $$;
reset role;
do $$ begin
  if (select count(*) from public.reglements_chauffeurs) is distinct from 2
     or (select retire_le from public.reglements_chauffeurs where id = 'P-k3') is null then
    raise exception 'le retrait a effacé au lieu de tracer'; end if;
end $$;

-- ════ 8. LES FACTURES ════
select public.essai_jeton('aaaaaaaa-0000-0000-0000-000000000001', 'aal2');
set role authenticated;
do $$
declare f jsonb; f2 jsonb; a int := public.annee_paris(); avant int; doc text;
begin
  doc := '{"cle":"00000000-0000-0000-0000-0000000000a1","du":"2026-10-01","au":"2026-10-31",
    "emetteur":{"nom":"Elatransfer","siret":"12345678900011","adresse":"Paris"},
    "client":{"id":"CH-ayse","nom":"Ayse K."},
    "lignes":[{"ref":"ELA-26-10-R0001","commission":12},{"ref":"ELA-26-10-R0002","commission":12}],
    "refs":["ELA-26-10-R0001","ELA-26-10-R0002"],"ht":24,"tauxTva":0,"tva":0,"ttc":24}';
  f := public.ela_facture_emettre(doc::jsonb);
  -- Le compteur Admin v2 était à 2 : on continue, on ne repart pas à 1.
  if f->>'num' is distinct from 'F-' || a || '-0003' then raise exception 'premier numéro : % (attendu F-%-0003)', f->>'num', a; end if;
  -- DOUBLE APPUI : même clé, même facture, aucun numéro consommé.
  f2 := public.ela_facture_emettre(doc::jsonb);
  if f2->>'num' is distinct from f->>'num' then raise exception 'le rejeu a émis %', f2->>'num'; end if;
  if public.essai_valeur('select rang from public.compteur_factures where annee = ' || a)::int is distinct from 3 then raise exception 'le rejeu a consommé un numéro'; end if;
  -- Les courses sont marquées dans la même transaction.
  if (select count(*) from public.courses where bon->>'factureNum' = f->>'num') is distinct from 2 then raise exception 'courses non marquées'; end if;
  -- Une course déjà facturée ne se refacture pas (autre clé).
  avant := public.essai_valeur('select rang from public.compteur_factures where annee = ' || a)::int;
  begin
    perform public.ela_facture_emettre(replace(doc, '00a1', '00a2')::jsonb);
    raise exception 'une course facturée a été refacturée';
  exception when others then if sqlerrm not like '%course_non_facturable%' then raise; end if; end;
  -- Ni une course en attente, ni une course d'essai, ni des montants faux.
  begin
    perform public.ela_facture_emettre(replace(replace(doc, 'R0001', 'R0003'), '00a1', '00a3')::jsonb);
    raise exception 'une course en attente a été facturée';
  exception when others then if sqlerrm not like '%course_non_facturable%' then raise; end if; end;
  begin
    perform public.ela_facture_emettre(replace(replace(replace(doc, 'R0001', 'R0006'), 'R0002', 'R0004'), '00a1', '00a4')::jsonb);
    raise exception 'une course d''essai a été facturée';
  exception when others then if sqlerrm not like '%course_non_facturable%' then raise; end if; end;
  begin
    perform public.ela_facture_emettre(replace(replace(replace(replace(doc, 'R0001', 'R0004'), 'R0002', 'R0005'), '00a1', '00a5'), '"ht":24', '"ht":99')::jsonb);
    raise exception 'des montants incohérents ont été facturés';
  exception when others then if sqlerrm not like '%montants_incoherents%' then raise; end if; end;
  begin
    perform public.ela_facture_emettre(replace(replace(replace(replace(doc, 'R0001', 'R0004'), 'R0002', 'R0005'), '00a1', '00a6'), '"siret":"12345678900011"', '"siret":""')::jsonb);
    raise exception 'une facture sans SIRET a été émise';
  exception when others then if sqlerrm not like '%emetteur_incomplet%' then raise; end if; end;
  -- AUCUN REFUS N'A BRÛLÉ DE NUMÉRO (un trou est la même faute qu'un doublon).
  if public.essai_valeur('select rang from public.compteur_factures where annee = ' || a)::int is distinct from avant then raise exception 'un refus a consommé un numéro'; end if;
  if jsonb_array_length(public.ela_factures_lister()) is distinct from 2 then raise exception 'lister : % factures', jsonb_array_length(public.ela_factures_lister()); end if;
  raise notice 'ok — factures : le compteur continue, rejeu sans doublon, aucun refus ne brûle de numéro';
end $$;
reset role;
select 'données métier : tous les cas tiennent' as etat;
