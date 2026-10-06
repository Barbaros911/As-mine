-- ============================================================================
-- LE PILOTAGE — RELU APRÈS RECONNEXION. Lancé par une AUTRE session psql que
-- pilotage-apres.sql : ce qui est relu ici a été écrit, validé et gardé par la
-- base, pas seulement vu dans la transaction qui l'a écrit. L'admin relit
-- sous le rôle « authenticated », donc à travers la RLS, comme le navigateur.
-- ============================================================================
select set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000001', false);
set role authenticated;
do $$
declare r public.pilotage_cartes; n bigint; actions text;
begin
  select * into r from public.pilotage_cartes where titre = 'Créer l''entreprise (SIRET)';
  if not found then raise exception 'ECHEC P : la carte modifiée n''a pas survécu à la reconnexion'; end if;
  if r.statut <> 'en_cours' or r.priorite <> 'P0' or r.responsable <> 'Claude'
     or r.tableau <> 'produit' or r.categorie <> 'admin' or r.bloque or r.raison_blocage is not null
     or r.echeance <> date '2026-10-10' or r.archivee or r.termine_le is not null
     or r.checklist->1->>'fait' <> 'true' then
    raise exception 'ECHEC P : la carte relue n''est pas celle qu''on a laissée : %', row_to_json(r); end if;
  -- Une écriture = une version : création, contenu, blocage, checklist,
  -- déblocage, terminé, rouvert, priorité, responsable, échéance, tableau.
  if r.version <> 11 then raise exception 'ECHEC P : version % (11 écritures attendues)', r.version; end if;

  select string_agg(action, ',' order by id) into actions from public.pilotage_journal where carte_id = r.id;
  if actions <> 'creation,contenu,blocage,contenu,deblocage,statut,statut,priorite,responsable,echeance,tableau,categorie' then
    raise exception 'ECHEC P : journal relu inattendu : %', actions; end if;

  select * into r from public.pilotage_cartes where titre = 'Bouton « Voir mon prix » sous la barre du bas';
  if not found or not r.archivee or r.archivee_le is null then
    raise exception 'ECHEC P : la carte archivée n''est pas relue archivée'; end if;
  if r.statut <> 'a_faire' or r.categorie <> 'reservation' then
    raise exception 'ECHEC P : l''archivage a perdu l''état de la carte'; end if;

  select count(*) into n from public.pilotage_cartes where not archivee;
  if n < 13 then raise exception 'ECHEC P : % cartes actives relues', n; end if;
end $$;
reset role;

select 'PILOTAGE : relu après reconnexion' as resultat;
