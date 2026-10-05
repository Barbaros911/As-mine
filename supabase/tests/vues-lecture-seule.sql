-- ============================================================================
-- Épreuve de 20261005000000_vues_lecture_seule.sql — PARTIE « AVANT ».
--
-- On repose l'état RELEVÉ EN PRODUCTION (inventaire du 2 octobre 2026), pas
-- l'état qu'on imagine : les tables fermées à anon, puis les deux vues créées
-- par la VRAIE migration 20260928120000_tarif_unifie.sql, avec les privilèges
-- par défaut de Supabase. Et on exige que le trou SE REPRODUISE : un anonyme
-- efface le tarif berline à travers la vue. Sans cette preuve, le refus
-- éprouvé après la migration ne démontrerait rien — il pourrait venir d'un
-- socle mal posé (leçon de « courses-sans-anon.sql », Issue #190).
--
-- Ordre dans le workflow : socle.sql, CE fichier, tarif_unifie.sql (qui crée
-- les vues), vues-lecture-seule-sonde.sql, la migration (deux fois : elle doit
-- se rejouer), puis vues-lecture-seule-apres.sql.
-- ============================================================================

-- Les trois tables lues par les vues, avec les seules colonnes qu'elles lisent
-- ou que la migration de tarif écrit. Créées AVANT les privilèges par défaut :
-- en production, anon n'a aucun droit sur elles (relevé du 2 octobre).
create table if not exists public.parametres_commerciaux (
  cle text primary key,
  valeur jsonb not null,
  actif boolean not null default true,
  modifie_le timestamptz not null default now());
create table if not exists public.partenaires (
  id uuid primary key default gen_random_uuid(),
  cle text unique not null,
  actif boolean not null default true);
create table if not exists public.tarifs_partenaires (
  id uuid primary key default gen_random_uuid(),
  partenaire_id uuid not null references public.partenaires(id),
  destination_cle text not null,
  destination_nom text not null,
  vehicule_cle text not null,
  montant_centimes integer not null,
  actif boolean not null default true);
alter table public.parametres_commerciaux enable row level security;
alter table public.partenaires enable row level security;
alter table public.tarifs_partenaires enable row level security;

insert into public.parametres_commerciaux(cle, valeur) values
  ('tarif_general_berline', '{"par_km_centimes":290,"minimum_centimes":3500,"arrondi":"dizaine_euros"}'),
  ('tarif_general_van',     '{"par_km_centimes":470,"minimum_centimes":5000,"arrondi":"dizaine_euros"}'),
  ('commission_ela_defaut', '{"pourcentage":20}')
on conflict (cle) do nothing;
insert into public.partenaires(cle) values ('easyhotel-aeroville') on conflict (cle) do nothing;
insert into public.tarifs_partenaires(partenaire_id, destination_cle, destination_nom, vehicule_cle, montant_centimes)
select id, 'orly', 'Orly', 'berline', 9000 from public.partenaires where cle = 'easyhotel-aeroville';

-- LES PRIVILÈGES PAR DÉFAUT DE SUPABASE sur ce qu'on crée ensuite dans
-- « public » : tout, à anon et à authenticated. C'est la cause du trou — sans
-- cette ligne, les vues ne recevraient que le SELECT de la migration, et
-- l'épreuve passerait au vert sur une base qui ne ressemble pas à la vraie.
alter default privileges in schema public grant all on tables to anon, authenticated;
