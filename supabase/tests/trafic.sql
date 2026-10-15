-- ============================================================================
-- LA MESURE DU TRAFIC (15 octobre 2026) — LE DÉCOR, posé AVANT la migration.
-- Ordre : socle.sql, role-agent-avant.sql, la vraie est_admin(), mesure.sql
-- (privilèges par défaut de Supabase, epreuve.refus), le compteur
-- 20261014000000, les liens 20261015000000, CE fichier, puis la migration
-- DEUX fois et trafic-apres.sql.
-- On ajoute ce que mesure.sql ne pose pas : le rôle service_role de Supabase
-- (la fonction « mesure » écrit avec lui), avec les mêmes privilèges par
-- défaut que la vraie base. Sans lui, « écrire avec la clé de service » ne
-- s'éprouverait pas.
-- ============================================================================
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'service_role')
  then create role service_role bypassrls; end if;
end $$;
grant usage on schema public, auth, epreuve to service_role;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant execute on functions to service_role;
grant execute on all functions in schema epreuve to service_role;
-- Un lien de partenaire existant, pour éprouver qu'il est reconnu.
insert into public.liens_suivi (code, nom) values ('hotel-exemple', 'Hôtel d''exemple') on conflict do nothing;
