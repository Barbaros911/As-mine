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
create table if not exists public.attributions_chauffeur(course_ref text, statut text);

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
create or replace function public.est_exploitant() returns boolean
  language sql as $$ select true $$;
do $$ begin
  if not exists (select 1 from pg_roles where rolname='authenticated')
  then create role authenticated; end if;
end $$;
