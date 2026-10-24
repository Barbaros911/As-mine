-- ============================================================================
-- LES DONNÉES MÉTIER SUR LE SERVEUR — le décor, AVANT la migration (24/10/2026)
-- Posé APRÈS double-verification-avant.sql et 20261024000000 (les portes avec
-- le niveau de session) et 20261002000000 (la version des courses).
-- On repose l'état « Admin v2 » tel que le dépôt le décrit : la table
-- « chauffeurs » écrite par tout opérateur, un compteur de factures déjà
-- avancé et une facture F-AAAA-0002 émise par Admin v2 — pour exiger que la
-- migration ne remette RIEN à zéro et ne fasse entrer aucune collision.
-- Plus les privilèges par défaut de Supabase (toute table neuve est ouverte
-- à anon et authenticated tant qu'on ne les retire pas).
-- ============================================================================
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
grant all on all tables in schema public to authenticated;

create table if not exists public.parametres_commerciaux(
  cle text primary key, valeur jsonb not null, actif boolean not null default true,
  date_effet timestamptz not null default now(), modifie_le timestamptz not null default now());
alter table public.parametres_commerciaux enable row level security;
grant select, insert, update, delete on public.parametres_commerciaux to authenticated;
create policy "admin ela lecture" on public.parametres_commerciaux for select to authenticated using ((select public.est_exploitant()));
create policy "admin ela insertion" on public.parametres_commerciaux for insert to authenticated with check ((select public.est_admin()));
create policy "admin ela modification" on public.parametres_commerciaux for update to authenticated using ((select public.est_admin())) with check ((select public.est_admin()));

create table public.chauffeurs (
  id uuid primary key default gen_random_uuid(),
  nom_affiche text not null, telephone_whatsapp text not null,
  entreprise text, siret text, carte_vtc text, registre_exploitant text, rc_pro_reference text,
  vehicule jsonb not null default '{}'::jsonb, documents jsonb not null default '{}'::jsonb,
  statut text not null default 'a_verifier', actif boolean not null default true,
  cree_le timestamptz not null default now(), modifie_le timestamptz not null default now(),
  carte_vtc_fin date, registre_fin date, assurance_fin date, adresse text,
  taux_commission numeric(5,2));
alter table public.chauffeurs enable row level security;
grant select, insert, update, delete on public.chauffeurs to authenticated;
create policy "admin ela lecture" on public.chauffeurs for select to authenticated using ((select public.est_exploitant()));
create policy "admin ela insertion" on public.chauffeurs for insert to authenticated with check ((select public.est_exploitant()));
create policy "admin ela modification" on public.chauffeurs for update to authenticated using ((select public.est_exploitant())) with check ((select public.est_exploitant()));
create policy "admin ela suppression" on public.chauffeurs for delete to authenticated using ((select public.est_exploitant()));
insert into public.chauffeurs(id, nom_affiche, telephone_whatsapp)
  values ('11111111-1111-1111-1111-111111111111', 'Chauffeur Admin v2', '+33611111111');

create table public.compteur_factures(annee integer primary key, rang integer not null default 0 check (rang >= 0));
create table public.factures_commission(
  num text primary key, chauffeur_id uuid not null references public.chauffeurs(id),
  periode_du date not null, periode_au date not null, emetteur jsonb not null, client jsonb not null,
  lignes jsonb not null, ht numeric(12,2) not null, taux_tva numeric(5,2) not null default 0,
  tva numeric(12,2) not null default 0, ttc numeric(12,2) not null,
  emise_le timestamptz not null default now(), emise_par uuid);
alter table public.compteur_factures enable row level security;
alter table public.factures_commission enable row level security;
create policy factures_lecture_exploitant on public.factures_commission for select to authenticated using ((select public.est_admin()));
-- L'année de Paris, comme le serveur : le décor ne vieillit pas.
insert into public.compteur_factures
  values (extract(year from (now() at time zone 'Europe/Paris'))::int, 2);
insert into public.factures_commission(num, chauffeur_id, periode_du, periode_au, emetteur, client, lignes, ht, ttc)
  select 'F-' || extract(year from (now() at time zone 'Europe/Paris'))::int || '-0002',
         '11111111-1111-1111-1111-111111111111', '2026-09-01', '2026-09-30',
         '{"nom":"Elatransfer"}', '{"id":"11111111-1111-1111-1111-111111111111","nom":"Chauffeur Admin v2"}',
         '[]', 10, 10;

-- Les courses : réalisées, une en attente, une d'essai.
update public.courses set statut = 'realisee', bon = '{"prix":{"total":100}}' where ref = 'ELA-26-10-AAAAA';
insert into public.courses(ref, statut, bon) values
  ('ELA-26-10-R0001', 'realisee', '{"prix":{"total":100}}'),
  ('ELA-26-10-R0002', 'realisee', '{"prix":{"total":200}}'),
  ('ELA-26-10-R0003', 'attente',  '{"prix":{"total":50}}'),
  ('ELA-26-10-R0004', 'realisee', '{"prix":{"total":80}}'),
  ('ELA-26-10-R0005', 'realisee', '{"prix":{"total":90}}'),
  ('ELA-26-10-R0006', 'realisee', '{"prix":{"total":60},"essai":true}'),
  ('ELA-26-10-R0007', 'realisee', '{"prix":{"total":70}}'),
  ('ELA-26-10-R0008', 'realisee', '{"prix":{"total":40}}'),
  ('ELA-26-10-R0009', 'realisee', '{"prix":{"total":40}}');

-- LE TROU, DANS SA PART SERVEUR : un agent écrit le carnet (et son taux).
select public.essai_jeton('aaaaaaaa-0000-0000-0000-000000000002', 'aal2');
set role authenticated;
do $$ begin
  update public.chauffeurs set taux_commission = 50 where id = '11111111-1111-1111-1111-111111111111';
  if not found then raise exception 'DÉCOR FAUX : avant la migration, l''agent devrait pouvoir écrire le carnet'; end if;
end $$;
reset role;
update public.chauffeurs set taux_commission = null;
select 'décor des données métier posé (l''agent écrit le carnet : le trou est reproduit)' as etat;
