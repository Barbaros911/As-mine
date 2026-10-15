-- =====================================================================
-- LA MESURE D'AUDIENCE DES PAGES D'ACQUISITION — SANS TRACEUR
-- ---------------------------------------------------------------------
-- 14 octobre 2026, mission « SEO international » (SEO-INTERNATIONAL.md).
-- Barbaros veut savoir quelle page amène des clients : affichage, « Book »,
-- appel, WhatsApp, moteur ouvert, formulaire commencé, demande envoyée —
-- chaque geste avec la page d'où il part.
--
-- UN COMPTEUR, PAS UN JOURNAL. Une ligne par (jour, page, geste) et un
-- nombre. Ni adresse IP, ni identifiant, ni horodatage plus fin que le
-- jour, ni rien qui relie deux gestes au même visiteur : il n'y a rien à
-- protéger parce qu'il n'y a rien de personnel. C'est ce qui permet de ne
-- poser ni cookie ni bandeau (politique de confidentialité, art. 7).
--
-- CE QUE LE NAVIGATEUR PEUT, ET RIEN DE PLUS :
--   · n'importe qui (la clé publique du site) : AJOUTER 1, par
--     « ela_mesurer », avec deux mots d'une liste fermée. Ni lire, ni
--     écrire la table directement.
--   · l'ADMIN (« est_admin() ») : LIRE les totaux, par « ela_mesures_
--     acquisition ». Un agent de réservation n'a pas à lire l'audience.
--
-- UN ROBOT PEUT GONFLER LES CHIFFRES, ET C'EST ACCEPTÉ : la clé est
-- publique, comme celle du dépôt des demandes. Il ne peut ni lire, ni
-- effacer, ni remplir la base : les noms de page ont un format fermé et
-- une journée n'en compte pas plus de 60 — au-delà, un nom inconnu est
-- ignoré, les pages déjà vues ce jour-là continuent de compter. La table
-- ne peut donc pas grossir de plus de 60 × 7 lignes par jour.
-- Les chiffres qui comptent vraiment — les demandes — sont les COURSES,
-- avec leur « provenance » : elles ne passent pas par ce compteur.
--
-- REJOUABLE TANT QUE 20261015000000 N'EST PAS PASSÉE : « if not exists »,
-- « create or replace », droits retirés puis rendus. Aucune donnée créée.
-- À APPLIQUER EN PRODUCTION après la fusion (workflow « Appliquer une
-- migration Supabase », ce fichier). Avant, les appels des pages échouent
-- sans aucun effet sur le visiteur.
-- ENSUITE, CE FICHIER NE SE REJOUE PLUS (relecture du 15 octobre 2026) :
-- 20261015000000 remplace « ela_mesurer » par une version à trois
-- paramètres ; rejoué après elle, ce fichier recréerait celle à deux, et
-- le serveur refuserait TOUT appel (« fonction non unique ») — plus une
-- seule visite comptée, sans un mot. La garde ci-dessous s'arrête à la
-- première ligne, avant d'avoir rien touché.
-- Épreuves : supabase/tests/mesure.sql puis mesure-apres.sql.
-- =====================================================================

do $$ begin
  if to_regprocedure('public.est_admin()') is null then
    raise exception 'est_admin() absente : appliquer 20260929030000_role_agent_serveur.sql avant ce fichier';
  end if;
  if to_regprocedure('public.ela_mesurer(text,text,text)') is not null then
    raise exception '20261015000000_liens_suivi.sql est déjà appliquée : ce fichier ne se rejoue plus (il recréerait ela_mesurer à deux paramètres, et plus aucune visite ne serait comptée)';
  end if;
end $$;

-- ── LA TABLE ─────────────────────────────────────────────────────────
-- Les contraintes portent un nom : la fonction filtre déjà, la base
-- revérifie — une seconde défense, pas la seule.
create table if not exists public.mesures_acquisition (
  jour date not null,
  page text not null
    constraint mesures_page_format check (page ~ '^[a-z0-9-]{2,40}$'),
  evenement text not null
    constraint mesures_evenement_connu check (evenement in (
      'page_vue','clic_reserver','clic_appel','clic_whatsapp',
      'moteur_ouvert','formulaire_commence','demande_envoyee')),
  nombre integer not null default 0
    constraint mesures_nombre_positif check (nombre >= 0),
  primary key (jour, page, evenement)
);
alter table public.mesures_acquisition enable row level security;
-- AUCUNE policy, ET C'EST VOULU : personne ne lit ni n'écrit la table
-- directement. Supabase donne par défaut TOUS les droits à anon et à
-- authenticated sur ce qu'on crée : on les retire explicitement.
revoke all on table public.mesures_acquisition from public, anon, authenticated;

-- ── COMPTER UN GESTE ─────────────────────────────────────────────────
-- Un appel qui ne correspond à rien est IGNORÉ, sans erreur : une page
-- n'attend jamais la réponse, et une erreur ne lui dirait rien d'utile.
create or replace function public.ela_mesurer(p_page text, p_evenement text)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_jour date := (now() at time zone 'Europe/Paris')::date;
begin
  if p_page is null or p_page !~ '^[a-z0-9-]{2,40}$' then return; end if;
  if p_evenement is null or p_evenement not in (
      'page_vue','clic_reserver','clic_appel','clic_whatsapp',
      'moteur_ouvert','formulaire_commence','demande_envoyee') then return; end if;
  if not exists (select 1 from public.mesures_acquisition m
                  where m.jour = v_jour and m.page = p_page)
     and (select count(distinct m.page) from public.mesures_acquisition m
           where m.jour = v_jour) >= 60 then
    return;
  end if;
  insert into public.mesures_acquisition as m (jour, page, evenement, nombre)
  values (v_jour, p_page, p_evenement, 1)
  on conflict (jour, page, evenement) do update set nombre = m.nombre + 1;
end;
$$;
revoke all on function public.ela_mesurer(text, text) from public, anon, authenticated;
grant execute on function public.ela_mesurer(text, text) to anon, authenticated;

-- ── LIRE LES TOTAUX (admin seulement) ────────────────────────────────
-- Les N derniers jours, jour compris, à l'heure de Paris : 1 à 366.
create or replace function public.ela_mesures_acquisition(p_jours integer default 30)
returns table(page text, evenement text, nombre bigint)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_jours integer := greatest(1, least(coalesce(p_jours, 30), 366));
begin
  if not coalesce(public.est_admin(), false) then
    raise exception 'mesure réservée à l''admin' using errcode = '42501';
  end if;
  return query
    select m.page, m.evenement, sum(m.nombre)::bigint
      from public.mesures_acquisition m
     where m.jour > (now() at time zone 'Europe/Paris')::date - v_jours
     group by m.page, m.evenement
     order by m.page, m.evenement;
end;
$$;
revoke all on function public.ela_mesures_acquisition(integer) from public, anon, authenticated;
grant execute on function public.ela_mesures_acquisition(integer) to authenticated;
