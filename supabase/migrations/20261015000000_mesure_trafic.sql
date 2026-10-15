-- LA MESURE DU TRAFIC — 15 octobre 2026, à la demande de Barbaros (« Analytics
-- temps réel dans l'admin »). Audit préalable : AUCUNE mesure d'audience
-- n'existait dans le dépôt (pas de mesure.js, pas de table, pas d'événement) ;
-- la seule attribution était l'hôtel partenaire (bon.provenance). Ce fichier
-- est donc le premier et le SEUL système de mesure : ne pas en créer un second.
--
-- CE QU'ON MESURE, ET RIEN D'AUTRE. Une ligne par événement : page vue, appui
-- sur « Voir mon prix », prix affiché, formulaire commencé, demande envoyée,
-- appui sur « Appeler », appui sur WhatsApp. Avec, pour chacun : un identifiant
-- de session (tiré au sort par le navigateur, meurt avec l'onglet), un
-- identifiant de visiteur (tiré au sort, 30 jours), la page SANS sa chaîne de
-- requête, la page d'entrée, la source du trafic, le domaine du site référent,
-- les UTM, la langue, l'appareil (trois valeurs), le pays (deux lettres, lu par
-- la fonction sur l'en-tête Cloudflare, JAMAIS l'adresse IP), l'espace du site.
-- JAMAIS : nom, téléphone, adresse, chambre, vol, prix, texte libre, IP,
-- user-agent. Le « detail » est un objet à QUATRE clés possibles, bornées.
-- La référence d'une course (detail.ref, sur « booking_submitted » seulement)
-- est le seul lien vers une personne : la JOINTURE se fait à la lecture, dans
-- ela_trafic(), et cette table ne porte jamais autre chose que la référence.
--
-- QUI ÉCRIT, QUI LIT — même modèle que journal_depots. La fonction « mesure »
-- écrit avec la clé de service par ela_mesurer_evenement(), qui valide,
-- déduplique et insère en UN aller-retour. anon et authenticated n'ont AUCUN
-- droit sur la table : le navigateur public ne peut ni lire, ni écrire, ni
-- effacer. La lecture passe par deux RPC réservées à est_admin() — le trafic
-- est du commercial, l'agent de réservation ne le voit pas, la réception
-- (session signée, pas un compte) ne peut rien appeler.
--
-- LE SERVEUR CALCULE. ela_trafic() rend des totaux et des tableaux agrégés
-- (pages, sources, langues, pays, entrées, série horaire ou journalière) ; le
-- navigateur ne reçoit jamais la liste des événements. ela_trafic_direct()
-- rend les visiteurs actifs dans les 5 dernières minutes et le jour en cours :
-- c'est elle que la sonde de l'admin appelle toutes les 10 s, écran ouvert.
-- Les journées sont celles de PARIS, pas d'UTC — le piège déjà payé par la
-- date du formulaire (« je peux cliquer sur le 6/09 alors qu'on est le 7 »).
--
-- RÉTENTION : 90 jours de lignes brutes, puis une ligne par jour × page ×
-- source × langue × espace × événement dans trafic_journalier, gardée sans
-- limite (pg_cron, chaque nuit à 4 h 20, heure de Paris). Sur une base sans
-- pg_cron (l'épreuve locale), l'étape est sautée et DITE, jamais fatale.
--
-- DÉDUPLICATION, dans la base et non dans la fonction : une page vue ne
-- compte qu'une fois par session et par page toutes les 30 min ; un appui
-- (prix, appel, WhatsApp, formulaire) une fois par session toutes les 10 s ;
-- une demande envoyée une fois par référence. Le doublon est accepté (200) et
-- ignoré : on ne gonfle pas, on ne détruit pas une vraie donnée.
--
-- À APPLIQUER EN PRODUCTION APRÈS LA FUSION (workflow « Appliquer une
-- migration Supabase », ce fichier). Rejouable sans dégât. Avant : la
-- fonction « mesure » rend 503 (RPC absente), le collecteur se tait, le site
-- marche comme avant ; l'écran Trafic dit « non disponible ». Retour arrière :
-- cron.unschedule('ela-trafic-retention'), drop des deux RPC de lecture, de
-- ela_mesurer_evenement, puis des deux tables — rien d'autre n'en dépend.

do $$ begin
  if to_regprocedure('public.est_admin()') is null then
    raise exception 'est_admin() absente : appliquer 20260929030000_role_agent_serveur.sql avant ce fichier';
  end if;
end $$;

-- ── LES LISTES FERMÉES, dans des fonctions immuables : la contrainte de la
--    table, la RPC d'écriture et les épreuves lisent la MÊME liste. ──────────
create or replace function public.trafic_evenement_valide(p text)
returns boolean language sql immutable set search_path = pg_catalog as $$
  select p in ('page_view','price_click','price_displayed','booking_started',
               'booking_submitted','call_click','whatsapp_click');
$$;
create or replace function public.trafic_source_valide(p text)
returns boolean language sql immutable set search_path = pg_catalog as $$
  select p in ('google','google_business','direct','hotel','whatsapp','social',
               'referent','campagne','autre');
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
  return true;
end $$;

create table if not exists public.evenements_site (
  id bigint generated always as identity primary key,
  cree_le timestamptz not null default now(),
  session text not null,
  visiteur text not null,
  evenement text not null,
  page text not null,
  landing text not null default '',
  source text not null default 'direct',
  referent text,
  utm_source text, utm_medium text, utm_campaign text,
  langue text not null default 'fr',
  appareil text not null default 'mobile',
  pays text,
  espace text not null default 'public',
  detail jsonb not null default '{}'::jsonb,
  constraint evenements_site_session check (session ~ '^[a-z0-9]{8,32}$'),
  constraint evenements_site_visiteur check (visiteur ~ '^[a-z0-9]{8,32}$'),
  constraint evenements_site_evenement check (public.trafic_evenement_valide(evenement)),
  constraint evenements_site_page check (page ~ '^/[^?#\s]{0,119}$'),
  constraint evenements_site_landing check (landing = '' or landing ~ '^/[^?#\s]{0,119}$'),
  constraint evenements_site_source check (public.trafic_source_valide(source)),
  constraint evenements_site_referent check (referent is null or referent ~ '^[a-z0-9.-]{1,80}$'),
  constraint evenements_site_utm check (
    coalesce(char_length(utm_source), 0) <= 60 and coalesce(char_length(utm_medium), 0) <= 60
    and coalesce(char_length(utm_campaign), 0) <= 60),
  constraint evenements_site_langue check (langue ~ '^[a-z]{2}$'),
  constraint evenements_site_appareil check (appareil in ('mobile','tablette','ordinateur')),
  constraint evenements_site_pays check (pays is null or pays ~ '^[A-Z]{2}$'),
  constraint evenements_site_espace check (espace in ('public','hotel-client','pro')),
  constraint evenements_site_detail check (public.trafic_detail_valide(detail))
);
-- Les trois index que les lectures font vraiment : la période (toutes les
-- agrégations), la déduplication (session + instant), la jointure des
-- courses (référence des demandes envoyées).
create index if not exists evenements_site_cree_le_idx on public.evenements_site (cree_le desc);
create index if not exists evenements_site_session_idx on public.evenements_site (session, cree_le desc);
create index if not exists evenements_site_ref_idx on public.evenements_site ((detail->>'ref'))
  where evenement = 'booking_submitted';

create table if not exists public.trafic_journalier (
  jour date not null,
  page text not null,
  source text not null,
  langue text not null,
  espace text not null,
  evenement text not null,
  nb integer not null,
  sessions integer not null,
  visiteurs integer not null,
  primary key (jour, page, source, langue, espace, evenement)
);

alter table public.evenements_site enable row level security;
alter table public.trafic_journalier enable row level security;
revoke all on public.evenements_site from public, anon, authenticated;
revoke all on public.trafic_journalier from public, anon, authenticated;
-- Aucune policy : la seule porte est service_role (fonction et RPC
-- « security definer »). Pas de droit = pas de lecture, même avec une policy
-- oubliée demain.

-- ── L'ÉCRITURE : une RPC pour la fonction « mesure », et elle seule ────────
create or replace function public.ela_mesurer_evenement(p jsonb)
returns boolean language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  v_session text := p->>'session';
  v_visiteur text := p->>'visiteur';
  v_evt text := p->>'evenement';
  v_page text := p->>'page';
  v_landing text := coalesce(p->>'landing', '');
  v_source text := coalesce(p->>'source', 'direct');
  v_referent text := nullif(p->>'referent', '');
  v_langue text := coalesce(p->>'langue', 'fr');
  v_appareil text := coalesce(p->>'appareil', 'mobile');
  v_pays text := nullif(upper(p->>'pays'), '');
  v_espace text := coalesce(p->>'espace', 'public');
  v_detail jsonb := coalesce(p->'detail', '{}'::jsonb);
  v_fenetre interval;
begin
  -- Toute valeur hors liste ou hors borne est REFUSÉE (la contrainte lève),
  -- jamais corrigée en silence : une donnée réparée à la devinette est une
  -- donnée fausse.
  if v_session is null or v_visiteur is null or v_evt is null or v_page is null then
    raise exception 'evenement_invalide';
  end if;
  if not public.trafic_evenement_valide(v_evt) then raise exception 'evenement_invalide'; end if;
  if not public.trafic_source_valide(v_source) then raise exception 'evenement_invalide'; end if;
  if not public.trafic_detail_valide(v_detail) then raise exception 'evenement_invalide'; end if;
  if v_pays is not null and v_pays !~ '^[A-Z]{2}$' then v_pays := null; end if;

  -- Déduplication.
  if v_evt = 'booking_submitted' then
    if v_detail->>'ref' is null then raise exception 'evenement_invalide'; end if;
    if exists (select 1 from public.evenements_site e
                where e.evenement = 'booking_submitted' and e.detail->>'ref' = v_detail->>'ref') then
      return false;
    end if;
  else
    v_fenetre := case when v_evt = 'page_view' then interval '30 minutes' else interval '10 seconds' end;
    if exists (select 1 from public.evenements_site e
                where e.session = v_session and e.evenement = v_evt
                  and (v_evt <> 'page_view' or e.page = v_page)
                  and e.cree_le > now() - v_fenetre) then
      return false;
    end if;
  end if;

  insert into public.evenements_site
    (session, visiteur, evenement, page, landing, source, referent,
     utm_source, utm_medium, utm_campaign, langue, appareil, pays, espace, detail)
  values
    (v_session, v_visiteur, v_evt, v_page, v_landing, v_source, v_referent,
     nullif(left(p->>'utm_source', 60), ''), nullif(left(p->>'utm_medium', 60), ''),
     nullif(left(p->>'utm_campaign', 60), ''), v_langue, v_appareil, v_pays, v_espace, v_detail);
  return true;
exception
  when check_violation then raise exception 'evenement_invalide';
end $$;
revoke all on function public.ela_mesurer_evenement(jsonb) from public, anon, authenticated;
grant execute on function public.ela_mesurer_evenement(jsonb) to service_role;

-- ── LA LECTURE : les bornes d'une période, à l'heure de Paris ─────────────
create or replace function public.trafic_bornes(p_periode text, out debut timestamptz, out fin timestamptz)
language plpgsql stable set search_path = pg_catalog as $$
declare aujourd_hui date := (now() at time zone 'Europe/Paris')::date;
begin
  case p_periode
    when 'aujourdhui' then debut := (aujourd_hui::timestamp) at time zone 'Europe/Paris'; fin := now();
    when 'hier' then debut := ((aujourd_hui - 1)::timestamp) at time zone 'Europe/Paris';
                     fin := (aujourd_hui::timestamp) at time zone 'Europe/Paris';
    when '7j' then debut := ((aujourd_hui - 6)::timestamp) at time zone 'Europe/Paris'; fin := now();
    when '30j' then debut := ((aujourd_hui - 29)::timestamp) at time zone 'Europe/Paris'; fin := now();
    else raise exception 'periode_invalide';
  end case;
end $$;

-- Les totaux d'un sous-ensemble : la MÊME fonction sert au total général, à
-- chaque page, chaque source, chaque langue — un seul calcul, pas six copies
-- qui divergeraient. « realisees » joint les courses par la référence : la
-- course porte le statut, cette table ne porte que la référence.
create or replace function public.trafic_totaux(p_debut timestamptz, p_fin timestamptz,
  p_cle text default null, p_valeur text default null)
returns jsonb language sql stable security definer
set search_path = public, pg_temp as $$
  with e as (
    select * from public.evenements_site
     where cree_le >= p_debut and cree_le < p_fin
       and (p_cle is null
            or (p_cle = 'page' and page = p_valeur)
            or (p_cle = 'source' and source = p_valeur)
            or (p_cle = 'langue' and langue = p_valeur)
            or (p_cle = 'pays' and coalesce(pays, 'XX') = p_valeur)
            or (p_cle = 'landing' and landing = p_valeur)
            or (p_cle = 'appareil' and appareil = p_valeur))
  )
  select jsonb_build_object(
    'visiteurs', (select count(distinct visiteur) from e),
    'sessions', (select count(distinct session) from e),
    'pages_vues', (select count(*) from e where evenement = 'page_view'),
    'prix', (select count(distinct session) from e where evenement = 'price_click'),
    'prix_affiches', (select count(distinct session) from e where evenement = 'price_displayed'),
    'formulaires', (select count(distinct session) from e where evenement = 'booking_started'),
    'reservations', (select count(*) from e where evenement = 'booking_submitted'),
    'appels', (select count(distinct session) from e where evenement = 'call_click'),
    'whatsapp', (select count(distinct session) from e where evenement = 'whatsapp_click'),
    'realisees', (select count(*) from e join public.courses c on c.ref = e.detail->>'ref'
                   where e.evenement = 'booking_submitted' and c.statut = 'realisee'),
    'confirmees', (select count(*) from e join public.courses c on c.ref = e.detail->>'ref'
                   where e.evenement = 'booking_submitted' and c.statut in ('confirmee','realisee')));
$$;
revoke all on function public.trafic_totaux(timestamptz, timestamptz, text, text) from public, anon, authenticated;

-- Un tableau « valeur → totaux », trié par visiteurs. 25 lignes au plus :
-- au-delà, c'est du bruit sur un téléphone.
create or replace function public.trafic_tableau(p_debut timestamptz, p_fin timestamptz, p_cle text)
returns jsonb language sql stable security definer
set search_path = public, pg_temp as $$
  select coalesce(jsonb_agg(jsonb_build_object('valeur', v, 'totaux', t) order by (t->>'visiteurs')::int desc, v), '[]'::jsonb)
  from (
    select v, t from (
      select v, public.trafic_totaux(p_debut, p_fin, p_cle, v) as t
      from (
        select distinct case p_cle when 'page' then page when 'source' then source
                                   when 'langue' then langue when 'pays' then coalesce(pays, 'XX')
                                   when 'landing' then landing when 'appareil' then appareil end as v
        from public.evenements_site
        where cree_le >= p_debut and cree_le < p_fin
      ) valeurs
      where v is not null and v <> ''
    ) calcule
    order by (t->>'visiteurs')::int desc, v
    limit 25
  ) lignes;
$$;
revoke all on function public.trafic_tableau(timestamptz, timestamptz, text) from public, anon, authenticated;

create or replace function public.ela_trafic(p_periode text)
returns jsonb language plpgsql stable security definer
set search_path = public, pg_temp as $$
declare b record; pas text; serie jsonb;
begin
  if not public.est_admin() then raise exception 'acces_refuse'; end if;
  select * into b from public.trafic_bornes(p_periode);
  pas := case when p_periode in ('aujourdhui','hier') then 'hour' else 'day' end;
  -- La série : visiteurs et demandes envoyées par heure (un jour) ou par
  -- jour (7 / 30 j), à l'heure de Paris.
  select coalesce(jsonb_agg(jsonb_build_object('t', t, 'visiteurs', v, 'reservations', r) order by t), '[]'::jsonb)
    into serie
  from (
    select to_char(date_trunc(pas, cree_le at time zone 'Europe/Paris'), 'YYYY-MM-DD"T"HH24:MI') as t,
           count(distinct visiteur) as v,
           count(*) filter (where evenement = 'booking_submitted') as r
    from public.evenements_site
    where cree_le >= b.debut and cree_le < b.fin
    group by 1
  ) s;
  return jsonb_build_object(
    'periode', p_periode,
    'debut', b.debut, 'fin', b.fin, 'pas', pas,
    'totaux', public.trafic_totaux(b.debut, b.fin),
    'pages', public.trafic_tableau(b.debut, b.fin, 'page'),
    'sources', public.trafic_tableau(b.debut, b.fin, 'source'),
    'langues', public.trafic_tableau(b.debut, b.fin, 'langue'),
    'pays', public.trafic_tableau(b.debut, b.fin, 'pays'),
    'landings', public.trafic_tableau(b.debut, b.fin, 'landing'),
    'appareils', public.trafic_tableau(b.debut, b.fin, 'appareil'),
    'serie', serie,
    'mesure_le', now());
end $$;
revoke all on function public.ela_trafic(text) from public, anon;
grant execute on function public.ela_trafic(text) to authenticated;

-- EN DIRECT : actif = un événement dans les 5 dernières minutes. 2 min
-- oublierait quelqu'un qui lit l'écran des prix ; 15 min compterait des
-- onglets abandonnés. La liste rend la DERNIÈRE ligne de chaque session —
-- page, pays, langue, appareil, source, dernier geste — et rien de personnel.
create or replace function public.ela_trafic_direct()
returns jsonb language plpgsql stable security definer
set search_path = public, pg_temp as $$
declare b record; actifs jsonb; n int;
begin
  if not public.est_admin() then raise exception 'acces_refuse'; end if;
  select * into b from public.trafic_bornes('aujourdhui');
  with recents as (
    select distinct on (session) session, page, pays, langue, appareil, source, evenement, cree_le
    from public.evenements_site
    where cree_le > now() - interval '5 minutes'
    order by session, cree_le desc
  )
  select count(*), coalesce(jsonb_agg(jsonb_build_object(
           'page', page, 'pays', coalesce(pays, 'XX'), 'langue', langue, 'appareil', appareil,
           'source', source, 'dernier', evenement,
           'depuis_s', extract(epoch from now() - cree_le)::int) order by cree_le desc), '[]'::jsonb)
    into n, actifs
  from (select * from recents order by cree_le desc limit 20) r;
  return jsonb_build_object(
    'en_ligne', coalesce(n, 0),
    'actifs', actifs,
    'aujourdhui', public.trafic_totaux(b.debut, b.fin),
    'mesure_le', now());
end $$;
revoke all on function public.ela_trafic_direct() from public, anon;
grant execute on function public.ela_trafic_direct() to authenticated;

-- ── LA RÉTENTION : agréger la veille, effacer au-delà de 90 jours ─────────
create or replace function public.ela_trafic_retention()
returns void language plpgsql security definer
set search_path = public, pg_temp as $$
declare limite timestamptz := (((now() at time zone 'Europe/Paris')::date - 90)::timestamp) at time zone 'Europe/Paris';
begin
  insert into public.trafic_journalier (jour, page, source, langue, espace, evenement, nb, sessions, visiteurs)
  select (cree_le at time zone 'Europe/Paris')::date, page, source, langue, espace, evenement,
         count(*), count(distinct session), count(distinct visiteur)
  from public.evenements_site
  where cree_le < ((now() at time zone 'Europe/Paris')::date::timestamp) at time zone 'Europe/Paris'
  group by 1, 2, 3, 4, 5, 6
  on conflict (jour, page, source, langue, espace, evenement) do update
    set nb = excluded.nb, sessions = excluded.sessions, visiteurs = excluded.visiteurs;
  delete from public.evenements_site where cree_le < limite;
end $$;
revoke all on function public.ela_trafic_retention() from public, anon, authenticated;

do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'ela-trafic-retention';
    -- 02:20 UTC = 04:20 à Paris l'été, 03:20 l'hiver : toujours la nuit.
    perform cron.schedule('ela-trafic-retention', '20 2 * * *', 'select public.ela_trafic_retention()');
  else
    raise notice 'pg_cron absent : la rétention du trafic n''est pas planifiée ici (normal hors production)';
  end if;
end $$;

-- ── CEINTURE : un droit qui survit arrête la migration ici ────────────────
do $$
declare t text; f text;
begin
  foreach t in array array['public.evenements_site', 'public.trafic_journalier'] loop
    if has_table_privilege('anon', t, 'select') or has_table_privilege('anon', t, 'insert')
       or has_table_privilege('authenticated', t, 'select') or has_table_privilege('authenticated', t, 'insert')
       or has_table_privilege('authenticated', t, 'update') or has_table_privilege('authenticated', t, 'delete') then
      raise exception '% : un droit survit pour anon ou authenticated', t;
    end if;
  end loop;
  foreach f in array array['public.ela_mesurer_evenement(jsonb)', 'public.ela_trafic_retention()',
                           'public.trafic_totaux(timestamptz,timestamptz,text,text)',
                           'public.trafic_tableau(timestamptz,timestamptz,text)'] loop
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
