-- ============================================================================
-- L'IMPORT D'UNE ANCIENNE SAUVEGARDE (format « elatransfer-1 » de l'appareil)
-- Ajoute ce qui manque, ne remplace rien, DIT les conflits, et rejoué n'ajoute
-- rien. Le compteur de factures ne recule jamais et passe au-dessus du plus
-- grand numéro connu, appareil compris.
-- ============================================================================
create or replace function public.essai_sauvegarde() returns jsonb language sql as $$
  select jsonb_build_object(
    'format', 'elatransfer-1',
    'chauffeurs', jsonb_build_array(
      -- déjà sur le serveur, même nom (casse mise à part) → « déjà »
      jsonb_build_object('id', 'CH-ayse', 'nom', 'ayse k.', 'telephone', '+33612345678'),
      -- inconnue du serveur → ajoutée, avec ses papiers et son taux en euros
      jsonb_build_object('id', 'CH-carla', 'nom', 'Carla', 'telephone', '+33600000003',
        'carte', 'VTC-1', 'carteFin', '2026-12-31', 'assuranceFin', 'pas-une-date', 'taux', 8, 'tauxMode', 'eur'),
      -- même identifiant qu'une fiche du serveur, autre personne → CONFLIT
      jsonb_build_object('id', 'CH-bruno', 'nom', 'Quelqu''un d''autre', 'telephone', '+33600000009'),
      -- illisible → refusée, pas devinée
      jsonb_build_object('nom', 'Sans identifiant')),
    'paiementsChauffeurs', jsonb_build_array(
      jsonb_build_object('id', 'P-k1', 'cle', 'id:CH-ayse', 'montant', 40, 'date', '2026-10-20'),
      jsonb_build_object('id', 'P-vieux', 'cle', 'id:CH-carla', 'nom', 'Carla', 'montant', 15.5, 'date', '2026-09-02', 'mode', 'especes'),
      jsonb_build_object('id', 'P-k3', 'cle', 'nom:bruno', 'montant', 999, 'date', '2026-10-21')),
    'factures', jsonb_build_array(
      -- émise sur l'appareil, inconnue du serveur → ajoutée, sa course marquée
      jsonb_build_object('num', 'F-' || public.annee_paris() || '-0009', 'date', public.annee_paris() || '-10-15',
        'du', '2026-10-01', 'au', '2026-10-15', 'emetteur', jsonb_build_object('nom', 'Elatransfer'),
        'client', jsonb_build_object('id', 'CH-carla', 'nom', 'Carla'),
        'lignes', jsonb_build_array(jsonb_build_object('ref', 'ELA-26-10-R0008', 'commission', 8)),
        'refs', jsonb_build_array('ELA-26-10-R0008'), 'ht', 8, 'tauxTva', 0, 'tva', 0, 'ttc', 8),
      -- même numéro qu'une facture Admin v2 du serveur, autre contenu → CONFLIT
      jsonb_build_object('num', 'F-' || public.annee_paris() || '-0002', 'date', public.annee_paris() || '-09-30',
        'client', jsonb_build_object('id', 'CH-carla'), 'lignes', '[]'::jsonb, 'ht', 77, 'ttc', 77)),
    -- l'ancien format garde le rang tel que localStorage l'écrit : une chaîne
    'rangFacture', '{"annee":' || public.annee_paris() || ',"rang":11}',
    'entreprise', jsonb_build_object('nom', 'Elatransfer', 'siret', '12345678900011', 'adresse', 'Paris', 'contact', 'contact@elatransfer.com', 'tva', 0),
    'lienAvis', 'https://g.page/r/exemple/review') $$;

select public.essai_jeton('aaaaaaaa-0000-0000-0000-000000000001', 'aal2');
set role authenticated;
do $$
declare cr jsonb; cr2 jsonb; a int := public.annee_paris(); f jsonb;
begin
  cr := public.ela_importer_appareil(public.essai_sauvegarde());
  raise notice 'compte rendu : %', cr;
  if (cr->'chauffeurs'->>'ajoutes')::int is distinct from 1 or (cr->'chauffeurs'->>'deja')::int is distinct from 1
     or cr->'chauffeurs'->'conflits' is distinct from '["CH-bruno"]' or jsonb_array_length(cr->'chauffeurs'->'refuses') is distinct from 1 then
    raise exception 'carnet : %', cr->'chauffeurs'; end if;
  if (cr->'reglements'->>'ajoutes')::int is distinct from 1 or (cr->'reglements'->>'deja')::int is distinct from 1
     or cr->'reglements'->'conflits' is distinct from '["P-k3"]' then raise exception 'règlements : %', cr->'reglements'; end if;
  if (cr->'factures'->>'ajoutes')::int is distinct from 1 or cr->'factures'->'conflits' is distinct from jsonb_build_array('F-' || a || '-0002')
     or cr->'factures'->'refuses' is distinct from '[]' or cr->'reglements'->'refuses' is distinct from '[]' then
    raise exception 'factures : %', cr->'factures'; end if;
  if cr->>'emetteur' is distinct from 'ajoute' or cr->>'lienAvis' is distinct from 'ajoute' then raise exception 'émetteur / avis : %', cr; end if;
  -- RIEN DU SERVEUR N'A ÉTÉ REMPLACÉ.
  if (select nom_affiche from public.chauffeurs where id_appareil = 'CH-bruno') is distinct from 'Bruno' then raise exception 'la fiche Bruno a été écrasée'; end if;
  if public.essai_valeur('select ttc from public.factures_commission where num = ''F-' || a || '-0002''')::numeric is distinct from 10 then raise exception 'la facture Admin v2 a été écrasée'; end if;
  if public.essai_valeur('select montant from public.reglements_chauffeurs where id = ''P-k3''')::numeric is distinct from 25.50 then raise exception 'le règlement P-k3 a été écrasé'; end if;
  -- Une date illisible n'est pas inventée.
  if (select assurance_fin from public.chauffeurs where id_appareil = 'CH-carla') is not null then raise exception 'date illisible inventée'; end if;
  -- La course facturée sur l'appareil porte son numéro sur le serveur.
  if (select bon->>'factureNum' from public.courses where ref = 'ELA-26-10-R0008') is distinct from 'F-' || a || '-0009' then raise exception 'course importée non marquée'; end if;
  -- LE COMPTEUR : au-dessus du rang de l'appareil (11), jamais en dessous.
  if public.essai_valeur('select rang from public.compteur_factures where annee = ' || a)::int is distinct from 11 then
    raise exception 'compteur après import : % (attendu 11)', public.essai_valeur('select rang from public.compteur_factures where annee = ' || a)::int; end if;
  f := public.ela_facture_emettre(public.essai_doc('00000000-0000-0000-0000-0000000000d1', array['ELA-26-10-R0009']));
  if f->>'num' is distinct from 'F-' || a || '-0012' then raise exception 'après import, le numéro suivant est % (attendu F-%-0012)', f->>'num', a; end if;

  -- REJOUÉ : rien n'est ajouté, tout est « déjà », le compteur ne bouge pas.
  cr2 := public.ela_importer_appareil(public.essai_sauvegarde());
  if (cr2->'chauffeurs'->>'ajoutes')::int + (cr2->'reglements'->>'ajoutes')::int + (cr2->'factures'->>'ajoutes')::int is distinct from 0 then
    raise exception 'le réimport a ajouté : %', cr2; end if;
  if (cr2->'chauffeurs'->>'deja')::int is distinct from 2 or (cr2->'reglements'->>'deja')::int is distinct from 2 or (cr2->'factures'->>'deja')::int is distinct from 1 then
    raise exception 'réimport : %', cr2; end if;
  if public.essai_valeur('select rang from public.compteur_factures where annee = ' || a)::int is distinct from 12 then raise exception 'le réimport a fait bouger le compteur'; end if;
  if cr2->>'emetteur' is distinct from 'deja' then raise exception 'réimport : émetteur %', cr2->>'emetteur'; end if;
  raise notice 'ok — import : ajoute, ne remplace rien, dit les conflits ; rejoué sans doublon ; compteur au-dessus de l''appareil';
end $$;
-- Une sauvegarde qui n'en est pas une.
do $$ begin
  perform public.ela_importer_appareil('[1,2]');
  raise exception 'un tableau a été accepté comme sauvegarde';
exception when others then
  if sqlerrm not like '%sauvegarde_illisible%' then raise; end if;
  raise notice 'ok — import : un tableau n''est pas une sauvegarde';
end $$;
reset role;
select 'import : tient' as etat;
