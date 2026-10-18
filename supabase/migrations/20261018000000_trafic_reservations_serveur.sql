-- =====================================================================
-- TRAFIC : UNE RÉSERVATION N'EST COMPTÉE QUE SI LA COURSE EXISTE
-- 18 octobre 2026 — consolidation finale, phase Analytics.
-- ---------------------------------------------------------------------
-- LE DÉFAUT. Dans 20261015010000, « réservations » comptait chaque geste
-- « demande_envoyee » du journal, sans regarder la table des courses —
-- alors que « confirmées » et « réalisées », juste en dessous, y étaient
-- déjà croisées. Or ce geste est DÉCLARÉ par le navigateur : la page ne
-- l'envoie qu'après le « oui » du serveur, mais la fonction « mesure »
-- accepte toute référence au bon format, et l'en-tête Origin se fabrique
-- en une ligne de curl. Un geste inventé gonflait donc « Réservations »,
-- la courbe et chaque taux de conversion, sans qu'aucun contrôle le voie.
-- La vérité est dans la même base : une demande arrivée EST une ligne de
-- « courses ». C'est elle qui décide désormais, comme pour les deux étapes
-- suivantes. L'attribution (page d'entrée, source, campagne) reste celle
-- de la visite : seule l'existence de la course est exigée en plus.
--
-- CE QUI NE CHANGE PAS : le journal, l'écriture, la déduplication, les
-- droits, la rétention. Les deux fonctions sont reprises À L'IDENTIQUE de
-- 20261015010000, sauf la condition « exists » des réservations.
--
-- À APPLIQUER EN PRODUCTION APRÈS LA FUSION (workflow « Appliquer une
-- migration Supabase », ce fichier). Lecture seule sur les données ;
-- rejouable. RETOUR ARRIÈRE : rejouer les définitions de 20261015010000.
-- Épreuve : supabase/tests/trafic-reservations.sql.
-- =====================================================================

do $$ begin
  if to_regprocedure('public.trafic_lignes(timestamptz,timestamptz)') is null
     or to_regprocedure('public.ela_trafic(text)') is null then
    raise exception 'la mesure du trafic manque : appliquer 20261015010000_mesure_trafic.sql avant ce fichier';
  end if;
end $$;

create or replace function public.trafic_agreger(p_debut timestamptz, p_fin timestamptz, p_dim text)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  with l as (
    select t.*, case p_dim when 'page' then t.page when 'source' then t.source when 'entree' then t.entree
                           when 'langue' then t.langue when 'pays' then t.pays when 'appareil' then t.appareil
                           when 'lien' then t.lien when 'campagne' then t.campagne else 'tout' end as valeur
    from public.trafic_lignes(p_debut, p_fin) t
  ), r as (
    select l.valeur,
      count(distinct l.visiteur) as visiteurs,
      count(distinct l.visite) as visites,
      count(*) filter (where l.evenement in ('page_vue','moteur_ouvert')) as pages_vues,
      count(distinct l.visite) filter (where l.evenement = 'clic_reserver') as reserver,
      count(distinct l.visite) filter (where l.evenement = 'formulaire_commence') as formulaires,
      count(distinct l.visite) filter (where l.evenement = 'prix_demande') as prix,
      count(distinct l.visite) filter (where l.evenement = 'prix_affiche') as prix_affiches,
      count(distinct l.visite) filter (where l.evenement = 'clic_appel') as appels,
      count(distinct l.visite) filter (where l.evenement = 'clic_whatsapp') as whatsapp,
      -- La demande ne compte que si la course EST sur le serveur.
      count(*) filter (where l.evenement = 'demande_envoyee'
                         and exists (select 1 from public.courses c where c.ref = l.ref)) as reservations,
      count(*) filter (where l.evenement = 'demande_envoyee'
                         and exists (select 1 from public.courses c where c.ref = l.ref and c.statut in ('confirmee','realisee'))) as confirmees,
      count(*) filter (where l.evenement = 'demande_envoyee'
                         and exists (select 1 from public.courses c where c.ref = l.ref and c.statut = 'realisee')) as realisees
    from l where l.valeur is not null group by l.valeur
  )
  select coalesce(jsonb_agg(jsonb_build_object('valeur', r.valeur, 'totaux', to_jsonb(r) - 'valeur')
                            order by r.visiteurs desc, r.valeur), '[]'::jsonb)
  from (select * from r order by r.visiteurs desc, r.valeur limit 25) r;
$$;
revoke all on function public.trafic_agreger(timestamptz, timestamptz, text) from public, anon, authenticated;

create or replace function public.ela_trafic(p_periode text)
returns jsonb language plpgsql stable security definer
set search_path = public, pg_temp as $$
declare b record; pas text; serie jsonb;
begin
  if not coalesce(public.est_admin(), false) then raise exception 'acces_refuse'; end if;
  select * into b from public.trafic_bornes(p_periode);
  pas := case when p_periode in ('aujourdhui','hier') then 'hour' else 'day' end;
  select coalesce(jsonb_agg(jsonb_build_object('t', s.t, 'visiteurs', s.v, 'reservations', s.r) order by s.t), '[]'::jsonb)
    into serie
  from (
    select to_char(date_trunc(pas, t.cree_le at time zone 'Europe/Paris'), 'YYYY-MM-DD"T"HH24:MI') as t,
           count(distinct t.visiteur) as v,
           count(*) filter (where t.evenement = 'demande_envoyee'
                              and exists (select 1 from public.courses c where c.ref = t.ref)) as r
    from public.trafic_lignes(b.debut, b.fin) t group by 1
  ) s;
  return jsonb_build_object(
    'periode', p_periode, 'debut', b.debut, 'fin', b.fin, 'pas', pas,
    'totaux', public.trafic_totaux(b.debut, b.fin),
    'pages', public.trafic_agreger(b.debut, b.fin, 'page'),
    'sources', public.trafic_agreger(b.debut, b.fin, 'source'),
    'entrees', public.trafic_agreger(b.debut, b.fin, 'entree'),
    'liens', public.trafic_agreger(b.debut, b.fin, 'lien'),
    'campagnes', public.trafic_agreger(b.debut, b.fin, 'campagne'),
    'langues', public.trafic_agreger(b.debut, b.fin, 'langue'),
    'pays', public.trafic_agreger(b.debut, b.fin, 'pays'),
    'appareils', public.trafic_agreger(b.debut, b.fin, 'appareil'),
    'serie', serie, 'mesure_le', now());
end $$;
revoke all on function public.ela_trafic(text) from public, anon, authenticated;
grant execute on function public.ela_trafic(text) to authenticated;

-- ── CEINTURE : mêmes droits qu'avant, sinon la migration s'arrête ─────
do $$ begin
  if has_function_privilege('anon', 'public.trafic_agreger(timestamptz,timestamptz,text)', 'execute')
     or has_function_privilege('authenticated', 'public.trafic_agreger(timestamptz,timestamptz,text)', 'execute') then
    raise exception 'trafic_agreger : exécutable depuis le navigateur';
  end if;
  if has_function_privilege('anon', 'public.ela_trafic(text)', 'execute') then
    raise exception 'ela_trafic : exécutable par un anonyme';
  end if;
end $$;
