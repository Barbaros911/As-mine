-- ============================================================================
-- LE LIEN D'UN PROSPECT — ÉPREUVES, sur la base des prospects, après
-- 20261014000000 puis 20261015000000 (appliquée deux fois). La fiche papier
-- des hôtels mène à /professionnels/, dont la seule conversion est une demande
-- de démo : « prospects.via » est ce qui la rattache au lien (15/10/2026).
-- Décor : prospects.sql (privilèges par défaut de Supabase, service_role,
-- epreuve.refus). Comptes : …0001 l'admin · …0002 l'agent.
-- ============================================================================

-- ── 1. LA COLONNE EXISTE, AVEC SON FORMAT ────────────────────────────────
do $$ begin
  if not exists (select 1 from information_schema.columns
                  where table_schema = 'public' and table_name = 'prospects' and column_name = 'via') then
    raise exception 'ECHEC V1 : prospects.via absente'; end if;
  if not exists (select 1 from pg_constraint
                  where conrelid = 'public.prospects'::regclass and conname = 'prospects_via_format') then
    raise exception 'ECHEC V1 : le format du lien n''est pas tenu par la base'; end if;
  -- Les droits sont par colonne : lisible par l'admin, par personne d'autre,
  -- écrite par personne depuis le navigateur.
  if has_column_privilege('anon', 'public.prospects', 'via', 'SELECT') then
    raise exception 'ECHEC V1 : anon lit le lien des prospects'; end if;
  if not has_column_privilege('authenticated', 'public.prospects', 'via', 'SELECT') then
    raise exception 'ECHEC V1 : l''admin ne peut pas lire le lien (droit de colonne absent)'; end if;
  if has_column_privilege('authenticated', 'public.prospects', 'via', 'UPDATE')
     or has_column_privilege('authenticated', 'public.prospects', 'via', 'INSERT') then
    raise exception 'ECHEC V1 : un compte connecté peut écrire le lien'; end if;
end $$;

-- ── 2. LA FONCTION (service_role) LE POSE ; LE FORMAT EST REFUSÉ ─────────
set role service_role;
insert into public.prospects (type, etablissement, nom, email, telephone)
values ('hotel', 'Hôtel Exemple Roissy', 'Dupont', 'via@exemple.fr', '+33612345678');
update public.prospects set via = 'fiche-hotels' where email = 'via@exemple.fr';
select epreuve.refus('V2a lien mal formé', 'update public.prospects set via = ''Fiche Hotels'' where email = ''via@exemple.fr''', 'prospects_via_format');
select epreuve.refus('V2b lien trop long', 'update public.prospects set via = repeat(''a'', 41) where email = ''via@exemple.fr''', 'prospects_via_format');
reset role;
do $$ begin
  if (select via from public.prospects where email = 'via@exemple.fr') is distinct from 'fiche-hotels' then
    raise exception 'ECHEC V2 : le lien posé par la fonction n''est pas gardé'; end if;
end $$;

-- ── 3. L'ADMIN LE LIT ET NE LE CHANGE PAS ; L'AGENT ET ANON NE LISENT RIEN ─
set role authenticated;
select set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000001', false);
do $$ begin
  if (select via from public.prospects where email = 'via@exemple.fr') is distinct from 'fiche-hotels' then
    raise exception 'ECHEC V3 : l''admin ne lit pas le lien du prospect'; end if;
end $$;
select epreuve.refus('V3a l''admin réécrit le lien', 'update public.prospects set via = ''autre'' where email = ''via@exemple.fr''', '42501');
select set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000002', false);
do $$ begin
  if exists (select 1 from public.prospects where email = 'via@exemple.fr') then
    raise exception 'ECHEC V3 : l''agent lit un prospect'; end if;
end $$;
select set_config('test.uid', '', false);
reset role;
set role anon;
select epreuve.refus('V3b anon lit les prospects', 'select via from public.prospects', '42501');
reset role;

select 'LIEN DES PROSPECTS : toutes les épreuves passent' as resultat;
