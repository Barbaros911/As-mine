-- =====================================================================
-- LES LIENS DE SUIVI — QUEL PARTENAIRE AMÈNE DES CLIENTS
-- ---------------------------------------------------------------------
-- 15 octobre 2026, Prompt 3 (SEO-AUTORITE.md, § 12). Barbaros : « oui, je
-- veux un suivi ». La mesure du 14/10 dit QUELLE PAGE travaille ; elle ne
-- dit pas QUI a envoyé le visiteur. Un hôtel, un office de tourisme ou un
-- annuaire qui pose un lien vers le site reçoit maintenant SON lien :
-- « …/en/cdg-airport-transfer-paris/?via=hotel-exemple ».
--
-- UN CODE PAR PARTENAIRE, UNE LISTE FERMÉE TENUE PAR L'ADMIN. Le code ne
-- compte que s'il existe dans « liens_suivi » : un code inventé dans une
-- adresse est compté comme une visite sans source, jamais créé. C'est la
-- règle du site : rien de ce qu'on tape dans l'adresse n'entre tel quel.
--
-- LA LISTE N'EST LISIBLE QUE PAR L'ADMIN. Elle nomme des partenaires, et
-- un partenariat n'est pas forcément public (easyHotel, CLAUDE.md) : une
-- vue ouverte à anon publierait la liste à qui la demande. Le navigateur
-- envoie le code ; c'est le SERVEUR qui le reconnaît (ici pour la mesure,
-- dans « deposer-course » pour une demande).
--
-- LE COMPTEUR GAGNE UNE COLONNE, PAS UN JOURNAL. « source » s'ajoute à la
-- clé (jour, page, geste) : toujours des totaux par jour, toujours rien de
-- personnel. Une visite sans lien a la source vide.
--
-- « ela_mesurer » GARDE SON NOM ET SES DEUX PREMIERS PARAMÈTRES. Un
-- troisième, « p_source », a une valeur par défaut : les pages déjà en
-- cache sur un téléphone, qui n'envoient que deux mots, comptent comme
-- avant. L'ancienne fonction à deux paramètres est RETIRÉE : deux
-- fonctions du même nom feraient refuser l'appel par le serveur (il ne
-- saurait pas laquelle choisir).
--
-- PAS DE SUPPRESSION D'UN LIEN : il a peut-être déjà amené des courses,
-- qui portent son code. Un partenariat qui s'arrête garde son historique.
--
-- REJOUABLE : « if not exists », « create or replace », droits retirés
-- puis rendus, clé primaire refaite seulement si elle n'a pas la bonne
-- forme. À APPLIQUER EN PRODUCTION après la fusion (workflow « Appliquer
-- une migration Supabase », ce fichier), APRÈS 20261014000000. Avant, un
-- « via » est simplement ignoré : la visite compte, sans source.
-- Épreuves : supabase/tests/mesure.sql (décor) puis liens-suivi-apres.sql.
-- =====================================================================

do $$ begin
  if to_regprocedure('public.est_admin()') is null then
    raise exception 'est_admin() absente : appliquer 20260929030000_role_agent_serveur.sql avant ce fichier';
  end if;
  if to_regclass('public.mesures_acquisition') is null then
    raise exception 'mesures_acquisition absente : appliquer 20261014000000_mesure_acquisition.sql avant ce fichier';
  end if;
end $$;

-- ── LA LISTE DES LIENS ─────────────────────────────────────────────────
create table if not exists public.liens_suivi (
  code text primary key
    constraint liens_suivi_code_format check (code ~ '^[a-z0-9-]{2,40}$'),
  nom text not null
    constraint liens_suivi_nom_longueur check (char_length(btrim(nom)) between 1 and 80),
  cree_le timestamptz not null default now()
);
alter table public.liens_suivi enable row level security;
revoke all on table public.liens_suivi from public, anon, authenticated;
grant select, insert on table public.liens_suivi to authenticated;

drop policy if exists "liens_suivi admin lit" on public.liens_suivi;
create policy "liens_suivi admin lit" on public.liens_suivi
  for select to authenticated using (coalesce(public.est_admin(), false));
drop policy if exists "liens_suivi admin cree" on public.liens_suivi;
create policy "liens_suivi admin cree" on public.liens_suivi
  for insert to authenticated with check (coalesce(public.est_admin(), false));

-- Le QR code de la fiche papier remise aux hôtels pointe sur ce code : il
-- doit exister dès le premier jour, sinon les premières visites venues de
-- la fiche compteraient sans source.
insert into public.liens_suivi (code, nom)
values ('fiche-hotels', 'Fiche papier remise aux hôtels')
on conflict (code) do nothing;

-- ── LE COMPTEUR APPREND LA SOURCE ──────────────────────────────────────
alter table public.mesures_acquisition
  add column if not exists source text not null default '';
do $$ begin
  if not exists (select 1 from pg_constraint
                  where conrelid = 'public.mesures_acquisition'::regclass
                    and conname = 'mesures_source_format') then
    alter table public.mesures_acquisition add constraint mesures_source_format
      check (source = '' or source ~ '^[a-z0-9-]{2,40}$');
  end if;
end $$;

-- La clé primaire inclut la source. Refaite seulement si elle ne l'inclut
-- pas encore : son nom est lu dans le catalogue, jamais supposé.
do $$
declare v_nom text; v_cols text;
begin
  select c.conname,
         string_agg(a.attname, ',' order by k.ord)
    into v_nom, v_cols
    from pg_constraint c
    cross join lateral unnest(c.conkey) with ordinality as k(attnum, ord)
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.attnum
   where c.conrelid = 'public.mesures_acquisition'::regclass and c.contype = 'p'
   group by c.conname;
  if v_cols is distinct from 'jour,page,evenement,source' then
    if v_nom is not null then
      execute format('alter table public.mesures_acquisition drop constraint %I', v_nom);
    end if;
    alter table public.mesures_acquisition
      add constraint mesures_acquisition_pkey primary key (jour, page, evenement, source);
  end if;
end $$;

-- ── COMPTER, AVEC OU SANS SOURCE ───────────────────────────────────────
drop function if exists public.ela_mesurer(text, text);
create or replace function public.ela_mesurer(p_page text, p_evenement text, p_source text default null)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_jour date := (now() at time zone 'Europe/Paris')::date;
  v_source text := '';
begin
  if p_page is null or p_page !~ '^[a-z0-9-]{2,40}$' then return; end if;
  if p_evenement is null or p_evenement not in (
      'page_vue','clic_reserver','clic_appel','clic_whatsapp',
      'moteur_ouvert','formulaire_commence','demande_envoyee') then return; end if;
  -- Un code inconnu ne crée rien : la visite compte, sans source.
  if p_source is not null and p_source ~ '^[a-z0-9-]{2,40}$'
     and exists (select 1 from public.liens_suivi l where l.code = p_source) then
    v_source := p_source;
  end if;
  if not exists (select 1 from public.mesures_acquisition m
                  where m.jour = v_jour and m.page = p_page)
     and (select count(distinct m.page) from public.mesures_acquisition m
           where m.jour = v_jour) >= 60 then
    return;
  end if;
  insert into public.mesures_acquisition as m (jour, page, evenement, source, nombre)
  values (v_jour, p_page, p_evenement, v_source, 1)
  on conflict (jour, page, evenement, source) do update set nombre = m.nombre + 1;
end;
$$;
revoke all on function public.ela_mesurer(text, text, text) from public, anon, authenticated;
grant execute on function public.ela_mesurer(text, text, text) to anon, authenticated;

-- ── LIRE, PAR LIEN (ADMIN SEUL) ────────────────────────────────────────
create or replace function public.ela_mesures_liens(p_jours integer default 30)
returns table(source text, evenement text, nombre bigint)
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
    select m.source, m.evenement, sum(m.nombre)::bigint
      from public.mesures_acquisition m
     where m.source <> ''
       and m.jour > (now() at time zone 'Europe/Paris')::date - v_jours
     group by m.source, m.evenement
     order by m.source, m.evenement;
end;
$$;
revoke all on function public.ela_mesures_liens(integer) from public, anon, authenticated;
grant execute on function public.ela_mesures_liens(integer) to authenticated;
