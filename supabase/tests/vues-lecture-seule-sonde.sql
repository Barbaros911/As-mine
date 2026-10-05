-- ============================================================================
-- Épreuve de 20261005000000_vues_lecture_seule.sql — LE TROU SE REPRODUIT.
-- Joué après tarif_unifie.sql (les vues existent, avec les droits relevés en
-- production) et AVANT la migration corrective.
-- ============================================================================

-- Les droits relevés en production sur les deux vues : tout, pour les deux
-- rôles publics. Si le socle ne les donne pas, l'épreuve s'arrête ici.
do $$ begin
  if not has_table_privilege('anon', 'public.tarif_public', 'DELETE')
     or not has_table_privilege('anon', 'public.forfaits_partenaires_publics', 'UPDATE') then
    raise exception 'état d''origine mal reposé : anon n''a pas les droits relevés en production';
  end if;
end $$;

-- UNE VUE FUTURE, comme on pourrait en créer une demain dans le tableau de
-- bord : une seule table, des colonnes simples — donc modifiable par
-- PostgreSQL. Et un droit posé COLONNE PAR COLONNE, qu'un REVOKE sur la vue
-- n'efface pas. La migration ne la nomme pas : elle doit la couvrir quand même.
create view public.sonde_vue_future as
  select cle, actif from public.parametres_commerciaux;
grant update (actif) on public.sonde_vue_future to authenticated;

-- LE TROU, REPRODUIT : un anonyme efface le tarif berline à travers la vue.
-- Dans une transaction annulée — l'état doit rester intact pour la suite.
begin;
set local role anon;
delete from public.tarif_public where gamme = 'berline';
reset role;
do $$ begin
  if exists (select 1 from public.parametres_commerciaux where cle = 'tarif_general_berline') then
    raise exception 'reproduction ratée : anon n''a PAS pu effacer le tarif — l''épreuve ne prouverait rien';
  end if;
  raise notice 'reproduit : un anonyme efface tarif_general_berline à travers tarif_public';
end $$;
rollback;

-- Et la vue future : anon y désactive un réglage, sans aucune policy.
begin;
set local role anon;
update public.sonde_vue_future set actif = false where cle = 'commission_ela_defaut';
reset role;
do $$ begin
  if (select actif from public.parametres_commerciaux where cle = 'commission_ela_defaut') then
    raise exception 'reproduction ratée : anon n''a PAS pu écrire dans la vue sonde';
  end if;
end $$;
rollback;
