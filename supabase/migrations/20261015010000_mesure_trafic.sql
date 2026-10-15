-- =====================================================================
-- LA MESURE DU TRAFIC — LE JOURNAL QUI MANQUAIT AU COMPTEUR
-- ---------------------------------------------------------------------
-- 15 octobre 2026, mission « Analytics temps réel dans l'admin » :
-- combien de personnes viennent, d'où, quelles pages, ce qui fait
-- demander un prix, appeler, écrire, réserver — et quelle source amène les
-- courses RÉALISÉES.
--
-- CE N'EST PAS UN SECOND SYSTÈME. Il en existe un depuis le 14 octobre :
-- mesure.js et le moteur appelaient « ela_mesurer », un COMPTEUR par jour,
-- page et geste (20261014000000), avec le code d'un lien de partenaire
-- (20261015000000_liens_suivi). Ce fichier le fait évoluer :
--   · UNE SEULE PORTE D'ENTRÉE, la fonction « mesure », qui écrit une
--     ligne ici ET incrémente le compteur existant par « ela_mesurer » —
--     réutilisé, pas recopié. Les écrans du registre (« Les pages du
--     site », « Liens des partenaires ») continuent donc à l'identique ;
--   · « ela_mesurer » reste ouvert à anon le temps que les pages gardées
--     en cache par les téléphones se renouvellent : elles comptent encore,
--     sans ligne de journal. À fermer dans une migration à part, plus tard.
--
-- RIEN SUR L'APPAREIL, ET C'EST LA RÈGLE DU SITE QUI TIENT. La promesse de
-- la politique de confidentialité (art. 7) est « ni cookie ni stockage sur
-- l'appareil ». Elle reste vraie : le navigateur n'envoie AUCUN identifiant.
-- Pour estimer les visiteurs distincts d'un jour et relier les gestes d'une
-- même visite, la fonction calcule « sha256(adresse IP | navigateur) » et
-- cette base le mélange à une CLÉ DU JOUR, tirée au sort et DÉTRUITE le
-- lendemain (trafic_sels). L'adresse IP et le navigateur ne sont jamais
-- écrits ; l'empreinte d'un jour ne peut être rapprochée d'aucune autre,
-- pas même par nous. C'est la méthode des outils de mesure sans cookie.
-- Conséquence assumée et DITE à l'écran : un « visiteur » est compté une
-- fois PAR JOUR — sur 7 jours, la même personne venue trois jours compte
-- trois fois.
--
-- LA VISITE ET SA SOURCE SE CALCULENT À LA LECTURE. Une visite = les gestes
-- d'une même empreinte sans pause de plus de 30 min ; sa page d'entrée et
-- sa source sont celles de son PREMIER geste. Une réservation faite trois
-- pages après l'arrivée depuis Google est donc attribuée à Google et à la
-- page d'arrivée, sans rien garder dans le navigateur.
--
-- JAMAIS : nom, téléphone, adresse, chambre, vol, prix, texte libre, IP,
-- navigateur. « detail » : quatre clés fermées et bornées ; la RÉFÉRENCE
-- d'une course seulement sur « demande_envoyee », jointe aux courses À LA
-- LECTURE (par l'admin), pour savoir quelle source fait des courses
-- réalisées. Cette table ne porte rien d'autre de la course.
--
-- QUI ÉCRIT, QUI LIT. La fonction « mesure » écrit, avec la clé de service,
-- par « ela_mesurer_evenement » (validation, déduplication, écriture et
-- compteur en un aller-retour). anon et authenticated n'ont AUCUN droit sur
-- les tables. La lecture passe par deux RPC réservées à « est_admin() » :
-- le trafic est du commercial, l'agent de réservation ne le voit pas, et la
-- réception (session signée, pas un compte) ne peut rien appeler. Le
-- serveur agrège : l'admin ne reçoit jamais une ligne brute ni une empreinte.
--
-- DÉDUPLICATION, dans la base : une vue de page (« page_vue »,
-- « moteur_ouvert ») compte une fois par empreinte et par page toutes les
-- 30 min ; un appui, une fois toutes les 10 s ; une demande envoyée, une
-- fois par référence. Le doublon est accepté et ignoré : rien ne gonfle,
-- rien de vrai n'est détruit.
--
-- RÉTENTION : 90 jours de journal, puis plus rien ici — le compteur par
-- jour (mesures_acquisition) garde l'historique. Clés du jour : effacées
-- dès le lendemain. pg_cron chaque nuit ; sans pg_cron (épreuve locale),
-- l'étape est sautée et DITE.
--
-- À APPLIQUER EN PRODUCTION APRÈS LA FUSION, ET APRÈS 20261015000000
-- (workflow « Appliquer une migration Supabase », ce fichier). Avant : la
-- fonction « mesure » rend 503, les pages ne voient rien, le site marche
-- comme avant ; l'écran Trafic dit « non installée ». Rejouable.
-- RETOUR ARRIÈRE : cron.unschedule('ela-trafic-retention'), puis drop des
-- RPC ela_trafic, ela_trafic_direct, ela_mesurer_evenement, trafic_*, et
-- des tables evenements_site et trafic_sels. Le compteur n'est pas touché.
-- Épreuves : supabase/tests/trafic.sql puis trafic-apres.sql.
-- =====================================================================

do $$ begin
  if to_regprocedure('public.est_admin()') is null then
    raise exception 'est_admin() absente : appliquer 20260929030000_role_agent_serveur.sql avant ce fichier';
  end if;
  if to_regprocedure('public.ela_mesurer(text,text,text)') is null or to_regclass('public.liens_suivi') is null then
    raise exception 'le compteur à trois paramètres manque : appliquer 20261015000000_liens_suivi.sql avant ce fichier';
  end if;
end $$;

-- ── LES LISTES FERMÉES, lues par la table, la RPC et les épreuves ─────
-- Les sept gestes du compteur, plus les deux du prix.
create or replace function public.trafic_evenement_valide(p text)
returns boolean language sql immutable set search_path = pg_catalog as $$
  select coalesce(p in ('page_vue','clic_reserver','clic_appel','clic_whatsapp','moteur_ouvert',
                        'formulaire_commence','prix_demande','prix_affiche','demande_envoyee'), false);
$$;
create or replace function public.trafic_source_valide(p text)
returns boolean language sql immutable set search_path = pg_catalog as $$
  select coalesce(p in ('google','google_business','direct','partenaire','whatsapp','social',
                        'referent','campagne','autre'), false);
$$;
create or replace function public.trafic_detail_valide(p jsonb)
returns boolean language plpgsql immutable set search_path = pg_catalog as $$
declare k text;
begin
  if p is null or jsonb_typeof(p) <> 'object' then return false; end if;
  if (select count(*) from jsonb_object_keys(p)) > 4 then return false; end if;
  for k in select x from jsonb_object_keys(p) as t(x) loop
    if k not in ('aeroport','gamme','choix_wa','ref') then return false; end if;
    if jsonb_typeof(p->k) <> 'string' then return false; end if;
    if char_length(p->>k) not between 1 and 40 then return false; end if;
  end loop;
  if p ? 'ref' and (p->>'ref') !~ '^ELA-[A-Z0-9-]{6,24}$' then return false; end if;
  return true;
end $$;

-- ── LA CLÉ DU JOUR ────────────────────────────────────────────────────
create table if not exists public.trafic_sels (
  jour date primary key,
  sel text not null,
  cree_le timestamptz not null default now()
);
alter table public.trafic_sels enable row level security;
revoke all on public.trafic_sels from public, anon, authenticated;

-- ── LE JOURNAL ───────────────────────────────────────────────────────
create table if not exists public.evenements_site (
  id bigint generated always as identity primary key,
  cree_le timestamptz not null default now(),
  visiteur text not null,
  evenement text not null,
  page text not null,
  source text not null default 'direct',
  lien text,
  referent text,
  utm_source text, utm_medium text, utm_campaign text,
  langue text not null default 'fr',
  appareil text not null default 'mobile',
  pays text,
  detail jsonb not null default '{}'::jsonb,
  constraint evenements_site_visiteur check (visiteur ~ '^[0-9a-f]{32}$'),
  constraint evenements_site_evenement check (public.trafic_evenement_valide(evenement)),
  constraint evenements_site_page check (page ~ '^[a-z0-9-]{2,40}$'),
  constraint evenements_site_source check (public.trafic_source_valide(source)),
  constraint evenements_site_lien check (lien is null or lien ~ '^[a-z0-9-]{2,40}$'),
  constraint evenements_site_referent check (referent is null or referent ~ '^[a-z0-9.-]{1,80}$'),
  constraint evenements_site_utm check (
    coalesce(char_length(utm_source), 0) <= 60 and coalesce(char_length(utm_medium), 0) <= 60
    and coalesce(char_length(utm_campaign), 0) <= 60),
  constraint evenements_site_langue check (langue ~ '^[a-z]{2}$'),
  constraint evenements_site_appareil check (appareil in ('mobile','tablette','ordinateur')),
  constraint evenements_site_pays check (pays is null or pays ~ '^[A-Z]{2}$'),
  constraint evenements_site_detail check (public.trafic_detail_valide(detail))
);
-- Les index des lectures réelles : la période (toutes les agrégations), la
-- visite (empreinte puis instant : déduplication et découpage en visites),
-- la référence (une demande ne compte qu'une fois, jointure des courses).
create index if not exists evenements_site_cree_le_idx on public.evenements_site (cree_le desc);
create index if not exists evenements_site_visiteur_idx on public.evenements_site (visiteur, cree_le desc);
create index if not exists evenements_site_ref_idx on public.evenements_site ((detail->>'ref'))
  where evenement = 'demande_envoyee';

alter table public.evenements_site enable row level security;
revoke all on public.evenements_site from public, anon, authenticated;
-- Aucune policy : la seule porte est la clé de service (fonction et RPC
-- « security definer »). Pas de droit = pas de lecture, même si une policy
-- était ajoutée par erreur demain.

-- ── L'ÉCRITURE : réservée à la fonction « mesure » ────────────────────
-- p_brute : sha256(IP | navigateur), calculé par la fonction. Il n'est
-- jamais écrit : seul son mélange avec la clé du jour l'est.
create or replace function public.ela_mesurer_evenement(p jsonb, p_brute text)
returns boolean language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  v_jour date := (now() at time zone 'Europe/Paris')::date;
  v_sel text;
  v_visiteur text;
  v_evt text := p->>'evenement';
  v_page text := p->>'page';
  v_source text := coalesce(p->>'source', 'direct');
  v_lien text := nullif(p->>'lien', '');
  v_referent text := nullif(p->>'referent', '');
  v_pays text := nullif(upper(coalesce(p->>'pays', '')), '');
  v_detail jsonb := coalesce(p->'detail', '{}'::jsonb);
begin
  -- Toute valeur hors liste est REFUSÉE, jamais corrigée en silence.
  if p_brute is null or p_brute !~ '^[0-9a-f]{64}$' then raise exception 'evenement_invalide'; end if;
  if not public.trafic_evenement_valide(v_evt) or not public.trafic_source_valide(v_source)
     or not public.trafic_detail_valide(v_detail) or v_page is null then
    raise exception 'evenement_invalide';
  end if;
  if v_evt = 'demande_envoyee' and v_detail->>'ref' is null then raise exception 'evenement_invalide'; end if;
  if v_pays is not null and v_pays !~ '^[A-Z]{2}$' then v_pays := null; end if;
  -- Le lien d'un partenaire n'est cru que s'il EXISTE : un code inventé
  -- est une visite sans lien, comme dans le compteur.
  if v_lien is not null and not exists (select 1 from public.liens_suivi l where l.code = v_lien) then
    v_lien := null;
  end if;
  if v_lien is not null then v_source := 'partenaire'; end if;

  -- La clé du jour : créée au premier geste, celles d'avant effacées.
  select s.sel into v_sel from public.trafic_sels s where s.jour = v_jour;
  if v_sel is null then
    insert into public.trafic_sels(jour, sel)
    values (v_jour, replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''))
    on conflict (jour) do nothing;
    select s.sel into v_sel from public.trafic_sels s where s.jour = v_jour;
    delete from public.trafic_sels where jour < v_jour;
  end if;
  v_visiteur := left(encode(sha256(convert_to(v_sel || ':' || p_brute, 'UTF8')), 'hex'), 32);

  -- Déduplication.
  if v_evt = 'demande_envoyee' then
    if exists (select 1 from public.evenements_site e
                where e.evenement = 'demande_envoyee' and e.detail->>'ref' = v_detail->>'ref') then
      return false;
    end if;
  elsif v_evt in ('page_vue', 'moteur_ouvert') then
    if exists (select 1 from public.evenements_site e
                where e.visiteur = v_visiteur and e.evenement = v_evt and e.page = v_page
                  and e.cree_le > now() - interval '30 minutes') then
      return false;
    end if;
  elsif exists (select 1 from public.evenements_site e
                 where e.visiteur = v_visiteur and e.evenement = v_evt
                   and e.cree_le > now() - interval '10 seconds') then
    return false;
  end if;

  insert into public.evenements_site
    (visiteur, evenement, page, source, lien, referent, utm_source, utm_medium, utm_campaign,
     langue, appareil, pays, detail)
  values
    (v_visiteur, v_evt, v_page, v_source, v_lien, v_referent,
     nullif(left(p->>'utm_source', 60), ''), nullif(left(p->>'utm_medium', 60), ''),
     nullif(left(p->>'utm_campaign', 60), ''),
     coalesce(p->>'langue', 'fr'), coalesce(p->>'appareil', 'mobile'), v_pays, v_detail);

  -- LE COMPTEUR EXISTANT, par sa propre fonction : mêmes règles (format,
  -- 60 pages par jour, lien reconnu), aucune recopie. Les deux gestes du
  -- prix n'y sont pas : il ne les connaît pas.
  if v_evt not in ('prix_demande', 'prix_affiche') then
    perform public.ela_mesurer(v_page, v_evt, v_lien);
  end if;
  return true;
exception
  when check_violation then raise exception 'evenement_invalide';
end $$;
revoke all on function public.ela_mesurer_evenement(jsonb, text) from public, anon, authenticated;
grant execute on function public.ela_mesurer_evenement(jsonb, text) to service_role;

-- ── LA LECTURE ───────────────────────────────────────────────────────
-- Les bornes d'une période, en journées de PARIS (le piège déjà payé par la
-- date du formulaire : une journée UTC n'est pas la sienne).
create or replace function public.trafic_bornes(p_periode text, out debut timestamptz, out fin timestamptz)
language plpgsql stable set search_path = pg_catalog as $$
declare j date := (now() at time zone 'Europe/Paris')::date;
begin
  case p_periode
    when 'aujourdhui' then debut := (j::timestamp) at time zone 'Europe/Paris'; fin := now();
    when 'hier' then debut := ((j - 1)::timestamp) at time zone 'Europe/Paris';
                     fin := (j::timestamp) at time zone 'Europe/Paris';
    when '7j' then debut := ((j - 6)::timestamp) at time zone 'Europe/Paris'; fin := now();
    when '30j' then debut := ((j - 29)::timestamp) at time zone 'Europe/Paris'; fin := now();
    else raise exception 'periode_invalide';
  end case;
end $$;

-- Chaque geste de la période, avec SA visite : une visite s'ouvre au premier
-- geste d'une empreinte ou après 30 min de silence ; elle prend la page et
-- la source de ce premier geste. On regarde 30 min avant la borne pour ne
-- pas couper en deux une visite commencée juste avant.
create or replace function public.trafic_lignes(p_debut timestamptz, p_fin timestamptz)
returns table(cree_le timestamptz, visiteur text, visite text, evenement text, page text,
              entree text, source text, lien text, langue text, appareil text, pays text, ref text)
language sql stable security definer set search_path = public, pg_temp as $$
  with e as (
    select x.*, lag(x.cree_le) over (partition by x.visiteur order by x.cree_le, x.id) as avant
    from public.evenements_site x
    where x.cree_le >= p_debut - interval '30 minutes' and x.cree_le < p_fin
  ), n as (
    select e.*, sum(case when e.avant is null or e.cree_le - e.avant > interval '30 minutes' then 1 else 0 end)
                  over (partition by e.visiteur order by e.cree_le, e.id rows unbounded preceding) as numero
    from e
  ), v as (
    select n.*, first_value(n.page) over w as p0, first_value(n.source) over w as s0,
           first_value(n.lien) over w as l0
    from n window w as (partition by n.visiteur, n.numero order by n.cree_le, n.id)
  )
  select v.cree_le, v.visiteur, v.visiteur || '-' || v.numero, v.evenement, v.page, v.p0, v.s0, v.l0,
         v.langue, v.appareil, coalesce(v.pays, 'XX'), v.detail->>'ref'
  from v where v.cree_le >= p_debut;
$$;
revoke all on function public.trafic_lignes(timestamptz, timestamptz) from public, anon, authenticated;

-- Une même mesure pour tout : le total, chaque page, chaque source… Un seul
-- calcul, pas sept copies qui finiraient par diverger. Un taux se calcule
-- sur les visites (un double appui dans une visite reste une intention).
create or replace function public.trafic_agreger(p_debut timestamptz, p_fin timestamptz, p_dim text)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  with l as (
    select t.*, case p_dim when 'page' then t.page when 'source' then t.source when 'entree' then t.entree
                           when 'langue' then t.langue when 'pays' then t.pays when 'appareil' then t.appareil
                           when 'lien' then t.lien else 'tout' end as valeur
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
      count(*) filter (where l.evenement = 'demande_envoyee') as reservations,
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

create or replace function public.trafic_totaux(p_debut timestamptz, p_fin timestamptz)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(public.trafic_agreger(p_debut, p_fin, 'tout')->0->'totaux',
    jsonb_build_object('visiteurs',0,'visites',0,'pages_vues',0,'reserver',0,'formulaires',0,'prix',0,
      'prix_affiches',0,'appels',0,'whatsapp',0,'reservations',0,'confirmees',0,'realisees',0));
$$;
revoke all on function public.trafic_totaux(timestamptz, timestamptz) from public, anon, authenticated;

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
           count(distinct t.visiteur) as v, count(*) filter (where t.evenement = 'demande_envoyee') as r
    from public.trafic_lignes(b.debut, b.fin) t group by 1
  ) s;
  return jsonb_build_object(
    'periode', p_periode, 'debut', b.debut, 'fin', b.fin, 'pas', pas,
    'totaux', public.trafic_totaux(b.debut, b.fin),
    'pages', public.trafic_agreger(b.debut, b.fin, 'page'),
    'sources', public.trafic_agreger(b.debut, b.fin, 'source'),
    'entrees', public.trafic_agreger(b.debut, b.fin, 'entree'),
    'liens', public.trafic_agreger(b.debut, b.fin, 'lien'),
    'langues', public.trafic_agreger(b.debut, b.fin, 'langue'),
    'pays', public.trafic_agreger(b.debut, b.fin, 'pays'),
    'appareils', public.trafic_agreger(b.debut, b.fin, 'appareil'),
    'serie', serie, 'mesure_le', now());
end $$;
revoke all on function public.ela_trafic(text) from public, anon, authenticated;
grant execute on function public.ela_trafic(text) to authenticated;

-- EN DIRECT : « en ligne » = un geste dans les 5 dernières minutes. 2 min
-- oublierait quelqu'un qui lit l'écran des prix ; 15 compterait des onglets
-- abandonnés. La liste dit la page, le pays, la langue, l'appareil, la
-- source de la visite et le dernier geste — jamais l'empreinte.
create or replace function public.ela_trafic_direct()
returns jsonb language plpgsql stable security definer
set search_path = public, pg_temp as $$
declare b record; actifs jsonb; n int;
begin
  if not coalesce(public.est_admin(), false) then raise exception 'acces_refuse'; end if;
  select * into b from public.trafic_bornes('aujourdhui');
  with t as (
    select * from public.trafic_lignes(now() - interval '6 hours', now())
  ), recents as (
    select distinct on (t.visiteur) t.* from t
    where t.cree_le > now() - interval '5 minutes'
    order by t.visiteur, t.cree_le desc
  )
  select count(*)::int, coalesce(jsonb_agg(jsonb_build_object(
           'page', r.page, 'pays', r.pays, 'langue', r.langue, 'appareil', r.appareil,
           'source', r.source, 'dernier', r.evenement,
           'depuis_s', extract(epoch from now() - r.cree_le)::int) order by r.cree_le desc), '[]'::jsonb)
    into n, actifs
  from (select * from recents order by cree_le desc limit 20) r;
  return jsonb_build_object('en_ligne', (select count(*) from (select distinct on (t.visiteur) 1 from public.trafic_lignes(now() - interval '5 minutes', now()) t) x),
    'actifs', actifs, 'aujourdhui', public.trafic_totaux(b.debut, b.fin), 'mesure_le', now());
end $$;
revoke all on function public.ela_trafic_direct() from public, anon, authenticated;
grant execute on function public.ela_trafic_direct() to authenticated;

-- ── LA RÉTENTION ─────────────────────────────────────────────────────
create or replace function public.ela_trafic_retention()
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  delete from public.evenements_site
   where cree_le < ((((now() at time zone 'Europe/Paris')::date - 90)::timestamp) at time zone 'Europe/Paris');
  delete from public.trafic_sels where jour < (now() at time zone 'Europe/Paris')::date;
end $$;
revoke all on function public.ela_trafic_retention() from public, anon, authenticated;

do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'ela-trafic-retention';
    -- 22:30 UTC : 00:30 à Paris l'été, 23:30 l'hiver — la clé de la veille
    -- part au plus tard une heure et demie après minuit.
    perform cron.schedule('ela-trafic-retention', '30 22 * * *', 'select public.ela_trafic_retention()');
  else
    raise notice 'pg_cron absent : la rétention du trafic n''est pas planifiée ici (normal hors production)';
  end if;
end $$;

-- ── CEINTURE : un droit qui survit arrête la migration ici ────────────
do $$
declare t text; f text; d text;
begin
  foreach t in array array['public.evenements_site', 'public.trafic_sels'] loop
    foreach d in array array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'] loop
      if has_table_privilege('anon', t, d) or has_table_privilege('authenticated', t, d) then
        raise exception '% : % survit pour anon ou authenticated', t, d;
      end if;
    end loop;
  end loop;
  foreach f in array array['public.ela_mesurer_evenement(jsonb,text)', 'public.ela_trafic_retention()',
                           'public.trafic_lignes(timestamptz,timestamptz)',
                           'public.trafic_agreger(timestamptz,timestamptz,text)',
                           'public.trafic_totaux(timestamptz,timestamptz)'] loop
    if has_function_privilege('anon', f, 'execute') or has_function_privilege('authenticated', f, 'execute') then
      raise exception '% : exécutable depuis le navigateur', f;
    end if;
  end loop;
  foreach f in array array['public.ela_trafic(text)', 'public.ela_trafic_direct()'] loop
    if has_function_privilege('anon', f, 'execute') then
      raise exception '% : exécutable par un anonyme', f;
    end if;
  end loop;
end $$;
