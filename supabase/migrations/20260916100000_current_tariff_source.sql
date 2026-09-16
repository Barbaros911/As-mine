-- Source serveur initiale = copie exacte des règles actuellement publiées.
-- Cette migration NE change aucun prix client : elle évite seulement que le
-- futur moteur serveur parte d'une grille inventée ou différente du site.

insert into public.parametres_commerciaux(cle,valeur,modifie_le,modifie_par)
values
 ('tarif_general_berline','{"par_km_centimes":265,"minimum_centimes":3000,"arrondi":"dizaine_euros"}'::jsonb,now(),auth.uid()),
 ('tarif_general_van','{"par_km_centimes":400,"minimum_centimes":5000,"arrondi":"dizaine_euros"}'::jsonb,now(),auth.uid()),
 ('tarif_easyhotel_autre','{"berline_par_km_centimes":255,"van_par_km_centimes":410,"berline_minimum_centimes":3000,"van_minimum_centimes":5000,"arrondi":"euro"}'::jsonb,now(),auth.uid())
on conflict(cle) do nothing;

insert into public.partenaires(cle,nom,adresse_depart,actif,config)
values('easyhotel-aeroville','easyHotel Aéroville','10 rue de la Belle Borne, 93410 Tremblay-en-France',true,
  '{"source":"grille_actuellement_publiee","aucun_tarif_nuit_weekend":true}'::jsonb)
on conflict(cle) do update set nom=excluded.nom,adresse_depart=excluded.adresse_depart,actif=true,config=public.partenaires.config||excluded.config;

create unique index if not exists tarifs_partenaires_unique_actif
  on public.tarifs_partenaires(partenaire_id,destination_cle,vehicule_cle) where actif;

with p as (select id from public.partenaires where cle='easyhotel-aeroville'),
t(destination_cle,destination_nom,vehicule_cle,montant_centimes) as (values
 ('cdg','Aéroport CDG','berline',3500),('cdg','Aéroport CDG','van',5000),
 ('orly','Orly','berline',10000),('orly','Orly','van',12500),
 ('bourget','Le Bourget','berline',4500),('bourget','Le Bourget','van',6500),
 ('beauvais','Beauvais','berline',18000),('beauvais','Beauvais','van',24000),
 ('villepinte','Expositions Villepinte','berline',3500),('villepinte','Expositions Villepinte','van',5000),
 ('disney','Disney','berline',9000),('disney','Disney','van',12000),
 ('paris','Paris','berline',8000),('paris','Paris','van',11000)
)
insert into public.tarifs_partenaires(partenaire_id,destination_cle,destination_nom,vehicule_cle,montant_centimes,actif)
select p.id,t.destination_cle,t.destination_nom,t.vehicule_cle,t.montant_centimes,true from p cross join t
on conflict(partenaire_id,destination_cle,vehicule_cle) where actif do update
set destination_nom=excluded.destination_nom,montant_centimes=excluded.montant_centimes,modifie_le=now();
