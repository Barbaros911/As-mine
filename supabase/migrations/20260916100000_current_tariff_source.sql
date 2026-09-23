-- Source serveur de la grille = copie exacte des règles publiées sur le site.
-- Elle évite que le moteur serveur parte d'une grille inventée ou différente.
--
-- LES FORFAITS easyHotel SONT UN « UPSERT » : rejouer ce fichier (workflow
-- « Appliquer une migration Supabase ») met la base à jour. C'est voulu — la
-- grille ne vit qu'ici côté serveur, jamais recopiée dans une seconde
-- migration. Grille du flyer arrêtée par Barbaros le 22/09/2026 :
-- Orly 90/130, Le Bourget 35/70, Disney 80/120, Paris 80/120.
-- deposer-course REMPLACE le prix du client par celui de cette table : tant
-- que ce fichier n'est pas rejoué en production, une course easyHotel est
-- enregistrée à l'ancien montant.

insert into public.parametres_commerciaux(cle,valeur,modifie_le,modifie_par)
values
 ('tarif_general_berline','{"par_km_centimes":265,"minimum_centimes":3000,"arrondi":"dizaine_euros"}'::jsonb,now(),auth.uid()),
 ('tarif_general_van','{"par_km_centimes":400,"minimum_centimes":5000,"arrondi":"dizaine_euros"}'::jsonb,now(),auth.uid()),
 ('tarif_easyhotel_autre','{"berline_par_km_centimes":255,"van_par_km_centimes":410,"berline_minimum_centimes":3000,"van_minimum_centimes":5000,"arrondi":"euro"}'::jsonb,now(),auth.uid())
on conflict(cle) do nothing;

insert into public.partenaires(cle,nom,adresse_depart,actif)
values('easyhotel-aeroville','easyHotel Aéroville','10 rue de la Belle Borne, 93410 Tremblay-en-France',true)
on conflict(cle) do update set nom=excluded.nom,adresse_depart=excluded.adresse_depart,actif=true,modifie_le=now();

create unique index if not exists tarifs_partenaires_unique_actif
  on public.tarifs_partenaires(partenaire_id,destination_cle,vehicule_cle) where actif;

with p as (select id from public.partenaires where cle='easyhotel-aeroville'),
t(destination_cle,destination_nom,vehicule_cle,montant_centimes) as (values
 ('cdg','Aéroport CDG','berline',3500),('cdg','Aéroport CDG','van',5000),
 ('orly','Orly','berline',9000),('orly','Orly','van',13000),
 ('bourget','Le Bourget','berline',3500),('bourget','Le Bourget','van',7000),
 ('beauvais','Beauvais','berline',18000),('beauvais','Beauvais','van',24000),
 ('villepinte','Expositions Villepinte','berline',3500),('villepinte','Expositions Villepinte','van',5000),
 ('disney','Disney','berline',8000),('disney','Disney','van',12000),
 ('paris','Paris','berline',8000),('paris','Paris','van',12000)
)
insert into public.tarifs_partenaires(partenaire_id,destination_cle,destination_nom,vehicule_cle,montant_centimes,actif)
select p.id,t.destination_cle,t.destination_nom,t.vehicule_cle,t.montant_centimes,true from p cross join t
on conflict(partenaire_id,destination_cle,vehicule_cle) where actif do update
set destination_nom=excluded.destination_nom,montant_centimes=excluded.montant_centimes,modifie_le=now();
