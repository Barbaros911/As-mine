-- TARIF UNIFIÉ — 28 septembre 2026, à la demande de Barbaros : « je veux
-- que tout le monde ait le même prix lorsqu'il tape une adresse sur le
-- moteur de recherche, et je veux pouvoir modifier cela sur ma page admin,
-- même les prix du flyer. »
--
-- CE QUI CHANGE : le site avait DEUX grilles au kilomètre — 2,65 €/km
-- berline / 4,00 €/km van pour un client ordinaire, 2,55 / 4,10 pour une
-- adresse hôtel hors flyer (« autre destination »), la seconde injectée
-- au moment de CONSTRUIRE le site par appliquer-regles-easyhotel.mjs. Il
-- n'y en a plus qu'une : tarif_general_berline / tarif_general_van, lue
-- par tout le monde. « tarif_easyhotel_autre » n'est PLUS interrogée par
-- aucun code — la ligne reste en base pour l'historique, elle est inerte.
update public.parametres_commerciaux
set valeur = '{"par_km_centimes":290,"minimum_centimes":3000,"arrondi":"dizaine_euros"}'::jsonb,
    modifie_le = now()
where cle = 'tarif_general_berline';

update public.parametres_commerciaux
set valeur = '{"par_km_centimes":470,"minimum_centimes":5000,"arrondi":"dizaine_euros"}'::jsonb,
    modifie_le = now()
where cle = 'tarif_general_van';

-- DEUX VUES ANONYMES, PAS DEUX TABLES OUVERTES. Le site public doit
-- pouvoir LIRE ce tarif sans être connecté (c'est un visiteur anonyme qui
-- tape une adresse) : `parametres_commerciaux` et `tarifs_partenaires`
-- restent fermées à anon, comme depuis leur création — la première porte
-- AUSSI `commission_ela_defaut`, la marge d'Elatransfer, qui ne doit
-- JAMAIS être visible d'un visiteur ni d'un comptoir d'hôtel (voir
-- CLAUDE.md, « CE QUE LE COMPTOIR NE DOIT JAMAIS VOIR »). Ouvrir anon sur
-- la table entière exposerait la marge en même temps que le tarif. Ces
-- deux vues ne rendent QUE des chiffres déjà publics par nature — le
-- tarif au kilomètre affiché sur le site, les prix d'un flyer imprimé.
--
-- Vues normales (pas « security_invoker »), donc lues avec les droits du
-- PROPRIÉTAIRE de la vue, qui possède aussi les tables sous-jacentes et
-- n'y est pas soumis à leurs policies RLS : c'est ce qui laisse anon
-- interroger la vue sans jamais toucher aux tables elles-mêmes.
create or replace view public.tarif_public as
select
  replace(cle, 'tarif_general_', '') as gamme,
  (valeur->>'par_km_centimes')::integer as par_km_centimes,
  (valeur->>'minimum_centimes')::integer as minimum_centimes,
  valeur->>'arrondi' as arrondi
from public.parametres_commerciaux
where cle in ('tarif_general_berline', 'tarif_general_van') and actif;

comment on view public.tarif_public is
  'Lecture publique (anon) du SEUL tarif kilométrique général, berline et van. Ne porte jamais la commission ni aucun autre paramètre commercial.';

grant select on public.tarif_public to anon;

create or replace view public.forfaits_partenaires_publics as
select p.cle as partenaire_cle, t.destination_cle, t.destination_nom,
       t.vehicule_cle, t.montant_centimes
from public.tarifs_partenaires t
join public.partenaires p on p.id = t.partenaire_id
where t.actif and p.actif;

comment on view public.forfaits_partenaires_publics is
  'Lecture publique (anon) des forfaits fixes affichés sur les flyers hôtel — déjà imprimés sur papier, rien de nouveau exposé.';

grant select on public.forfaits_partenaires_publics to anon;
