-- LE JOURNAL DES DÉPÔTS REFUSÉS — 9 octobre 2026, audit avant l'exploitation.
--
-- CE QUE PERSONNE NE VOYAIT. « deposer-course » rend 400, 401, 403, 409, 413,
-- 429 ou 503 et c'est tout : le client lit « votre demande n'a pas pu nous
-- être transmise », et personne d'autre ne l'apprend. Le voyant de l'admin et
-- le chien de garde ne surveillent que la chaîne d'alerte APRÈS l'écriture
-- d'une course ; une demande refusée AVANT n'existe nulle part. Une fonction
-- cassée par un déploiement, un plafond saturé par le wifi d'un hôtel : des
-- clients perdus sans un signal — exactement la panne invisible qui dure.
--
-- UNE TABLE À PART, PAS LE JOURNAL DES ALERTES. « journal_notifications_admin »
-- n'accepte que les canaux push, telegram et email (contrainte CHECK) : un
-- dépôt refusé n'est pas une notification, et desserrer cette contrainte
-- obligerait à la retrouver par son nom en production. Ici : le code HTTP,
-- le motif (liste fermée), la référence si elle est lisible, la clé du
-- partenaire. JAMAIS le nom, le téléphone, l'adresse ni l'adresse IP.
--
-- QUI ÉCRIT, QUI LIT. Seule la fonction « deposer-course » écrit, avec la clé
-- de service (qui garde ses droits : « revoke » ne vise qu'anon et
-- authenticated). Un exploitant connecté peut lire — pour un écran de
-- l'admin, un jour ; aujourd'hui, c'est la mesure ci-dessous qui lit.
--
-- LA MESURE DU VOYANT GAGNE TROIS CLÉS, et le corps de « ela_sante_mesures »
-- reste À L'IDENTIQUE de .github/scripts/sante-serveur.sql :
-- test-chien-de-garde.mjs compare les deux textes. Les clés sont lues comme
-- FACULTATIVES par admin-sante.js : un serveur d'avant cette migration ne
-- fait pas passer le voyant au gris.
--
-- À APPLIQUER EN PRODUCTION AVANT DE FUSIONNER (workflow « Appliquer une
-- migration Supabase », ce fichier) : le chien de garde lit sante-serveur.sql
-- tel qu'il est sur main — sans la table, sa requête échoue et il ouvre une
-- Issue « réponse illisible » à chaque passage. Rejouable sans dégât.
create table if not exists public.journal_depots (
  id bigint generated always as identity primary key,
  ref text,
  code integer not null check (code between 400 and 599),
  motif text not null check (motif in ('invalide','origine','session','taille','quota','reference','indisponible')),
  provenance_cle text,
  par_reception boolean not null default false,
  cree_le timestamptz not null default now()
);
create index if not exists journal_depots_cree_le_idx on public.journal_depots (cree_le desc);

alter table public.journal_depots enable row level security;
revoke all on public.journal_depots from public, anon, authenticated;
grant select on public.journal_depots to authenticated;
drop policy if exists "exploitant lit journal depots" on public.journal_depots;
create policy "exploitant lit journal depots" on public.journal_depots
  for select to authenticated using ((select public.est_exploitant()));

-- Un droit qui survivrait pour anon, ou une écriture pour authenticated,
-- arrête la migration ici : même ceinture que pilotage et prospects.
do $$
begin
  if has_table_privilege('anon', 'public.journal_depots', 'select')
     or has_table_privilege('anon', 'public.journal_depots', 'insert')
     or has_table_privilege('authenticated', 'public.journal_depots', 'insert')
     or has_table_privilege('authenticated', 'public.journal_depots', 'update')
     or has_table_privilege('authenticated', 'public.journal_depots', 'delete') then
    raise exception 'journal_depots : un droit survit pour anon ou authenticated';
  end if;
end $$;

-- LE CORPS CI-DESSOUS EST CELUI DE .github/scripts/sante-serveur.sql, à
-- l'identique (voir 20261004010000_sante_alertes.sql pour le pourquoi de
-- chaque mesure et de « security definer » / « plpgsql »).
create or replace function public.ela_sante_mesures()
returns json language plpgsql stable security definer
set search_path = public, pg_temp as $f$
begin
  return (
select json_build_object(
  'sans_alerte', (
    select count(*) from public.courses c
     where c.statut = 'attente'
       and (c.bon->'securite'->>'empreinteDepot') is not null
       and c.cree_le between now() - interval '6 hours' and now() - interval '2 minutes'
       and not exists (select 1 from public.journal_notifications_admin j
                        where j.course_ref = c.ref and j.statut = 'envoye')),
  'relance_active', coalesce((select active from cron.job where jobname = 'ela-relance-alertes'), false),
  'derniere_relance_s', (
    select round(extract(epoch from now() - max(r.end_time)))
      from cron.job j join cron.job_run_details r on r.jobid = j.jobid
     where j.jobname = 'ela-relance-alertes'),
  'relances_echouees_15min', (
    select count(*) from cron.job j join cron.job_run_details r on r.jobid = j.jobid
     where j.jobname = 'ela-relance-alertes' and r.status <> 'succeeded'
       and r.start_time >= now() - interval '15 minutes'),
  'telegram_echecs_1h', (
    select count(*) from public.journal_notifications_admin
     where canal = 'telegram' and statut in ('echec', 'indisponible') and cree_le >= now() - interval '1 hour'),
  'telegram_ok_1h', (
    select count(*) from public.journal_notifications_admin
     where canal = 'telegram' and statut = 'envoye' and type_evenement <> 'vue'
       and cree_le >= now() - interval '1 hour'),
  'demandes_24h', (
    select count(*) from public.courses
     where cree_le >= now() - interval '24 hours'
       and (bon->'securite'->>'empreinteDepot') is not null),
  'depots_indisponibles_1h', (
    select count(*) from public.journal_depots
     where code >= 500 and cree_le >= now() - interval '1 hour'),
  'depots_quota_1h', (
    select count(*) from public.journal_depots
     where motif = 'quota' and cree_le >= now() - interval '1 hour'),
  'depots_refuses_1h', (
    select count(*) from public.journal_depots
     where code < 500 and motif <> 'quota' and cree_le >= now() - interval '1 hour')
)
  );
end $f$;
revoke all on function public.ela_sante_mesures() from public, anon, authenticated;
