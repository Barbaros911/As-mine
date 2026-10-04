-- LE MINIMUM BERLINE PASSE À 35 € — 4 octobre 2026, décision de Barbaros
-- (« Oui le 35 c'est moi »). Le tarif au kilomètre (2,90 €) et le van
-- (4,70 €/km, minimum 50 €) ne changent pas.
--
-- LA PRODUCTION PORTE DÉJÀ 35 €. Il l'a réglé depuis l'admin (Réglages →
-- Tarifs) ; c'est la première exécution en CI d'une suite qui lisait le
-- vrai serveur qui l'a montré, le 4 octobre. Ce fichier ne sert qu'à
-- aligner la source du dépôt sur la base : le repli du site (GAMMES) et
-- cette source sont comparés à chaque construction (test-doc.mjs,
-- .github/scripts/verifier-tarif-hotel.mjs), et ils disaient 30 € tous
-- les deux pendant que la base disait 35.
--
-- C'EST UNE ÉCRITURE CONDITIONNELLE, ET C'EST TOUTE SA SÛRETÉ. Elle ne
-- touche la ligne que si elle porte encore, à l'identique, la valeur
-- posée le 28 septembre par 20260928120000_tarif_unifie.sql (2,90 €/km,
-- minimum 30 €, arrondi à la dizaine). Donc :
--   - lancée sur la production d'aujourd'hui : elle ne change rien ;
--   - rejouée un jour sur un tarif réglé depuis l'admin : elle ne change
--     rien non plus — contrairement aux deux migrations de tarif plus
--     anciennes, qu'il ne faut jamais rejouer ;
--   - sur une base reconstruite de zéro : elle pose 35 €, ce que lisent
--     les contrôles.
-- SEUL CAS OÙ ELLE ÉCRIRAIT ENCORE : si l'admin remettait un jour
-- exactement 2,90 €/km, 30 € et l'arrondi à la dizaine. PostgreSQL compare
-- deux jsonb par leur contenu, pas par l'ordre de leurs clés.
--
-- ELLE N'A PAS BESOIN D'ÊTRE APPLIQUÉE EN PRODUCTION.
--
-- LA FORME EST CELLE QUE LISENT LES CONTRÔLES : le JSON complet juste
-- après « set valeur = », puis « where cle = … » sans point-virgule entre
-- les deux. Un jsonb_set ne serait pas lu, et les contrôles verraient
-- encore 30 €. Ne recopier aucune ancienne valeur en commentaire APRÈS
-- l'instruction : les contrôles lisent aussi les commentaires.
update public.parametres_commerciaux
set valeur = '{"par_km_centimes":290,"minimum_centimes":3500,"arrondi":"dizaine_euros"}'::jsonb,
    modifie_le = now()
where cle = 'tarif_general_berline'
  and valeur = '{"par_km_centimes":290,"minimum_centimes":3000,"arrondi":"dizaine_euros"}'::jsonb;
