-- =====================================================================
-- LE REGISTRE COMPTE SUR LE SERVEUR — PLUS DE PLAFOND À 1 000 COURSES
-- 20 octobre 2026 — mission de finalisation (Barbaros : « Elatransfer doit
-- pouvoir fonctionner proprement avec des dizaines de milliers de courses »).
-- ---------------------------------------------------------------------
-- LE DÉFAUT. Le Registre de l'admin calculait tout — semaine, résultat par
-- période, chauffeurs, provenance, délai, liens des partenaires — sur la
-- copie de l'appareil, qui ne garde que les 1 000 courses les plus
-- récentes (« #registreTronque » le disait depuis le 19/10). À cent
-- demandes par jour, dix jours : le mois et l'année devenaient faux.
--
-- CE QUE POSE CETTE MIGRATION, en lecture seule sur les données :
--   - ela_registre_resume(periode)  : les chiffres du Registre, agrégés
--     ici, sur TOUTES les courses (admin seul : c'est de l'argent) ;
--   - ela_registre_courses(…)       : recherche, filtres (statut,
--     chauffeur, source, dates), pagination et VRAI total (exploitant) ;
--   - ela_liens_resultats(jours)    : par lien de partenaire, demandes,
--     confirmées, réalisées et argent — comptés sur les courses, dont le
--     code « via » n'est écrit QUE par deposer-course après l'avoir trouvé
--     dans liens_suivi (admin seul).
-- Les règles sont celles de l'écran, reprises à l'identique : une course
-- d'essai ne compte pas ; l'argent ne compte que les « realisee », à la date
-- de la COURSE (sinon celle de la demande) ; la semaine commence le lundi,
-- heure de Paris ; la commission est celle posée sur la course, sinon celle
-- figée au passage en « réalisée » — une commission qui ne vivrait que dans
-- le carnet de l'appareil n'est pas devinée ici : elle est COMPTÉE à part
-- (« sans_commission »), jamais mise à zéro en silence.
--
-- AUCUN INDEX, ET C'EST MESURÉ (PostgreSQL 16 local). À 25 000 courses :
-- résumé 0,2 s, recherche par texte 0,5 s, filtres 0,04 à 0,2 s. À 100 000 :
-- résumé 0,8 s, filtres 0,2 à 0,5 s, recherche par texte 2,1 s. La
-- production en compte quelques centaines. Le jour où la recherche par texte
-- gêne (au-delà de 50 000 courses), le geste est une colonne de recherche
-- calculée et un index trigramme (pg_trgm) — pas avant : un index pèse sur
-- chaque écriture, et la relance des alertes écrit souvent.
--
-- À APPLIQUER EN PRODUCTION APRÈS LA FUSION (workflow « Appliquer une
-- migration Supabase », ce fichier). Rejouable. Tant qu'elle ne l'est pas,
-- l'admin garde son calcul sur l'appareil et le DIT (#registreTronque).
-- RETOUR ARRIÈRE : drop des dix fonctions ci-dessous.
-- Épreuve : supabase/tests/registre-serveur.sql.
-- =====================================================================

do $$ begin
  if to_regprocedure('public.est_admin()') is null or to_regprocedure('public.est_exploitant()') is null then
    raise exception 'est_admin() / est_exploitant() absentes : appliquer d''abord 20260929030000_role_agent_serveur.sql';
  end if;
end $$;

-- ── LES RÈGLES DE L'ÉCRAN, EN SQL ───────────────────────────────────────
-- CES OUTILS N'ONT PAS DE « set search_path », ET C'EST VOULU : une fonction
-- SQL qui en porte un n'est plus dépliée dans la requête, et PostgreSQL
-- sauve puis restaure le réglage à CHAQUE appel. Mesuré sur 25 000 courses :
-- le résumé passait de 0,3 s à 1,1 s. Ils ne sont ni « security definer » ni
-- exposés (aucun droit d'exécution), n'appellent que pg_catalog et des noms
-- qualifiés « public. », et ne tournent que dans les trois fonctions
-- ci-dessous, qui fixent elles-mêmes leur search_path.
-- « sansAccents » de la page : minuscules, œ/æ défaits, accents retirés.
create or replace function public.ela_sans_accents(p text) returns text
language sql immutable parallel safe
as $$
  select btrim(translate(replace(replace(lower(coalesce(p, '')), 'œ', 'oe'), 'æ', 'ae'),
    'àáâãäåāăąçćčďèéêëēĕėęěìíîïĩīĭįñńňòóôõöōŏőŕřśšşťùúûüũūŭůűųýÿžźż',
    'aaaaaaaaacccdeeeeeeeeeiiiiiiiinnnoooooooorrssstuuuuuuuuuuyyzzz'))
$$;

-- Une date AAAA-MM-JJ VALIDE, sinon NULL — sans bloc d'exception : une
-- exception ouvre une sous-transaction à chaque ligne, et elle est INTERDITE
-- sous un plan parallèle (« cannot start subtransactions during a parallel
-- operation », mesuré sur 25 000 courses). Les CASE emboîtés gardent l'ordre :
-- on ne convertit un morceau qu'après avoir vérifié qu'il en est un.
create or replace function public.ela_registre_jour(s text) returns date
language sql immutable parallel safe
as $$
  select case when s ~ '^[1-9][0-9]{3}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$' then
    case when substr(s, 9, 2)::int <= extract(day from (make_date(substr(s, 1, 4)::int, substr(s, 6, 2)::int, 1)
                                                         + interval '1 month' - interval '1 day'))::int
         then s::date end end
$$;

-- « dateCourse » : la date de la course, sinon celle de la demande. Une
-- date illisible rend NULL au lieu de faire tomber tout le Registre.
create or replace function public.ela_registre_date(p_bon jsonb) returns date
language sql immutable parallel safe
as $$
  select public.ela_registre_jour(coalesce(nullif(p_bon->'course'->>'date', ''), left(coalesce(p_bon->>'cree', ''), 10)))
$$;

-- Un horodatage ISO écrit dans le bon (« cree », « confirmeeLe »), même règle.
create or replace function public.ela_registre_instant(p text) returns timestamptz
language sql stable parallel safe
as $$
  select case when p ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}[T ]([01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9](\.[0-9]{1,6})?)?(Z|[+-][0-9]{2}(:?[0-9]{2})?)?$' then
    case when public.ela_registre_jour(left(p, 10)) is not null then p::timestamptz end end
$$;

create or replace function public.ela_registre_nombre(p jsonb) returns numeric
language sql immutable parallel safe
as $$
  select case
    when jsonb_typeof(p) = 'number' then (p #>> '{}')::numeric
    when jsonb_typeof(p) = 'string' and btrim(p #>> '{}') ~ '^-?[0-9]+(\.[0-9]+)?$' then btrim(p #>> '{}')::numeric
  end
$$;

-- « comptable » : une course d'essai ne compte nulle part.
create or replace function public.ela_registre_essai(p_bon jsonb) returns boolean
language sql immutable parallel safe
as $$
  select case jsonb_typeof(p_bon->'essai')
    when 'boolean' then (p_bon->>'essai')::boolean
    when 'number'  then (p_bon->>'essai')::numeric <> 0
    when 'string'  then (p_bon->>'essai') <> ''
    else false end
$$;

-- « commissionDe », sans le carnet de l'appareil : la commission posée sur
-- la course, sinon celle figée au passage en « réalisée ». NULL = inconnue
-- ici (elle dépendrait d'un taux qui ne vit que sur le téléphone).
create or replace function public.ela_registre_commission(p_bon jsonb, p_statut text) returns numeric
language sql immutable parallel safe
as $$
  select case
    when public.ela_registre_nombre(p_bon->'commission'->'valeur') >= 0 then
      case when p_bon->'commission'->>'mode' = 'eur'
        then least(coalesce(public.ela_registre_nombre(p_bon->'prix'->'total'), 0),
                   round(public.ela_registre_nombre(p_bon->'commission'->'valeur'), 2))
        else round(coalesce(public.ela_registre_nombre(p_bon->'prix'->'total'), 0)
                   * public.ela_registre_nombre(p_bon->'commission'->'valeur')) / 100 end
    when p_statut = 'realisee' and public.ela_registre_nombre(p_bon->'commissionFigee'->'montant') is not null
      then public.ela_registre_nombre(p_bon->'commissionFigee'->'montant')
  end
$$;

revoke all on function public.ela_sans_accents(text) from public, anon, authenticated;
revoke all on function public.ela_registre_jour(text) from public, anon, authenticated;
revoke all on function public.ela_registre_date(jsonb) from public, anon, authenticated;
revoke all on function public.ela_registre_instant(text) from public, anon, authenticated;
revoke all on function public.ela_registre_nombre(jsonb) from public, anon, authenticated;
revoke all on function public.ela_registre_essai(jsonb) from public, anon, authenticated;
revoke all on function public.ela_registre_commission(jsonb, text) from public, anon, authenticated;

-- ── LES CHIFFRES DU REGISTRE (ADMIN SEUL) ───────────────────────────────
create or replace function public.ela_registre_resume(p_periode text default 'semaine')
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_periode text := case when p_periode in ('semaine', 'mois', 'annee') then p_periode else 'semaine' end;
  v_auj date := (now() at time zone 'Europe/Paris')::date;
  v_l0 date := date_trunc('week', v_auj)::date;
  v_debut date;
  v_debut_ts timestamptz;
  r jsonb;
begin
  if not coalesce(public.est_admin(), false) then
    raise exception 'registre réservé à l''admin' using errcode = '42501';
  end if;
  v_debut := case v_periode when 'annee' then date_trunc('year', v_auj)::date
                            when 'mois'  then date_trunc('month', v_auj)::date
                            else v_l0 end;
  v_debut_ts := v_debut::timestamp at time zone 'Europe/Paris';

  with c as (
    select x.ref, x.bon, x.cree_le,
           coalesce(nullif(x.statut, ''), nullif(x.bon->>'statut', ''), 'attente') as statut,
           public.ela_registre_date(x.bon) as d,
           coalesce(public.ela_registre_nombre(x.bon->'prix'->'total'), 0) as prix,
           btrim(coalesce(x.bon->'chauffeur'->>'nom', '')) as chauffeur,
           btrim(coalesce(x.bon->>'provenance', '')) as provenance
      from public.courses x
     where not public.ela_registre_essai(x.bon)
  ),
  f as (select c.*, public.ela_registre_commission(c.bon, c.statut) as com from c where c.statut = 'realisee'),
  dl as (
    select c.ref, c.bon, c.statut,
           coalesce(public.ela_registre_instant(c.bon->>'cree'), c.cree_le) as t0,
           public.ela_registre_instant(c.bon->>'confirmeeLe') as t1
      from c
     where coalesce(c.bon->'securite'->>'empreinteDepot', '') <> ''
  ),
  dlp as (
    select dl.*, greatest(0, extract(epoch from (dl.t1 - dl.t0)) * 1000)::bigint as ms
      from dl where dl.t0 >= v_debut_ts
  )
  select jsonb_build_object(
    'genere', now(),
    'periode', v_periode,
    'debut_periode', v_debut,
    'total', (select count(*) from c),
    'par_statut', (select coalesce(jsonb_object_agg(s.statut, s.n), '{}'::jsonb)
                     from (select statut, count(*) as n from c group by statut) s),
    'semaine', (select jsonb_build_object('n', count(*), 'total', coalesce(sum(prix), 0)) from f where d >= v_l0),
    'semaine_avant', (select jsonb_build_object('n', count(*), 'total', coalesce(sum(prix), 0))
                        from f where d >= v_l0 - 7 and d < v_l0),
    'periodes', (select coalesce(jsonb_agg(jsonb_build_object('cle', p.cle, 'n', p.n, 'total', p.total) order by p.cle desc), '[]'::jsonb)
                   from (select case v_periode when 'annee' then to_char(d, 'YYYY')
                                               when 'mois'  then to_char(d, 'YYYY-MM')
                                               else to_char(date_trunc('week', d), 'YYYY-MM-DD') end as cle,
                                count(*) as n, sum(prix) as total
                           from f where d is not null group by 1 order by 1 desc limit 12) p),
    'chauffeurs', (select coalesce(jsonb_agg(jsonb_build_object('nom', q.nom, 'n', q.n, 'total', q.total,
                                    'commission', q.commission, 'sans_commission', q.sans) order by q.total desc, q.nom), '[]'::jsonb)
                     from (select chauffeur as nom, count(*) as n, sum(prix) as total,
                                  coalesce(sum(com), 0) as commission, count(*) filter (where com is null) as sans
                             from f where chauffeur <> '' group by chauffeur) q),
    'chauffeurs_periode', (select coalesce(jsonb_agg(jsonb_build_object('nom', q.nom, 'n', q.n, 'total', q.total,
                                    'commission', q.commission, 'sans_commission', q.sans) order by q.n desc, q.total desc), '[]'::jsonb)
                     from (select min(chauffeur) as nom, count(*) as n, sum(prix) as total,
                                  coalesce(sum(com), 0) as commission, count(*) filter (where com is null) as sans
                             from f where chauffeur <> '' and d >= v_debut group by lower(chauffeur)) q),
    'provenances', (select coalesce(jsonb_agg(jsonb_build_object('nom', q.nom, 'demandes', q.demandes,
                                    'realisees', q.realisees, 'total', q.total) order by q.demandes desc, q.nom), '[]'::jsonb)
                      from (select provenance as nom, count(*) as demandes,
                                   count(*) filter (where statut = 'realisee') as realisees,
                                   coalesce(sum(prix) filter (where statut = 'realisee'), 0) as total
                              from c where provenance <> '' group by provenance) q),
    'delai', (select jsonb_build_object(
                'n', count(*) filter (where statut <> 'attente' and t1 is not null),
                'mediane_ms', percentile_cont(0.5) within group (order by ms) filter (where statut <> 'attente' and t1 is not null),
                'vite', count(*) filter (where statut <> 'attente' and t1 is not null and ms < 15 * 60000),
                'en_attente', count(*) filter (where statut = 'attente'),
                'pire', (select jsonb_build_object('ref', z.ref, 'numero', z.bon->'numero', 'ms', z.ms)
                           from dlp z where z.statut <> 'attente' and z.t1 is not null order by z.ms desc limit 1))
              from dlp),
    'options', jsonb_build_object(
       'chauffeurs', (select coalesce(jsonb_agg(o.nom order by o.nom), '[]'::jsonb)
                        from (select distinct chauffeur as nom from c where chauffeur <> '' limit 300) o),
       'sources', (select coalesce(jsonb_agg(o.nom order by o.nom), '[]'::jsonb)
                     from (select distinct provenance as nom from c where provenance <> '' limit 300) o),
       'annees', (select coalesce(jsonb_agg(o.a order by o.a desc), '[]'::jsonb)
                    from (select distinct extract(year from d)::int as a from c where d is not null) o))
  ) into r;
  return r;
end;
$$;
revoke all on function public.ela_registre_resume(text) from public, anon, authenticated;
grant execute on function public.ela_registre_resume(text) to authenticated;

-- ── RECHERCHER, FILTRER, PAGINER (EXPLOITANT) ───────────────────────────
-- La recherche porte sur TOUT le registre, essais compris (quand un client
-- rappelle, on cherche sa course, pas un chiffre). Elle lit les mêmes champs
-- que « champsCourse » de la page, y compris le téléphone tapé d'une traite,
-- mais ne RENVOIE que ce que la liste affiche : ni téléphone, ni chambre.
create or replace function public.ela_registre_courses(
  p_q text default null,
  p_statut text default null,
  p_chauffeur text default null,
  p_source text default null,
  p_debut date default null,
  p_fin date default null,
  p_limite integer default 20,
  p_decalage integer default 0)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_q text := public.ela_sans_accents(left(coalesce(p_q, ''), 120));
  v_qc text;
  v_ch text := lower(btrim(coalesce(p_chauffeur, '')));
  v_src text := btrim(coalesce(p_source, ''));
  v_limite integer := greatest(1, least(coalesce(p_limite, 20), 100));
  v_decalage integer := greatest(0, least(coalesce(p_decalage, 0), 1000000));
  r jsonb;
begin
  if not coalesce(public.est_exploitant(), false) then
    raise exception 'registre réservé à l''exploitant' using errcode = '42501';
  end if;
  -- Une seule comparaison suffit, et c'est celle de la page : si le texte
  -- tapé est dans une fiche, il l'est AUSSI une fois les espaces retirés des
  -- deux côtés (« 0612345678 » trouve « 06 12 34 56 78 »).
  v_qc := translate(v_q, E' \t\n\r', '');
  with c as (
    select x.ref, x.bon, x.cree_le,
           coalesce(nullif(x.statut, ''), nullif(x.bon->>'statut', ''), 'attente') as statut,
           btrim(coalesce(x.bon->'chauffeur'->>'nom', '')) as chauffeur,
           btrim(coalesce(x.bon->>'provenance', '')) as provenance
      from public.courses x
  ),
  -- MATÉRIALISÉE : sans cela PostgreSQL recopie l'expression de la fiche à
  -- chaque endroit où elle sert, et la calcule plusieurs fois par ligne
  -- (mesuré : 1,2 s au lieu de 0,3 s sur 25 000 courses).
  m as materialized (
    select c.*, public.ela_registre_date(c.bon) as d
      from c
     where (p_statut is null or p_statut = '' or c.statut = p_statut)
       and (v_ch = '' or lower(c.chauffeur) = v_ch)
       and (v_src = '' or (v_src = '(direct)' and c.provenance = '') or c.provenance = v_src)
       and (v_qc = '' or position(v_qc in translate(public.ela_sans_accents(concat_ws('',
             c.ref,
             case when public.ela_registre_nombre(c.bon->'numero') > 0
                  then 'n°' || (c.bon->>'numero') || (c.bon->>'numero') end,
             c.bon->'client'->>'nom', c.bon->'client'->>'telephone',
             c.bon->'course'->>'depart', c.bon->'course'->>'arrivee',
             c.chauffeur, c.provenance)), E' \t\n\r', '')) > 0)
  ),
  f as (
    select m.* from m
     where (p_debut is null or m.d >= p_debut)
       and (p_fin is null or m.d <= p_fin)
  ),
  p as (
    select f.*
      from f
     order by f.d desc nulls last, f.bon->'course'->>'heure' desc nulls last, f.cree_le desc nulls last, f.ref desc
     limit v_limite offset v_decalage
  )
  select jsonb_build_object(
    'total', (select count(*) from f),
    'limite', v_limite,
    'decalage', v_decalage,
    'courses', coalesce((select jsonb_agg(jsonb_build_object(
        'ref', p.ref,
        'numero', p.bon->'numero',
        'statut', p.statut,
        'date', p.bon->'course'->>'date',
        'heure', p.bon->'course'->>'heure',
        'client', p.bon->'client'->>'nom',
        'depart', p.bon->'course'->>'depart',
        'arrivee', p.bon->'course'->>'arrivee',
        'prix', coalesce(public.ela_registre_nombre(p.bon->'prix'->'total'), 0),
        'chauffeur', p.chauffeur,
        'provenance', p.provenance,
        'essai', public.ela_registre_essai(p.bon))
      order by p.d desc nulls last, p.bon->'course'->>'heure' desc nulls last, p.cree_le desc nulls last, p.ref desc) from p), '[]'::jsonb)
  ) into r;
  return r;
end;
$$;
revoke all on function public.ela_registre_courses(text, text, text, text, date, date, integer, integer) from public, anon, authenticated;
grant execute on function public.ela_registre_courses(text, text, text, text, date, date, integer, integer) to authenticated;

-- ── LES LIENS DES PARTENAIRES : CE QU'ILS RAPPORTENT VRAIMENT (ADMIN) ──
-- Les visites et les clics sont des ESTIMATIONS (déclarées par le
-- navigateur, ela_mesures_liens). Ce qui suit est la VÉRITÉ SERVEUR : des
-- lignes de « courses » dont le code « via » a été posé par deposer-course
-- après l'avoir trouvé dans liens_suivi — un client ne peut pas l'écrire
-- (la provenance « Lien · … » en texte libre ne compte pas ici), et une
-- course ne passe « confirmée » ou « réalisée » que par l'exploitant.
-- Même fenêtre que l'écran : la date de la COURSE, sur p_jours jours.
create or replace function public.ela_liens_resultats(p_jours integer default 30)
returns table(code text, demandes bigint, confirmees bigint, realisees bigint, chiffre numeric)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_jours integer := greatest(1, least(coalesce(p_jours, 30), 3660));
  v_depuis date := (now() at time zone 'Europe/Paris')::date - v_jours;
begin
  if not coalesce(public.est_admin(), false) then
    raise exception 'liens réservés à l''admin' using errcode = '42501';
  end if;
  return query
    select x.bon->>'via',
           count(*)::bigint,
           count(*) filter (where s.statut in ('confirmee', 'realisee'))::bigint,
           count(*) filter (where s.statut = 'realisee')::bigint,
           coalesce(sum(coalesce(public.ela_registre_nombre(x.bon->'prix'->'total'), 0)) filter (where s.statut = 'realisee'), 0)
      from public.courses x
      cross join lateral (select coalesce(nullif(x.statut, ''), nullif(x.bon->>'statut', ''), 'attente') as statut) s
     where coalesce(x.bon->>'via', '') <> ''
       and not public.ela_registre_essai(x.bon)
       and public.ela_registre_date(x.bon) >= v_depuis
     group by x.bon->>'via'
     order by 2 desc, 1;
end;
$$;
revoke all on function public.ela_liens_resultats(integer) from public, anon, authenticated;
grant execute on function public.ela_liens_resultats(integer) to authenticated;
