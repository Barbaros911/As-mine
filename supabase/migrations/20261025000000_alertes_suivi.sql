-- LES ALERTES SE SURVEILLENT ELLES-MÊMES — 25 octobre 2026, P0 (étape 2).
--
-- CE QUE PERSONNE NE VOYAIT. Le voyant de l'admin et le chien de garde
-- jugeaient la relance sur la tâche pg_cron, qui se dit « réussie » dès que
-- l'appel est MIS EN FILE, quelle que soit la réponse de la fonction : une
-- relance qui répond 401 ou 500 à chaque tour (secret désaccordé, fonction
-- cassée par un déploiement) laissait le voyant vert, et plus aucun rappel
-- ne partait. Et la notification ELA — l'alarme, celle qui sonne sur le
-- téléphone — n'était pas surveillée du tout : aucun appareil abonné, ou
-- tous révoqués par l'iPhone, et seul Telegram restait, sans que rien ne le
-- dise.
--
-- 1. LE BATTEMENT DE LA RELANCE. « nouvelle-demande » écrit ici, à la fin de
--    chaque tour de relance mené jusqu'au bout, l'heure et son bilan. Une
--    ligne par nom, réécrite (jamais une pile). Seule la clé de service y
--    écrit ; personne d'autre n'y lit : c'est la mesure ci-dessous qui lit.
--    Avant cette migration, l'écriture échoue sans rien gêner (la fonction
--    ne l'attend pas).
--
-- 2. LA MESURE DU VOYANT GAGNE QUATRE CLÉS : depuis quand la relance n'a pas
--    battu, les notifications ELA parties et ratées dans l'heure, le nombre
--    d'appareils abonnés. Le corps de « ela_sante_mesures » reste À
--    L'IDENTIQUE de .github/scripts/sante-serveur.sql (test-chien-de-garde
--    compare les deux textes) ; admin-sante.js lit ces clés comme
--    FACULTATIVES : un serveur d'avant cette migration ne fait pas passer le
--    voyant au gris.
--
-- 3. LES CHIFFRES DE RÉACTIVITÉ (« ela_reactivite », exploitant connecté) :
--    pour les demandes déposées par le site, la réception ou un client
--    d'hôtel sur la période, le délai médian jusqu'à la première alerte,
--    jusqu'à la vue (le « Vu » ou la confirmation, le premier des deux),
--    jusqu'à la confirmation ; combien vues en 2 min, confirmées en 5 et en
--    15 min ; combien jamais vues ; combien d'alertes en échec. L'heure de
--    départ est celle du SERVEUR (cree_le) ; celle de la confirmation est
--    écrite par l'admin (« confirmeeLe », depuis le 19/10). Aucun nom, aucun
--    téléphone, aucune adresse : des comptes et des secondes.
--
-- À APPLIQUER EN PRODUCTION AUSSITÔT APRÈS LA FUSION (workflow « Appliquer
-- une migration Supabase », ce fichier). Entre les deux, rien ne casse : la
-- fonction écrit son battement dans le vide, le voyant garde ses mesures
-- d'origine. Seul le chien de garde, s'il passe dans l'intervalle, lit
-- sante-serveur.sql tel qu'il est sur main, échoue sur la table absente et
-- ouvre une Issue « réponse illisible » ; elle se ferme seule au passage
-- suivant. Rejouable sans dégât. Dépend de 20261020040000 (registre :
-- ela_registre_instant, ela_registre_essai), appliquée en production le
-- 20/10/2026.
create table if not exists public.ela_battements (
  nom text primary key check (nom ~ '^[a-z_]{2,40}$'),
  le timestamptz not null default now(),
  detail text
);
alter table public.ela_battements enable row level security;
revoke all on public.ela_battements from public, anon, authenticated;
-- Un premier battement, posé ici : sans lui, le voyant dirait « la relance
-- n'a jamais battu » pendant les 20 s qui séparent la migration du premier
-- tour. Une fonction cassée se voit quand même, 5 min plus tard.
insert into public.ela_battements(nom, le, detail)
  values ('relance', now(), 'posé par la migration 20261025000000')
  on conflict (nom) do nothing;

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
     where code < 500 and motif <> 'quota' and cree_le >= now() - interval '1 hour'),
  'relance_ok_s', (
    select round(extract(epoch from now() - b.le)) from public.ela_battements b where b.nom = 'relance'),
  'push_ok_1h', (
    select count(*) from public.journal_notifications_admin
     where canal = 'push' and statut = 'envoye' and cree_le >= now() - interval '1 hour'),
  'push_echecs_1h', (
    select count(*) from public.journal_notifications_admin
     where canal = 'push' and statut in ('echec', 'indisponible', 'aucun_abonne')
       and cree_le >= now() - interval '1 hour'),
  'abonnes_push', (
    select count(*) from public.abonnements_admin where actif)
)
  );
end $f$;
revoke all on function public.ela_sante_mesures() from public, anon, authenticated;

create or replace function public.ela_reactivite(p_periode text default 'semaine')
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_periode text := case when p_periode in ('semaine', 'mois', 'annee') then p_periode else 'semaine' end;
  v_auj date := (now() at time zone 'Europe/Paris')::date;
  v_debut date;
  v_debut_ts timestamptz;
  r jsonb;
begin
  if not coalesce(public.est_exploitant(), false) then
    raise exception 'acces_refuse' using errcode = '42501';
  end if;
  -- Même période que le registre (ela_registre_resume) : semaine, mois ou
  -- année EN COURS, à l'heure de Paris.
  v_debut := case v_periode when 'annee' then date_trunc('year', v_auj)::date
                            when 'mois'  then date_trunc('month', v_auj)::date
                            else date_trunc('week', v_auj)::date end;
  v_debut_ts := v_debut::timestamp at time zone 'Europe/Paris';
  with d as (
    select x.ref,
           coalesce(nullif(x.statut, ''), nullif(x.bon->>'statut', ''), 'attente') as statut,
           x.cree_le as t0,
           public.ela_registre_instant(x.bon->>'confirmeeLe') as t_conf
      from public.courses x
     where coalesce(x.bon->'securite'->>'empreinteDepot', '') <> ''
       and not public.ela_registre_essai(x.bon)
       and x.cree_le >= v_debut_ts
  ),
  j as (
    select d.*,
      (select min(n.cree_le) from public.journal_notifications_admin n
        where n.course_ref = d.ref and n.statut = 'envoye' and n.type_evenement <> 'vue') as t_alerte,
      (select min(n.cree_le) from public.journal_notifications_admin n
        where n.course_ref = d.ref and n.type_evenement = 'vue') as t_vue
      from d
  ),
  -- « Vue » = le premier du « Vu » et de la confirmation (LEAST ignore un
  -- NULL) : une demande confirmée a forcément été vue. Une confirmation datée
  -- par un téléphone en avance ne rend jamais un délai négatif.
  -- PIÈGE : GREATEST IGNORE AUSSI UN NULL — greatest(0, NULL) vaut 0. Sans le
  -- « case », une demande jamais vue comptait « vue en 0 s » (trouvé par
  -- l'épreuve, alertes-suivi-apres.sql).
  k as (
    select j.statut,
           case when j.t_alerte is not null then greatest(0, extract(epoch from (j.t_alerte - j.t0))) end as s_alerte,
           case when coalesce(j.t_vue, j.t_conf) is not null
                then greatest(0, extract(epoch from (least(j.t_vue, j.t_conf) - j.t0))) end as s_vue,
           case when j.t_conf is not null then greatest(0, extract(epoch from (j.t_conf - j.t0))) end as s_conf
      from j
  )
  select jsonb_build_object(
    'periode', v_periode,
    'debut_periode', v_debut,
    'demandes', count(*),
    'alerte_mediane_s', round(percentile_cont(0.5) within group (order by s_alerte) filter (where s_alerte is not null)),
    'vue_mediane_s', round(percentile_cont(0.5) within group (order by s_vue) filter (where s_vue is not null)),
    'confirmation_mediane_s', round(percentile_cont(0.5) within group (order by s_conf) filter (where s_conf is not null)),
    'vues_2min', count(*) filter (where s_vue <= 120),
    'confirmees_5min', count(*) filter (where s_conf <= 300),
    'confirmees_15min', count(*) filter (where s_conf <= 900),
    'jamais_vues', count(*) filter (where s_vue is null),
    'jamais_vues_en_attente', count(*) filter (where s_vue is null and statut = 'attente'),
    'alertes_echec', (select count(*) from public.journal_notifications_admin n
                       where n.cree_le >= v_debut_ts and n.canal in ('telegram', 'push')
                         and n.statut in ('echec', 'indisponible', 'aucun_abonne'))
  ) into r from k;
  return r;
end;
$$;
revoke all on function public.ela_reactivite(text) from public, anon, authenticated;
grant execute on function public.ela_reactivite(text) to authenticated;

-- 4. L'ALERTE D'ESSAI, ÉCRAN VERROUILLÉ. « Tester mes alertes » fait sonner
--    la page ouverte ; il ne prouve rien du téléphone verrouillé, qui est le
--    vrai cas. L'exploitant dépose ici une demande d'essai ; la relance
--    (toutes les 20 s) l'envoie 30 s plus tard, par Telegram et par la
--    notification ELA, comme une vraie alerte — le temps de verrouiller.
--    Une par minute au plus. Rien d'autre n'est écrit : la ligne « essai »
--    des battements porte « demande », puis « fait » une fois envoyée.
create or replace function public.ela_demander_essai_alerte()
returns json language plpgsql security definer
set search_path = public, pg_temp as $f$
declare dernier timestamptz;
begin
  if not public.est_exploitant() then raise exception 'acces_refuse'; end if;
  select b.le into dernier from public.ela_battements b where b.nom = 'essai';
  if dernier is not null and dernier > now() - interval '1 minute' then
    return json_build_object('ok', false, 'raison', 'deja_en_route');
  end if;
  insert into public.ela_battements(nom, le, detail) values ('essai', now(), 'demande')
    on conflict (nom) do update set le = excluded.le, detail = excluded.detail;
  return json_build_object('ok', true, 'dans_s', 30);
end $f$;
revoke all on function public.ela_demander_essai_alerte() from public, anon, authenticated;
grant execute on function public.ela_demander_essai_alerte() to authenticated;

-- Ce que le journal du workflow montre : la NATURE des droits, jamais une
-- donnée.
select has_table_privilege('anon', 'public.ela_battements', 'select') as anon_lit_les_battements,
       has_function_privilege('anon', 'public.ela_reactivite(text)', 'execute') as anon_lit_la_reactivite,
       has_function_privilege('authenticated', 'public.ela_reactivite(text)', 'execute') as exploitant_lit_la_reactivite;
