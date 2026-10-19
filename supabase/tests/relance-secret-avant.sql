-- ============================================================================
-- DÉCOR pour 20261019010000_relance_secret.sql — le PostgreSQL de la CI n'a ni
-- Vault, ni pg_cron, ni pg_net : on pose des doublures qui ENREGISTRENT ce
-- qu'on leur donne, pour relire ensuite ce que la migration a vraiment fait.
-- Le rôle service_role est créé ici avec « bypassrls » (leçon du 19/10 : un
-- rôle est commun à tout le cluster, le premier décor qui le crée fixe ses
-- attributs pour les blocs suivants).
-- ============================================================================
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'service_role')
  then create role service_role bypassrls; end if;
end $$;

create schema vault;
create table vault.decrypted_secrets(id uuid default gen_random_uuid(), name text, decrypted_secret text);
create function vault.create_secret(new_secret text, new_name text default null, new_description text default '', new_key_id uuid default null)
returns uuid language sql as $$ insert into vault.decrypted_secrets(name, decrypted_secret) values (new_name, new_secret) returning id $$;

create schema cron;
create table cron.job(jobid bigserial primary key, jobname text, schedule text, command text, active boolean default true);
create function cron.schedule(n text, s text, c text) returns bigint language sql as $$ insert into cron.job(jobname, schedule, command) values (n, s, c) returning jobid $$;
create function cron.unschedule(j bigint) returns boolean language sql as $$ delete from cron.job where jobid = j returning true $$;
-- La tâche telle que le 30/09 l'a laissée : sans en-tête.
insert into cron.job(jobname, schedule, command) values ('ela-relance-alertes', '20 seconds', 'ancienne commande sans en-tete');

create schema net;
create table net.appels(headers jsonb, body jsonb);
create function net.http_post(url text, headers jsonb, body jsonb, timeout_milliseconds int)
returns bigint language sql as $$ insert into net.appels values (headers, body) returning 1 $$;
