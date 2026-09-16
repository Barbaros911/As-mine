-- Socle Admin ELA v2 (#165 / #173)
-- Aucun de ces objets n'est lisible par anon. L'accès direct est réservé aux
-- comptes authentifiés présents dans public.operateurs via est_exploitant().

create table if not exists public.parametres_commerciaux (
  cle text primary key,
  valeur jsonb not null,
  actif boolean not null default true,
  date_effet timestamptz not null default now(),
  modifie_le timestamptz not null default now(),
  modifie_par uuid default auth.uid()
);

create table if not exists public.partenaires (
  id uuid primary key default gen_random_uuid(),
  cle text unique not null,
  nom text not null,
  actif boolean not null default true,
  adresse_depart text,
  configuration jsonb not null default '{}'::jsonb,
  cree_le timestamptz not null default now(),
  modifie_le timestamptz not null default now()
);

create table if not exists public.tarifs_partenaires (
  id uuid primary key default gen_random_uuid(),
  partenaire_id uuid not null references public.partenaires(id) on delete restrict,
  destination_cle text not null,
  destination_nom text not null,
  vehicule_cle text not null check (vehicule_cle in ('berline','van')),
  montant_centimes integer not null check (montant_centimes >= 0 and montant_centimes <= 500000),
  actif boolean not null default true,
  date_effet timestamptz not null default now(),
  cree_le timestamptz not null default now(),
  modifie_le timestamptz not null default now(),
  unique(partenaire_id, destination_cle, vehicule_cle, date_effet)
);

create table if not exists public.chauffeurs (
  id uuid primary key default gen_random_uuid(),
  nom_affiche text not null,
  telephone_whatsapp text not null,
  entreprise text,
  siret text,
  carte_vtc text,
  registre_exploitant text,
  rc_pro_reference text,
  vehicule jsonb not null default '{}'::jsonb,
  documents jsonb not null default '{}'::jsonb,
  statut text not null default 'a_verifier' check (statut in ('valide','a_renouveler','bloque','a_verifier')),
  actif boolean not null default true,
  cree_le timestamptz not null default now(),
  modifie_le timestamptz not null default now()
);

create table if not exists public.codes_promo (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  libelle_interne text,
  beneficiaire text,
  type_remise text not null check (type_remise in ('pourcentage','montant')),
  valeur numeric(10,2) not null check (valeur > 0),
  debut timestamptz,
  fin timestamptz,
  actif boolean not null default true,
  utilisations_max integer check (utilisations_max is null or utilisations_max > 0),
  limite_par_client integer check (limite_par_client is null or limite_par_client > 0),
  montant_min_centimes integer check (montant_min_centimes is null or montant_min_centimes >= 0),
  portee jsonb not null default '{}'::jsonb,
  cree_le timestamptz not null default now(),
  modifie_le timestamptz not null default now(),
  check (fin is null or debut is null or fin > debut),
  check ((type_remise='pourcentage' and valeur <= 100) or type_remise='montant')
);

create table if not exists public.evenements_reservation (
  id bigint generated always as identity primary key,
  course_ref text not null,
  type_evenement text not null,
  acteur_type text not null default 'systeme',
  acteur_id uuid,
  donnees jsonb not null default '{}'::jsonb,
  cree_le timestamptz not null default now()
);
create index if not exists evenements_reservation_ref_date on public.evenements_reservation(course_ref, cree_le desc);

create table if not exists public.actions_requises (
  id bigint generated always as identity primary key,
  course_ref text,
  type_action text not null,
  priorite smallint not null default 50 check (priorite between 0 and 100),
  statut text not null default 'ouverte' check (statut in ('ouverte','resolue','ignoree')),
  echeance timestamptz,
  donnees jsonb not null default '{}'::jsonb,
  cree_le timestamptz not null default now(),
  resolue_le timestamptz,
  unique(course_ref, type_action, statut)
);
create index if not exists actions_requises_ouvertes on public.actions_requises(statut, priorite desc, echeance asc);

-- 20 % est la valeur de lancement explicitement validée. Cette ligne ne
-- modifie aucun prix existant : elle devient la valeur centrale à consommer
-- par le futur moteur/Admin, avec snapshot au moment de la réservation.
insert into public.parametres_commerciaux(cle,valeur)
values ('commission_ela_defaut', '{"pourcentage":20}'::jsonb)
on conflict (cle) do nothing;

alter table public.parametres_commerciaux enable row level security;
alter table public.partenaires enable row level security;
alter table public.tarifs_partenaires enable row level security;
alter table public.chauffeurs enable row level security;
alter table public.codes_promo enable row level security;
alter table public.evenements_reservation enable row level security;
alter table public.actions_requises enable row level security;

revoke all on public.parametres_commerciaux, public.partenaires, public.tarifs_partenaires, public.chauffeurs, public.codes_promo, public.evenements_reservation, public.actions_requises from anon;

do $$
declare t text;
begin
  foreach t in array array['parametres_commerciaux','partenaires','tarifs_partenaires','chauffeurs','codes_promo','evenements_reservation','actions_requises'] loop
    execute format('drop policy if exists "admin ela lecture" on public.%I', t);
    execute format('drop policy if exists "admin ela insertion" on public.%I', t);
    execute format('drop policy if exists "admin ela modification" on public.%I', t);
    execute format('drop policy if exists "admin ela suppression" on public.%I', t);
    execute format('create policy "admin ela lecture" on public.%I for select to authenticated using ((select public.est_exploitant()))', t);
    execute format('create policy "admin ela insertion" on public.%I for insert to authenticated with check ((select public.est_exploitant()))', t);
    execute format('create policy "admin ela modification" on public.%I for update to authenticated using ((select public.est_exploitant())) with check ((select public.est_exploitant()))', t);
    execute format('create policy "admin ela suppression" on public.%I for delete to authenticated using ((select public.est_exploitant()))', t);
  end loop;
end $$;

-- L'historique de réservation est append-only depuis l'Admin : on retire
-- volontairement UPDATE/DELETE malgré les policies génériques ci-dessus.
drop policy if exists "admin ela modification" on public.evenements_reservation;
drop policy if exists "admin ela suppression" on public.evenements_reservation;

comment on table public.evenements_reservation is 'Timeline append-only des réservations ELA ; aucun secret bancaire ni document chauffeur.';
comment on table public.actions_requises is 'File opérationnelle des interventions à traiter dans l Admin ELA.';
