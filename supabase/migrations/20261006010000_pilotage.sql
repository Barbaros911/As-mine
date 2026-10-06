-- =====================================================================
-- LE PILOTAGE — LA FONDATION SERVEUR (Issue #197, bloc 1 sur 3)
-- ---------------------------------------------------------------------
-- 6 octobre 2026. Le cockpit interne d'Elatransfer : ce qu'il faut faire,
-- ce qui bloque, ce qui attend la validation de Barbaros, ce qui est
-- vraiment terminé — sur deux tableaux, PRODUIT et OPÉRATIONS.
--
-- CE N'EST PAS LE TABLEAU DES COURSES, ET RIEN ICI NE LE TOUCHE.
-- Aucune table, aucune fonction, aucune policy des réservations n'est lue
-- ni modifiée. Deux tables neuves, préfixées « pilotage_ ».
--
-- CE QUE LE NAVIGATEUR PEUT, ET RIEN DE PLUS :
--   · LIRE ET ÉCRIRE réservé à l'ADMIN (« est_admin() », posée par
--     20260929030000_role_agent_serveur.sql). Pas « est_exploitant() » :
--     l'agent de réservation n'a pas à lire les cartes Finance ou Société.
--     Un anonyme n'a AUCUN droit ; un compte connecté qui n'est pas admin
--     lit zéro ligne et n'écrit rien.
--   · ÉCRIRE SEULEMENT LES CHAMPS DE LA CARTE (droits par colonne).
--     L'identifiant, les dates, la version, la date d'archivage et de fin
--     sont posés par la base : le navigateur n'a même pas le droit de les
--     envoyer.
--   · JAMAIS SUPPRIMER. Aucun droit DELETE, aucune policy de suppression.
--     On archive, on restaure. Une purge exceptionnelle (une carte créée
--     avec une donnée qui n'avait rien à y faire) se fait en SQL par le
--     propriétaire du projet, jamais depuis l'écran.
--
-- LES RÈGLES SONT DANS LA BASE, PAS DANS L'ÉCRAN — une règle d'écran se
-- contourne d'un appel direct (leçon du rôle agent, 29/09/2026) :
--   · « Terminé » exige que TOUTE la checklist soit cochée, et une carte
--     bloquée ne peut pas être terminée ;
--   · une idée peut rester sans catégorie ; dès « À faire », il en faut une,
--     et elle doit appartenir à SON tableau ;
--   · « bloqué » exige une raison (« qui ou quoi ? ») ;
--   · une carte archivée ne se modifie pas : on la restaure d'abord ;
--   · une dépendance vise une carte qui existe, jamais la carte elle-même ;
--   · le lien GitHub ne peut viser qu'une Issue ou une PR de ce dépôt — pas
--     une adresse quelconque, ni un « javascript: ».
--
-- LA VERSION, COMME LES COURSES (20261002000000). Elle monte à chaque
-- écriture. Le navigateur écrit « modifie la version N » : si le téléphone
-- et l'ordinateur modifient la même carte, le second ne peut pas écraser le
-- premier sans le savoir.
--
-- LE JOURNAL EST ÉCRIT PAR LA BASE SEULE (déclencheur), lisible par
-- l'admin, modifiable par PERSONNE depuis le navigateur. Il garde l'avant
-- et l'après pour le statut, la priorité, le responsable, le tableau, la
-- catégorie, l'échéance, le blocage (avec sa raison) et l'archivage. Pour
-- les champs libres (titre, description, prochaine action, checklist…) il
-- ne garde que le NOM du champ modifié, jamais son contenu : un secret
-- collé par erreur dans une description s'efface vraiment en corrigeant la
-- carte, au lieu de survivre pour toujours dans l'historique.
--
-- REJOUABLE : « if not exists », « create or replace », policies et
-- déclencheurs reposés. Aucune carte n'est créée : pas de donnée de
-- démonstration en production.
-- À APPLIQUER EN PRODUCTION après la fusion (workflow « Appliquer une
-- migration Supabase », ce fichier). Épreuves : supabase/tests/pilotage*.sql
-- (vrai PostgreSQL) et supabase/tests/pilotage-http.mjs (PostgREST).
-- =====================================================================

do $$ begin
  if to_regprocedure('public.est_admin()') is null then
    raise exception 'est_admin() absente : appliquer 20260929030000_role_agent_serveur.sql avant ce fichier';
  end if;
end $$;

-- ── LES RÉFÉRENTIELS ─────────────────────────────────────────────────
-- Les listes vivent ici et dans pilotage.js (les libellés). Une épreuve
-- lit les deux et exige qu'elles soient identiques : deux listes qui
-- divergent ne se voient pas — c'est le jour où l'écran propose une
-- catégorie que la base refuse.
-- « Lancement » n'est PAS une catégorie : une carte « SIRET » serait à la
-- fois Société et Lancement, donc introuvable par filtre. Le lancement se
-- suit par l'échéance et la priorité. « Supports » est dans « Marketing ».
-- COALESCE : un « in » sur une valeur nulle rend NULL, et une contrainte
-- CHECK laisse passer NULL. Sans lui, une catégorie absente passerait
-- partout.
create or replace function public.pilotage_categorie_valide(p_tableau text, p_categorie text)
returns boolean language sql immutable
set search_path = pg_catalog as $$
  select coalesce(case p_tableau
    when 'produit' then p_categorie in ('site_public','reservation','admin','hotel',
      'chauffeurs','paiement','seo','securite','infrastructure')
    when 'operations' then p_categorie in ('hotels','chauffeurs','commercial','societe',
      'finance','conformite','marketing')
  end, false);
$$;

-- La checklist : une liste d'au plus 20 critères { texte, fait }, rien
-- d'autre. En plpgsql et pas en SQL : les tests s'enchaînent dans un ordre
-- GARANTI. Un « and » SQL ne promet aucun ordre d'évaluation, et
-- « jsonb_array_length » sur un objet lève une erreur au lieu de rendre faux.
create or replace function public.pilotage_checklist_valide(p jsonb)
returns boolean language plpgsql immutable
set search_path = pg_catalog as $$
declare e jsonb;
begin
  if p is null or jsonb_typeof(p) <> 'array' or jsonb_array_length(p) > 20 then
    return false;
  end if;
  for e in select x from jsonb_array_elements(p) as t(x) loop
    if jsonb_typeof(e) <> 'object' then return false; end if;
    if (select count(*) from jsonb_object_keys(e)) <> 2 then return false; end if;
    if jsonb_typeof(e->'texte') is distinct from 'string'
       or jsonb_typeof(e->'fait') is distinct from 'boolean' then return false; end if;
    if char_length(btrim(e->>'texte')) not between 1 and 200 then return false; end if;
  end loop;
  return true;
end $$;

create or replace function public.pilotage_checklist_complete(p jsonb)
returns boolean language sql immutable
set search_path = pg_catalog as $$
  select case when jsonb_typeof(p) = 'array'
    then not exists (select 1 from jsonb_array_elements(p) as t(e)
                      where (e->>'fait') is distinct from 'true')
    else false end;
$$;

-- ── LES CARTES ───────────────────────────────────────────────────────
-- Chaque contrainte porte un NOM : c'est lui que rend le serveur quand il
-- refuse, et pilotage.js le traduit en phrase.
create table if not exists public.pilotage_cartes (
  id uuid primary key default gen_random_uuid(),
  tableau text not null,
  categorie text,
  titre text not null,
  description text not null default '',
  statut text not null default 'idee',
  priorite text not null default 'P2',
  responsable text,
  prochaine_action text,
  impacts text[] not null default '{}',
  echeance date,
  bloque boolean not null default false,
  raison_blocage text,
  dependances uuid[] not null default '{}',
  checklist jsonb not null default '[]'::jsonb,
  lien_github text,
  archivee boolean not null default false,
  archivee_le timestamptz,
  termine_le timestamptz,
  version integer not null default 1,
  cree_le timestamptz not null default now(),
  modifie_le timestamptz not null default now(),
  constraint pilotage_cartes_tableau check (tableau in ('produit','operations')),
  constraint pilotage_cartes_statut check (statut in ('idee','a_faire','en_cours','a_valider','termine')),
  constraint pilotage_cartes_priorite check (priorite in ('P0','P1','P2','P3')),
  constraint pilotage_cartes_categorie check (
    (categorie is null and statut = 'idee')
    or (categorie is not null and public.pilotage_categorie_valide(tableau, categorie))),
  constraint pilotage_cartes_titre check (
    char_length(titre) between 3 and 120 and titre !~ '[[:cntrl:]]'),
  constraint pilotage_cartes_description check (char_length(description) <= 4000),
  constraint pilotage_cartes_responsable check (responsable is null or (
    char_length(responsable) between 1 and 40 and responsable !~ '[[:cntrl:]]')),
  constraint pilotage_cartes_prochaine_action check (prochaine_action is null or (
    char_length(prochaine_action) between 1 and 200 and prochaine_action !~ '[[:cntrl:]]')),
  constraint pilotage_cartes_impacts check (
    impacts <@ array['ca','client','hotel','securite','conformite','croissance','cout','image']::text[]
    and array_position(impacts, null) is null),
  constraint pilotage_cartes_blocage check (
    (bloque and raison_blocage is not null and char_length(raison_blocage) between 3 and 200
       and raison_blocage !~ '[[:cntrl:]]')
    or (not bloque and raison_blocage is null)),
  constraint pilotage_cartes_termine_debloque check (not (bloque and statut = 'termine')),
  constraint pilotage_cartes_checklist check (public.pilotage_checklist_valide(checklist)),
  constraint pilotage_cartes_termine_checklist check (
    statut <> 'termine' or public.pilotage_checklist_complete(checklist)),
  constraint pilotage_cartes_dependances check (
    cardinality(dependances) <= 10 and array_position(dependances, null) is null),
  constraint pilotage_cartes_lien_github check (lien_github is null
    or lien_github ~* '^https://github\.com/barbaros911/as-mine/(issues|pull)/[1-9][0-9]{0,5}$'),
  constraint pilotage_cartes_echeance check (
    echeance is null or echeance between date '2020-01-01' and date '2100-12-31'),
  constraint pilotage_cartes_archive check (archivee = (archivee_le is not null)),
  constraint pilotage_cartes_termine_le check ((statut = 'termine') = (termine_le is not null))
);
create index if not exists pilotage_cartes_actives
  on public.pilotage_cartes (tableau, statut) where not archivee;

-- ── LE JOURNAL ───────────────────────────────────────────────────────
-- « on delete restrict » : une carte qui a un historique ne disparaît pas
-- en emportant les preuves — et de toute façon, rien ne se supprime.
create table if not exists public.pilotage_journal (
  id bigint generated always as identity primary key,
  carte_id uuid not null references public.pilotage_cartes(id) on delete restrict,
  action text not null,
  avant jsonb,
  apres jsonb,
  acteur uuid,
  cree_le timestamptz not null default now(),
  constraint pilotage_journal_action check (action in ('creation','statut','priorite',
    'responsable','tableau','categorie','echeance','blocage','deblocage','archivage',
    'restauration','contenu'))
);
-- Trié par « id » et non par date : deux lignes d'une même écriture ont la
-- même heure, l'identifiant garde leur ordre.
create index if not exists pilotage_journal_carte on public.pilotage_journal (carte_id, id desc);

-- ── AVANT CHAQUE ÉCRITURE : CE QUE LA BASE DÉCIDE SEULE ─────────────────
-- Invocateur (pas « security definer ») : la recherche des dépendances voit
-- ce que l'appelant a le droit de voir, pas davantage.
create or replace function public.pilotage_avant_ecriture()
returns trigger language plpgsql
set search_path = public, pg_temp as $$
declare n integer;
begin
  if tg_op = 'INSERT' then
    new.version := 1;
    new.cree_le := now();
    new.archivee := false;
    new.archivee_le := null;
  else
    if new.id is distinct from old.id then
      raise exception 'pilotage_identifiant_immuable';
    end if;
    -- Une carte archivée ne se modifie pas : on la restaure d'abord. Sinon
    -- elle changerait sans que personne ne la voie — elle n'est plus sur
    -- aucun tableau.
    if old.archivee and new.archivee then
      raise exception 'pilotage_carte_archivee';
    end if;
    new.cree_le := old.cree_le;
    new.version := old.version + 1;
    new.archivee_le := case
      when new.archivee and not old.archivee then now()
      when new.archivee then old.archivee_le
      else null end;
  end if;
  new.modifie_le := now();

  -- « Terminé le » : posé au passage, gardé tant que la carte y reste,
  -- effacé si on la rouvre.
  if new.statut = 'termine' then
    new.termine_le := case when tg_op = 'UPDATE' and old.statut = 'termine'
                           then old.termine_le else now() end;
  else
    new.termine_le := null;
  end if;

  -- Les espaces autour ne font pas une autre valeur, et un champ facultatif
  -- vide est un champ absent. Une liste envoyée NULLE est une liste vide, et
  -- « bloqué » nul veut dire non : PostgREST transmet un null explicite tel
  -- quel, sans appliquer le défaut de la colonne.
  new.bloque := coalesce(new.bloque, false);
  new.checklist := coalesce(new.checklist, '[]'::jsonb);
  new.titre := btrim(new.titre);
  new.description := btrim(coalesce(new.description, ''));
  new.categorie := nullif(btrim(new.categorie), '');
  new.responsable := nullif(btrim(new.responsable), '');
  new.prochaine_action := nullif(btrim(new.prochaine_action), '');
  new.lien_github := nullif(btrim(new.lien_github), '');
  new.raison_blocage := case when new.bloque then nullif(btrim(new.raison_blocage), '') end;
  new.impacts := array(select distinct x from unnest(coalesce(new.impacts, '{}')) as t(x)
                        where x is not null order by 1);
  new.dependances := array(select distinct d from unnest(coalesce(new.dependances, '{}')) as t(d)
                            where d is not null order by 1);
  if pilotage_checklist_valide(new.checklist) then
    new.checklist := coalesce((
      select jsonb_agg(jsonb_build_object('texte', btrim(e->>'texte'), 'fait', (e->'fait')::boolean)
                       order by o)
        from jsonb_array_elements(new.checklist) with ordinality as t(e, o)), '[]'::jsonb);
  end if;

  if new.id = any(new.dependances) then
    raise exception 'pilotage_dependance_elle_meme';
  end if;
  if cardinality(new.dependances) > 0 then
    select count(*) into n from public.pilotage_cartes c where c.id = any(new.dependances);
    if n <> cardinality(new.dependances) then
      raise exception 'pilotage_dependance_inconnue';
    end if;
  end if;
  return new;
end $$;

-- ── APRÈS CHAQUE ÉCRITURE : LE JOURNAL ─────────────────────────────────
-- « security definer » : c'est la SEULE porte d'écriture du journal, que
-- personne d'autre ne peut écrire. Elle ne se déclenche qu'après une
-- écriture que la RLS a déjà acceptée — donc seulement pour l'admin.
create or replace function public.pilotage_journaliser()
returns trigger language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  qui uuid := auth.uid();
  champs text[] := '{}';
begin
  if tg_op = 'INSERT' then
    insert into public.pilotage_journal(carte_id, action, avant, apres, acteur)
    values (new.id, 'creation', null, jsonb_build_object(
      'tableau', new.tableau, 'categorie', new.categorie, 'statut', new.statut,
      'priorite', new.priorite, 'responsable', new.responsable, 'echeance', new.echeance,
      'bloque', new.bloque, 'raison', new.raison_blocage), qui);
    return null;
  end if;

  if new.statut is distinct from old.statut then
    insert into public.pilotage_journal(carte_id, action, avant, apres, acteur) values
      (new.id, 'statut', jsonb_build_object('statut', old.statut), jsonb_build_object('statut', new.statut), qui);
  end if;
  if new.priorite is distinct from old.priorite then
    insert into public.pilotage_journal(carte_id, action, avant, apres, acteur) values
      (new.id, 'priorite', jsonb_build_object('priorite', old.priorite), jsonb_build_object('priorite', new.priorite), qui);
  end if;
  if new.responsable is distinct from old.responsable then
    insert into public.pilotage_journal(carte_id, action, avant, apres, acteur) values
      (new.id, 'responsable', jsonb_build_object('responsable', old.responsable), jsonb_build_object('responsable', new.responsable), qui);
  end if;
  if new.tableau is distinct from old.tableau then
    insert into public.pilotage_journal(carte_id, action, avant, apres, acteur) values
      (new.id, 'tableau', jsonb_build_object('tableau', old.tableau), jsonb_build_object('tableau', new.tableau), qui);
  end if;
  if new.categorie is distinct from old.categorie then
    insert into public.pilotage_journal(carte_id, action, avant, apres, acteur) values
      (new.id, 'categorie', jsonb_build_object('categorie', old.categorie), jsonb_build_object('categorie', new.categorie), qui);
  end if;
  if new.echeance is distinct from old.echeance then
    insert into public.pilotage_journal(carte_id, action, avant, apres, acteur) values
      (new.id, 'echeance', jsonb_build_object('echeance', old.echeance), jsonb_build_object('echeance', new.echeance), qui);
  end if;
  if new.bloque is distinct from old.bloque or new.raison_blocage is distinct from old.raison_blocage then
    insert into public.pilotage_journal(carte_id, action, avant, apres, acteur) values
      (new.id, case when new.bloque then 'blocage' else 'deblocage' end,
       jsonb_build_object('bloque', old.bloque, 'raison', old.raison_blocage),
       jsonb_build_object('bloque', new.bloque, 'raison', new.raison_blocage), qui);
  end if;
  if new.archivee is distinct from old.archivee then
    insert into public.pilotage_journal(carte_id, action, avant, apres, acteur) values
      (new.id, case when new.archivee then 'archivage' else 'restauration' end,
       jsonb_build_object('archivee', old.archivee), jsonb_build_object('archivee', new.archivee), qui);
  end if;

  -- Les champs libres : le NOM du champ, jamais son contenu.
  if new.titre is distinct from old.titre then champs := array_append(champs, 'titre'); end if;
  if new.description is distinct from old.description then champs := array_append(champs, 'description'); end if;
  if new.prochaine_action is distinct from old.prochaine_action then champs := array_append(champs, 'prochaine_action'); end if;
  if new.impacts is distinct from old.impacts then champs := array_append(champs, 'impacts'); end if;
  if new.dependances is distinct from old.dependances then champs := array_append(champs, 'dependances'); end if;
  if new.checklist is distinct from old.checklist then champs := array_append(champs, 'checklist'); end if;
  if new.lien_github is distinct from old.lien_github then champs := array_append(champs, 'lien_github'); end if;
  if cardinality(champs) > 0 then
    insert into public.pilotage_journal(carte_id, action, avant, apres, acteur) values
      (new.id, 'contenu', null, jsonb_build_object('champs', to_jsonb(champs)), qui);
  end if;
  return null;
end $$;

drop trigger if exists pilotage_cartes_avant on public.pilotage_cartes;
create trigger pilotage_cartes_avant
  before insert or update on public.pilotage_cartes
  for each row execute function public.pilotage_avant_ecriture();
drop trigger if exists pilotage_cartes_journal on public.pilotage_cartes;
create trigger pilotage_cartes_journal
  after insert or update on public.pilotage_cartes
  for each row execute function public.pilotage_journaliser();

-- ── LES DROITS ───────────────────────────────────────────────────────
-- SUPABASE ACCORDE TOUT, PAR DÉFAUT, À « anon » ET « authenticated » sur ce
-- qu'on crée dans « public » — y compris TRUNCATE, que la RLS ne filtre
-- pas. On retire donc TOUT, puis on rend ce qui sert, colonne par colonne.
alter table public.pilotage_cartes enable row level security;
alter table public.pilotage_journal enable row level security;

revoke all on table public.pilotage_cartes, public.pilotage_journal from public, anon, authenticated;
do $$ begin
  execute format('revoke all on sequence %s from public, anon, authenticated',
                 pg_get_serial_sequence('public.pilotage_journal', 'id'));
end $$;

grant select on table public.pilotage_cartes, public.pilotage_journal to authenticated;
grant insert (tableau, categorie, titre, description, statut, priorite, responsable,
              prochaine_action, impacts, echeance, bloque, raison_blocage, dependances,
              checklist, lien_github)
  on public.pilotage_cartes to authenticated;
grant update (tableau, categorie, titre, description, statut, priorite, responsable,
              prochaine_action, impacts, echeance, bloque, raison_blocage, dependances,
              checklist, lien_github, archivee)
  on public.pilotage_cartes to authenticated;

-- Les déclencheurs ne s'appellent pas : personne ne les exécute à la main.
revoke all on function public.pilotage_avant_ecriture() from public, anon, authenticated;
revoke all on function public.pilotage_journaliser() from public, anon, authenticated;
-- Les trois contrôles servent aux contraintes CHECK, que PostgreSQL évalue
-- avec les droits de l'appelant : l'admin doit pouvoir les exécuter. Ils ne
-- lisent rien et ne rendent qu'un booléen. Rien pour « anon ».
revoke all on function public.pilotage_categorie_valide(text, text) from public, anon;
revoke all on function public.pilotage_checklist_valide(jsonb) from public, anon;
revoke all on function public.pilotage_checklist_complete(jsonb) from public, anon;
grant execute on function public.pilotage_categorie_valide(text, text) to authenticated;
grant execute on function public.pilotage_checklist_valide(jsonb) to authenticated;
grant execute on function public.pilotage_checklist_complete(jsonb) to authenticated;

drop policy if exists "pilotage lecture" on public.pilotage_cartes;
drop policy if exists "pilotage creation" on public.pilotage_cartes;
drop policy if exists "pilotage modification" on public.pilotage_cartes;
create policy "pilotage lecture" on public.pilotage_cartes
  for select to authenticated using ((select public.est_admin()));
create policy "pilotage creation" on public.pilotage_cartes
  for insert to authenticated with check ((select public.est_admin()));
create policy "pilotage modification" on public.pilotage_cartes
  for update to authenticated using ((select public.est_admin())) with check ((select public.est_admin()));

drop policy if exists "pilotage journal lecture" on public.pilotage_journal;
create policy "pilotage journal lecture" on public.pilotage_journal
  for select to authenticated using ((select public.est_admin()));

comment on table public.pilotage_cartes is
  'Pilotage interne d''Elatransfer (Issue #197) : cartes Produit et Opérations. Distinct des courses. Admin seul, aucune suppression.';
comment on table public.pilotage_journal is
  'Journal du Pilotage, écrit par déclencheur seulement. Ne garde jamais le contenu des champs libres.';

-- ── LE CONTRÔLE QUI ARRÊTE LA MIGRATION PLUTÔT QUE DE LAISSER UN TROU ──
-- Si un droit survit (un défaut de Supabase qui changerait, un rejeu
-- partiel), on s'arrête à voix haute au lieu de laisser la table ouverte.
-- « has_any_column_privilege » et pas seulement « has_table_privilege » :
-- le second ne voit pas un droit accordé colonne par colonne.
do $$
declare
  t text;
  p text;
begin
  foreach t in array array['public.pilotage_cartes', 'public.pilotage_journal'] loop
    foreach p in array array['SELECT','INSERT','UPDATE','REFERENCES'] loop
      if has_any_column_privilege('anon', t, p) then
        raise exception 'anon garde % sur %', p, t;
      end if;
    end loop;
    foreach p in array array['DELETE','TRUNCATE','TRIGGER'] loop
      if has_table_privilege('anon', t, p) or has_table_privilege('authenticated', t, p) then
        raise exception '% reste accordé sur %', p, t;
      end if;
    end loop;
    if has_any_column_privilege('authenticated', t, 'REFERENCES') then
      raise exception 'authenticated garde REFERENCES sur %', t;
    end if;
    if not (select relrowsecurity from pg_class where oid = t::regclass) then
      raise exception 'RLS inactive sur %', t;
    end if;
  end loop;
  if has_any_column_privilege('authenticated', 'public.pilotage_journal', 'INSERT')
     or has_any_column_privilege('authenticated', 'public.pilotage_journal', 'UPDATE') then
    raise exception 'le journal est modifiable depuis le navigateur';
  end if;
  foreach p in array array['id','version','cree_le','modifie_le','archivee_le','termine_le'] loop
    if has_column_privilege('authenticated', 'public.pilotage_cartes', p, 'INSERT')
       or has_column_privilege('authenticated', 'public.pilotage_cartes', p, 'UPDATE') then
      raise exception 'le navigateur peut écrire « % », que seule la base pose', p;
    end if;
  end loop;
  if exists (select 1 from pg_policies where schemaname = 'public'
              and tablename in ('pilotage_cartes', 'pilotage_journal')
              and (cmd = 'DELETE' or cmd = 'ALL' or 'anon' = any(roles) or 'public' = any(roles))) then
    raise exception 'une policy de suppression ou ouverte à anon existe sur le Pilotage';
  end if;
end $$;

-- Ce que la base porte désormais, lisible dans le journal du workflow
-- (aucune donnée : des noms de policies et de droits).
select tablename, policyname, cmd, roles::text
  from pg_policies
 where schemaname = 'public' and tablename in ('pilotage_cartes', 'pilotage_journal')
 order by tablename, policyname;
