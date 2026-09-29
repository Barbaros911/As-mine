-- Ce que la source des tarifs (20260916100000) attend et que le socle commun
-- n'a pas : les deux tables des partenaires, et la colonne « modifie_par ».
-- Recopie MINIMALE du schema reel (20260916064000_admin_v2_core.sql).
alter table public.parametres_commerciaux add column if not exists modifie_par uuid;
create table if not exists public.partenaires (
  id uuid primary key default gen_random_uuid(), cle text unique not null, nom text not null,
  actif boolean not null default true, adresse_depart text,
  modifie_le timestamptz not null default now());
create table if not exists public.tarifs_partenaires (
  id uuid primary key default gen_random_uuid(),
  partenaire_id uuid not null references public.partenaires(id),
  destination_cle text not null, destination_nom text not null,
  vehicule_cle text not null check (vehicule_cle in ('berline','van')),
  montant_centimes integer not null, actif boolean not null default true,
  modifie_le timestamptz not null default now());
