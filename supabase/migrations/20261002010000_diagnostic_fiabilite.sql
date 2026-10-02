-- =====================================================================
-- DIAGNOSTIC — EST-CE QUE JE REÇOIS BIEN TOUT ? (lecture seule)
-- ---------------------------------------------------------------------
-- 2 octobre 2026, à la demande de Barbaros : le projet démarre le 12, il
-- veut savoir le 10 que tout est en règle. À lancer par le workflow
-- « Appliquer une migration Supabase » avec ce fichier : il ne modifie
-- RIEN, il affiche. AUCUN nom, téléphone ni adresse ne sort — le journal
-- GitHub est public. Seulement des comptes, des références et des secondes.
--
-- Comment lire le résultat (une ligne par question) :
--   demandes_7j            : demandes du site (clients, réceptions) en 7 jours
--   saisies_exploitant_7j  : courses saisies par Barbaros lui-même (jamais
--                            annoncées, c'est voulu)
--   sans_alerte_reussie    : demandes du site de plus de 2 min SANS aucune
--                            alerte réussie → DOIT ÊTRE 0
--   telegram_ok / echec    : annonces Telegram réussies / échouées (7 j)
--   push_ok / push_indispo : annonces notification réussies / « indisponible »
--                            (clés VAPID absentes) ; « aucun_abonne » = clés
--                            posées mais aucun téléphone abonné
--   appareils_push         : téléphones abonnés aux notifications ELA
--   relance_active         : la tâche pg_cron existe et est active
--   derniere_relance_s     : secondes depuis le dernier passage de la relance
--                            → doit rester sous 60
--   relances_echouees_1h   : passages de la relance en échec sur l'heure
--   courses_sans_version   : 0 une fois la migration 20261002000000 appliquée
-- =====================================================================
with demandes as (
  select c.ref, c.cree_le, c.statut,
         (c.bon->'securite'->>'empreinteDepot') is not null as du_site
    from public.courses c
   where c.cree_le >= now() - interval '7 days'
), alertes as (
  select course_ref,
         bool_or(statut = 'envoye') as reussie,
         count(*) filter (where canal = 'telegram' and type_evenement = 'nouvelle_reservation' and statut = 'envoye') as tg_ok,
         count(*) filter (where canal = 'telegram' and type_evenement = 'nouvelle_reservation' and statut = 'echec') as tg_echec,
         count(*) filter (where canal = 'push' and type_evenement = 'nouvelle_reservation' and statut = 'envoye') as push_ok,
         count(*) filter (where canal = 'push' and type_evenement = 'nouvelle_reservation' and statut = 'indisponible') as push_indispo,
         count(*) filter (where canal = 'push' and type_evenement = 'nouvelle_reservation' and statut = 'aucun_abonne') as push_sans_abonne
    from public.journal_notifications_admin
   where cree_le >= now() - interval '7 days'
   group by course_ref
), cron_etat as (
  select j.jobid, j.active,
         (select max(r.end_time) from cron.job_run_details r where r.jobid = j.jobid) as dernier_passage,
         (select count(*) from cron.job_run_details r where r.jobid = j.jobid and r.status <> 'succeeded' and r.start_time >= now() - interval '1 hour') as echecs_1h
    from cron.job j where j.jobname = 'ela-relance-alertes'
)
select 'demandes_7j' as question, count(*) filter (where du_site)::text as reponse from demandes
union all select 'saisies_exploitant_7j', count(*) filter (where not du_site)::text from demandes
union all select 'sans_alerte_reussie (doit être 0)',
  count(*)::text from demandes d left join alertes a on a.course_ref = d.ref
  where d.du_site and d.cree_le < now() - interval '2 minutes' and coalesce(a.reussie, false) = false
union all select 'telegram_ok', coalesce(sum(tg_ok), 0)::text from alertes
union all select 'telegram_echec', coalesce(sum(tg_echec), 0)::text from alertes
union all select 'push_ok', coalesce(sum(push_ok), 0)::text from alertes
union all select 'push_indispo (clés VAPID absentes)', coalesce(sum(push_indispo), 0)::text from alertes
union all select 'push_sans_abonne', coalesce(sum(push_sans_abonne), 0)::text from alertes
union all select 'appareils_push', count(*)::text from public.abonnements_admin where actif
union all select 'relance_active', coalesce((select active::text from cron_etat limit 1), 'ABSENTE')
union all select 'derniere_relance_s', coalesce((select round(extract(epoch from now() - dernier_passage))::text from cron_etat limit 1), 'jamais')
union all select 'relances_echouees_1h', coalesce((select echecs_1h::text from cron_etat limit 1), '-')
union all select 'courses_sans_version', (
  select case when exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'courses' and column_name = 'version')
              then '0' else 'COLONNE ABSENTE — appliquer 20261002000000_courses_version.sql' end);

-- Les demandes du site qui attendent encore une réponse, les plus récentes
-- en tête : référence, âge, et ce que chaque canal a fait. Rien d'autre.
select c.ref,
       round(extract(epoch from now() - c.cree_le) / 60) as age_min,
       (select string_agg(j.canal || ':' || j.type_evenement || ':' || j.statut, ' ' order by j.cree_le)
          from public.journal_notifications_admin j where j.course_ref = c.ref) as alertes
  from public.courses c
 where c.statut = 'attente' and c.cree_le >= now() - interval '7 days'
   and (c.bon->'securite'->>'empreinteDepot') is not null
 order by c.cree_le desc limit 20;
