-- =====================================================================
-- LES PROSPECTS DE LA DÉMO PROFESSIONNELS — LE SERVEUR (bloc 2)
-- ---------------------------------------------------------------------
-- 8 octobre 2026, mission « Démo professionnels » validée par Barbaros.
-- Un hôtel, une agence ou une entreprise remplit le formulaire de
-- /professionnels/ ; la fonction « demande-demo » vérifie Turnstile, écrit
-- ICI une ligne, prévient Barbaros sur Telegram et ouvre la démo.
--
-- CE QUE LE NAVIGATEUR PEUT, ET RIEN DE PLUS :
--   · un visiteur anonyme : RIEN. Ni lecture, ni écriture, ni exécution
--     d'une fonction. Toute écriture passe par « demande-demo », qui
--     appelle les trois fonctions ci-dessous avec la clé de service.
--   · l'ADMIN (« est_admin() », pas « est_exploitant() » : un agent de
--     réservation n'a pas à lire un fichier commercial) : LIRE, et
--     modifier le STATUT et la NOTE. Rien d'autre — droits par colonne.
--   · PERSONNE ne supprime depuis le site : aucun droit DELETE, aucune
--     policy de suppression. Un prospect passe « sans suite », il ne
--     disparaît pas sous un doigt.
--   · L'empreinte du jeton de confirmation et son expiration ne sont
--     lisibles par AUCUN compte connecté (droits de lecture par colonne).
--
-- AUCUNE ADRESSE IP N'EST GARDÉE. Les quotas par adresse vivent dans
-- « quota_reservations_publiques », sous une empreinte qui mêle l'heure,
-- et s'effacent seuls au bout de 70 minutes.
--
-- « domaine_pro » EST CALCULÉ PAR LA BASE (colonne générée) : une adresse
-- @gmail, @orange… est « grand public ». La fonction ne le renvoie jamais
-- au navigateur ; il sert à Barbaros à trier ses rappels.
--
-- CONSERVATION : 3 ANS APRÈS LE DERNIER CONTACT (recommandation CNIL pour
-- la prospection B2B). « dernier_contact_le » est posé par la base à la
-- demande, à la confirmation de l'adresse, à chaque ouverture de la démo
-- et à chaque changement de statut ou de note par l'admin. Il n'y a PAS de
-- purge automatique : une suppression ne se fait jamais depuis le site.
-- La purge annuelle se fait par le propriétaire du projet, en SQL :
--     delete from public.prospects
--      where dernier_contact_le < now() - interval '3 years';
-- La politique de confidentialité (bloc 4) doit dire la même durée.
--
-- REJOUABLE : « if not exists », « create or replace », policies et
-- déclencheur reposés, droits retirés puis rendus. Aucune donnée créée.
-- À APPLIQUER EN PRODUCTION après la fusion (workflow « Appliquer une
-- migration Supabase », ce fichier). Épreuves : supabase/tests/prospects.sql
-- puis prospects-apres.sql (vrai PostgreSQL).
-- =====================================================================

do $$ begin
  if to_regprocedure('public.est_admin()') is null then
    raise exception 'est_admin() absente : appliquer 20260929030000_role_agent_serveur.sql avant ce fichier';
  end if;
end $$;

-- ── L'ADRESSE GRAND PUBLIC ───────────────────────────────────────────
-- Une liste de domaines exacts, plus les grandes messageries sous toutes
-- leurs extensions nationales (hotmail.co.uk, yahoo.de…). L'extension est
-- bornée à des étiquettes de 2 ou 3 lettres : « outlook.monhotel.com »
-- reste professionnel.
create or replace function public.prospect_domaine_pro(p_email text)
returns boolean language sql immutable
set search_path = pg_catalog as $$
  select case
    when p_email is null or position('@' in p_email) = 0 then false
    else not (
      lower(split_part(p_email, '@', 2)) = any (array[
        'gmail.com','googlemail.com','outlook.com','outlook.fr','hotmail.com','hotmail.fr',
        'live.com','live.fr','msn.com','yahoo.com','yahoo.fr','ymail.com','icloud.com',
        'me.com','mac.com','orange.fr','wanadoo.fr','free.fr','sfr.fr','neuf.fr',
        'laposte.net','bbox.fr','numericable.fr','club-internet.fr','aliceadsl.fr',
        'voila.fr','aol.com','aol.fr','gmx.fr','gmx.com','gmx.de','gmx.net','protonmail.com',
        'proton.me','pm.me','yandex.com','yandex.ru','mail.com','web.de','tutanota.com',
        'tuta.io','zoho.com','libero.it','skynet.be','hey.com'])
      or lower(split_part(p_email, '@', 2))
         ~ '^(gmail|hotmail|outlook|live|yahoo|icloud|aol|gmx|yandex|orange)(\.[a-z]{2,3}){1,2}$')
  end;
$$;

-- ── LA TABLE ─────────────────────────────────────────────────────────
-- Chaque contrainte porte un NOM : la fonction a déjà validé chaque champ,
-- la base revérifie — une seconde défense, pas la seule.
create table if not exists public.prospects (
  id uuid primary key default gen_random_uuid(),
  cree_le timestamptz not null default now(),
  type text not null,
  etablissement text not null,
  nom text not null,
  fonction text,
  email text not null,
  telephone text not null,
  langue text not null default 'fr',
  domaine_pro boolean generated always as (public.prospect_domaine_pro(email)) stored,
  email_confirme_le timestamptz,
  demo_ouverte_le timestamptz,
  derniere_visite_le timestamptz,
  nb_visites integer not null default 0,
  statut text not null default 'nouveau',
  note text,
  dernier_contact_le timestamptz not null default now(),
  jeton_empreinte text,
  jeton_expire_le timestamptz,
  constraint prospects_type check (type in ('hotel','agence','entreprise')),
  constraint prospects_etablissement check (
    char_length(etablissement) between 2 and 60 and etablissement !~ '[[:cntrl:]<>]'),
  constraint prospects_nom check (
    char_length(nom) between 2 and 80 and nom !~ '[[:cntrl:]<>]'),
  constraint prospects_fonction check (fonction is null or (
    char_length(fonction) between 1 and 60 and fonction !~ '[[:cntrl:]<>]')),
  constraint prospects_email check (
    char_length(email) <= 254 and email = lower(email)
    and email ~ '^[^[:space:]@<>]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$'),
  constraint prospects_telephone check (telephone ~ '^\+[1-9][0-9]{7,14}$'),
  constraint prospects_langue check (langue in ('fr','en')),
  constraint prospects_statut check (statut in ('nouveau','contacte','rendez_vous','partenaire','sans_suite')),
  constraint prospects_note check (note is null or char_length(note) <= 2000),
  constraint prospects_visites check (nb_visites >= 0),
  constraint prospects_jeton check (
    (jeton_empreinte is null and jeton_expire_le is null)
    or (jeton_empreinte ~ '^[0-9a-f]{64}$' and jeton_expire_le is not null))
);

create index if not exists prospects_email_date on public.prospects (email, cree_le);
create unique index if not exists prospects_jeton on public.prospects (jeton_empreinte)
  where jeton_empreinte is not null;

-- ── LE DERNIER CONTACT SUIT LE GESTE DE L'ADMIN ───────────────────────
-- Invocateur : il ne fait que poser une date sur la ligne qu'on modifie.
-- Une note vidée devient NULL, jamais une chaîne d'espaces.
create or replace function public.prospects_avant_modification()
returns trigger language plpgsql
set search_path = pg_catalog, public as $$
begin
  new.note := nullif(btrim(new.note), '');
  if new.statut is distinct from old.statut or new.note is distinct from old.note then
    new.dernier_contact_le := now();
  end if;
  return new;
end $$;

drop trigger if exists prospects_avant_modification on public.prospects;
create trigger prospects_avant_modification before update on public.prospects
  for each row execute function public.prospects_avant_modification();

-- ── LES TROIS PORTES DE « demande-demo » (clé de service seulement) ───
-- « security definer » : elles écrivent avec les droits du propriétaire.
-- Elles ne sont exécutables QUE par service_role : ni anon, ni un compte
-- connecté, admin compris — l'admin passe par la table et ses policies.

-- CRÉER. Le quota par adresse e-mail est compté ICI, dans la table : le
-- compteur générique de la passerelle publique s'efface au bout de 70
-- minutes et ne sait pas compter « par jour ». Un verrou par adresse rend
-- le compte exact même sous deux demandes simultanées.
create or replace function public.ela_prospect_creer(
  p_type text, p_etablissement text, p_nom text, p_fonction text,
  p_email text, p_telephone text, p_langue text,
  p_jeton_empreinte text, p_par_jour integer default 3)
returns table(id uuid, domaine_pro boolean)
language plpgsql security definer
set search_path = public, pg_temp as $$
declare v_email text := lower(btrim(p_email)); n integer;
begin
  perform pg_advisory_xact_lock(hashtextextended('prospect|' || coalesce(v_email, ''), 0));
  select count(*) into n from public.prospects p
   where p.email = v_email and p.cree_le > now() - interval '24 hours';
  if n >= greatest(p_par_jour, 1) then
    raise exception 'quota_email' using errcode = 'P0001';
  end if;
  return query
  insert into public.prospects as p (type, etablissement, nom, fonction, email, telephone, langue,
                                     jeton_empreinte, jeton_expire_le)
  values (p_type, btrim(p_etablissement), btrim(p_nom), nullif(btrim(p_fonction), ''),
          v_email, p_telephone, coalesce(p_langue, 'fr'),
          p_jeton_empreinte, now() + interval '48 hours')
  returning p.id, p.domaine_pro;
end $$;

-- OUVRIR. Une « visite » compte une fois par demi-heure : un
-- rechargement de page n'est pas un retour du prospect.
create or replace function public.ela_prospect_ouvrir(p_id uuid)
returns boolean language plpgsql security definer
set search_path = public, pg_temp as $$
declare n integer;
begin
  update public.prospects p set
    demo_ouverte_le = coalesce(p.demo_ouverte_le, now()),
    nb_visites = p.nb_visites + case
      when p.derniere_visite_le is null or p.derniere_visite_le < now() - interval '30 minutes'
      then 1 else 0 end,
    derniere_visite_le = now(),
    dernier_contact_le = now()
   where p.id = p_id;
  get diagnostics n = row_count;
  return n = 1;
end $$;

-- CONFIRMER. Usage unique : l'empreinte est EFFACÉE dans la même
-- instruction qui pose la date — un second appui ne trouve plus rien.
-- Expiré : refusé, et l'empreinte morte reste jusqu'à la prochaine demande.
create or replace function public.ela_prospect_confirmer(p_empreinte text)
returns boolean language plpgsql security definer
set search_path = public, pg_temp as $$
declare n integer;
begin
  if p_empreinte is null or p_empreinte !~ '^[0-9a-f]{64}$' then return false; end if;
  update public.prospects p set
    email_confirme_le = coalesce(p.email_confirme_le, now()),
    dernier_contact_le = now(),
    jeton_empreinte = null,
    jeton_expire_le = null
   where p.jeton_empreinte = p_empreinte and p.jeton_expire_le > now();
  get diagnostics n = row_count;
  return n = 1;
end $$;

-- ── LES DROITS ───────────────────────────────────────────────────────
-- On RETIRE d'abord tout : les privilèges par défaut de Supabase donnent
-- TOUT à anon et à authenticated sur ce qui est créé dans « public »
-- (leçon de 20261005000000_vues_lecture_seule.sql).
alter table public.prospects enable row level security;
revoke all on table public.prospects from public, anon, authenticated;
grant select (id, cree_le, type, etablissement, nom, fonction, email, telephone, langue,
              domaine_pro, email_confirme_le, demo_ouverte_le, derniere_visite_le,
              nb_visites, statut, note, dernier_contact_le)
  on table public.prospects to authenticated;
grant update (statut, note) on table public.prospects to authenticated;

revoke all on function public.prospect_domaine_pro(text) from public, anon;
grant execute on function public.prospect_domaine_pro(text) to authenticated;
revoke all on function public.prospects_avant_modification() from public, anon, authenticated;
revoke all on function public.ela_prospect_creer(text,text,text,text,text,text,text,text,integer)
  from public, anon, authenticated;
revoke all on function public.ela_prospect_ouvrir(uuid) from public, anon, authenticated;
revoke all on function public.ela_prospect_confirmer(text) from public, anon, authenticated;
grant execute on function public.ela_prospect_creer(text,text,text,text,text,text,text,text,integer) to service_role;
grant execute on function public.ela_prospect_ouvrir(uuid) to service_role;
grant execute on function public.ela_prospect_confirmer(text) to service_role;

drop policy if exists "prospects lecture" on public.prospects;
drop policy if exists "prospects modification" on public.prospects;
create policy "prospects lecture" on public.prospects
  for select to authenticated using ((select public.est_admin()));
create policy "prospects modification" on public.prospects
  for update to authenticated using ((select public.est_admin()))
  with check ((select public.est_admin()));

-- ── LE CONTRÔLE QUI ARRÊTE LA MIGRATION ───────────────────────────────
-- Un droit qui survit ne se voit pas : la migration s'arrête plutôt que
-- de laisser un prospect lisible par anon.
do $$
declare p text;
begin
  foreach p in array array['SELECT','INSERT','UPDATE','REFERENCES'] loop
    if has_any_column_privilege('anon', 'public.prospects', p) then
      raise exception 'anon a encore % sur prospects', p; end if;
  end loop;
  foreach p in array array['DELETE','TRUNCATE','TRIGGER'] loop
    if has_table_privilege('anon', 'public.prospects', p)
       or has_table_privilege('authenticated', 'public.prospects', p) then
      raise exception '% accordé sur prospects', p; end if;
  end loop;
  if has_column_privilege('authenticated', 'public.prospects', 'jeton_empreinte', 'SELECT') then
    raise exception 'l''empreinte du jeton est lisible depuis le navigateur'; end if;
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'prospects'
              and (cmd in ('DELETE','ALL','INSERT') or roles::text <> '{authenticated}')) then
    raise exception 'une policy de prospects est ouverte à autre chose que l''admin'; end if;
  if exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
              where n.nspname = 'public' and c.relkind in ('v','m')
                and has_table_privilege('anon', c.oid, 'SELECT')
                and pg_get_viewdef(c.oid) ilike '%prospects%') then
    raise exception 'une vue lisible par anon lit les prospects'; end if;
end $$;
