-- SOCLE MINIMAL pour eprouver une migration sur un PostgreSQL vide.
-- Il ne recopie QUE ce dont la migration testee depend -- pas tout le schema :
-- un socle qui duplique le schema reel finit par en diverger, et c'est alors le
-- socle qu'on eprouve, plus la migration.
create table if not exists public.chauffeurs(
  id uuid primary key default gen_random_uuid(),
  nom_affiche text not null,
  telephone_whatsapp text not null,
  entreprise text, siret text, carte_vtc text, registre_exploitant text,
  rc_pro_reference text,
  vehicule jsonb not null default '{}'::jsonb,
  documents jsonb not null default '{}'::jsonb,
  statut text not null default 'a_verifier'
    check (statut in ('valide','a_renouveler','bloque','a_verifier')),
  actif boolean not null default true,
  cree_le timestamptz not null default now(),
  modifie_le timestamptz not null default now());

create table if not exists public.courses(ref text primary key, statut text, bon jsonb);

-- Depuis que la migration redefinit les deux RPC d'attribution, le socle doit
-- porter ce qu'elles ECRIVENT : sans ces tables l'appel echouerait sur une
-- relation manquante, et on croirait avoir eprouve la regle alors qu'on n'a
-- eprouve que le socle.
create table if not exists public.attributions_chauffeur(
  course_ref text primary key references public.courses(ref) on delete restrict,
  chauffeur_id uuid not null references public.chauffeurs(id) on delete restrict,
  montant_chauffeur_centimes integer,
  statut text not null default 'active' check (statut in ('active','retiree')),
  attribue_le timestamptz not null default now(),
  retire_le timestamptz,
  modifie_le timestamptz not null default now(),
  modifie_par uuid);

create table if not exists public.evenements_reservation(
  id bigint generated always as identity primary key,
  course_ref text not null,
  type_evenement text not null,
  acteur_type text not null default 'systeme',
  acteur_id uuid,
  donnees jsonb not null default '{}'::jsonb,
  cree_le timestamptz not null default now());

create table if not exists public.snapshots_financiers(
  course_ref text primary key,
  montant_chauffeur_centimes integer);

create table if not exists public.actions_requises(
  id bigint generated always as identity primary key,
  course_ref text, type_action text not null,
  priorite smallint not null default 50 check (priorite between 0 and 100),
  statut text not null default 'ouverte'
    check (statut in ('ouverte','resolue','ignoree')),
  echeance timestamptz,
  donnees jsonb not null default '{}'::jsonb,
  cree_le timestamptz not null default now(),
  resolue_le timestamptz,
  unique(course_ref, type_action, statut));
create unique index if not exists actions_requises_ouverte
  on public.actions_requises(course_ref,type_action) where statut='ouverte';

-- La migration appelle est_exploitant() ; hors Supabase on la rend vraie.
-- ELLE EST REGLABLE : une RPC qui refuserait TOUT rendrait le meme message
-- qu'une RPC qui refuse le bon chauffeur, et le test passerait au vert sans
-- avoir rien eprouve. Un bloc l'eteint expres pour lever ce doute.
create table if not exists public.socle_reglages(exploitant boolean not null default true);
insert into public.socle_reglages(exploitant)
  select true where not exists(select 1 from public.socle_reglages);
create or replace function public.est_exploitant() returns boolean
  language sql as $$ select coalesce((select exploitant from public.socle_reglages limit 1), true) $$;

-- auth.uid() n'existe pas hors Supabase ; les deux RPC l'ecrivent en acteur.
create schema if not exists auth;
create or replace function auth.uid() returns uuid
  language sql stable as $$ select null::uuid $$;
-- Les deux roles Supabase. « anon » n'est pas decoratif ici : la migration
-- lui retire l'execution des RPC, et le test verifie qu'il ne l'a pas.
do $$ begin
  if not exists (select 1 from pg_roles where rolname='authenticated')
  then create role authenticated; end if;
  if not exists (select 1 from pg_roles where rolname='anon')
  then create role anon; end if;
end $$;
