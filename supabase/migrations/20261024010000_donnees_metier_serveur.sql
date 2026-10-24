-- ============================================================================
-- LES DONNÉES MÉTIER DE L'ADMIN VIVENT SUR LE SERVEUR (24 octobre 2026, P1)
-- ----------------------------------------------------------------------------
-- LE TROU. Le carnet des chauffeurs, les règlements reçus des chauffeurs, les
-- factures de commission et leur numérotation ne vivaient QUE dans le
-- téléphone de Barbaros (localStorage). Téléphone perdu, cassé, ou Safari qui
-- vide son stockage : tout disparaissait, et un second appareil ne voyait
-- rien. Pire pour les factures : deux appareils pouvaient émettre le même
-- numéro (art. L441-9 : ni trou, ni doublon).
--
-- CE QUI EST RÉUTILISÉ, PAS DUPLIQUÉ :
--   · « chauffeurs » (Admin v2) : on y ajoute l'identifiant de l'appareil
--     (« CH-… », celui que portent déjà les factures et les dettes), le mode
--     de commission (% ou €) et une version ;
--   · « compteur_factures » et « factures_commission » : MÊME compteur, MÊME
--     table que l'émission d'Admin v2 — un seul fil de numéros ;
--   · « parametres_commerciaux » : l'émetteur (« entreprise_emettrice ») et
--     le lien d'avis (« lien_avis »), écrits par l'admin comme les tarifs.
-- CE QUI EST NOUVEAU : « reglements_chauffeurs » (rien n'existait : la table
-- « paiements » est celle de Stripe, autre chose).
--
-- LES RÈGLES :
--   · anon ne lit ni n'écrit rien ; un compte connecté qui n'est pas
--     opérateur non plus (est_exploitant/est_admin, donc le code
--     admin de 20261024020000 quand il est posé) ;
--   · le carnet se LIT par tout opérateur (l'agent attribue un chauffeur),
--     sans le taux de commission pour l'agent ; il s'ÉCRIT par l'admin ;
--   · les règlements et les factures : admin seul, en lecture comme en
--     écriture ;
--   · toute écriture passe par une fonction : identifiant fourni par
--     l'appareil = rejouer ne crée jamais de doublon ; version = deux
--     appareils ne s'écrasent pas en silence ; le numéro de facture est pris
--     par une seule instruction atomique, dans la transaction qui verrouille
--     les courses et les marque ;
--   · l'import des données d'un appareil AJOUTE, ne remplace et n'efface
--     jamais rien, et DIT chaque conflit au lieu de le trancher.
--
-- REJOUABLE (if not exists, create or replace, on conflict do nothing).
-- Aucune donnée existante n'est modifiée ni supprimée. Aucun tarif, aucune
-- commission n'est changé : la commission d'une facture est celle calculée
-- par l'admin (commissionDe), le serveur vérifie seulement que les comptes
-- tombent juste.
-- ============================================================================

do $$
begin
  if to_regprocedure('public.est_exploitant()') is null or to_regprocedure('public.est_admin()') is null then
    raise exception 'est_exploitant() ou est_admin() introuvable : rien n''a été changé.';
  end if;
  if to_regclass('public.courses') is null or to_regclass('public.parametres_commerciaux') is null then
    raise exception 'courses ou parametres_commerciaux introuvable : rien n''a été changé.';
  end if;
end $$;

-- ── le carnet ──────────────────────────────────────────────────────────────
create table if not exists public.chauffeurs (
  id uuid primary key default gen_random_uuid(),
  nom_affiche text not null,
  telephone_whatsapp text not null,
  entreprise text, siret text, carte_vtc text, registre_exploitant text,
  rc_pro_reference text,
  vehicule jsonb not null default '{}'::jsonb,
  documents jsonb not null default '{}'::jsonb,
  statut text not null default 'a_verifier'
    check (statut in ('valide','a_renouveler','bloque','a_verifier')),
  actif boolean not null default true,
  cree_le timestamptz not null default now(),
  modifie_le timestamptz not null default now()
);
alter table public.chauffeurs add column if not exists carte_vtc_fin date;
alter table public.chauffeurs add column if not exists registre_fin date;
alter table public.chauffeurs add column if not exists assurance_fin date;
alter table public.chauffeurs add column if not exists adresse text;
alter table public.chauffeurs add column if not exists taux_commission numeric(5,2)
  check (taux_commission is null or (taux_commission >= 0 and taux_commission <= 100));
alter table public.chauffeurs add column if not exists id_appareil text;
alter table public.chauffeurs add column if not exists commission_mode text
  check (commission_mode is null or commission_mode in ('pct','eur'));
alter table public.chauffeurs add column if not exists commission_valeur numeric(10,2)
  check (commission_valeur is null or commission_valeur >= 0);
alter table public.chauffeurs add column if not exists version integer not null default 1;
create unique index if not exists chauffeurs_id_appareil on public.chauffeurs(id_appareil);

alter table public.chauffeurs enable row level security;
revoke all on public.chauffeurs from anon;
-- LECTURE : tout opérateur (inchangé). ÉCRITURE : l'admin seul — le carnet
-- porte le taux de commission, c'est de l'argent. L'admin publié n'écrit que
-- par les fonctions ci-dessous ; ces règles gardent Admin v2 dans le rang.
drop policy if exists "admin ela lecture" on public.chauffeurs;
drop policy if exists "admin ela insertion" on public.chauffeurs;
drop policy if exists "admin ela modification" on public.chauffeurs;
drop policy if exists "admin ela suppression" on public.chauffeurs;
create policy "admin ela lecture" on public.chauffeurs for select to authenticated
  using ((select public.est_exploitant()));
create policy "admin ela insertion" on public.chauffeurs for insert to authenticated
  with check ((select public.est_admin()));
create policy "admin ela modification" on public.chauffeurs for update to authenticated
  using ((select public.est_admin())) with check ((select public.est_admin()));
create policy "admin ela suppression" on public.chauffeurs for delete to authenticated
  using ((select public.est_admin()));

-- ── les règlements reçus des chauffeurs ───────────────────────────────────
create table if not exists public.reglements_chauffeurs (
  id text primary key check (length(id) between 3 and 64),
  cle text not null check (length(cle) between 1 and 200),
  nom text not null default '',
  telephone text not null default '',
  montant numeric(10,2) not null check (montant > 0 and montant < 1000000),
  date_reglement date not null,
  mode text not null default '',
  cree_le timestamptz not null default now(),
  cree_par uuid,
  retire_le timestamptz,
  retire_par uuid
);
create index if not exists reglements_chauffeurs_cle on public.reglements_chauffeurs(cle);
alter table public.reglements_chauffeurs enable row level security;
revoke all on public.reglements_chauffeurs from public, anon, authenticated;
drop policy if exists reglements_lecture_admin on public.reglements_chauffeurs;
-- AUCUNE ÉCRITURE DIRECTE : un retrait est une date posée, jamais un DELETE.
-- On garde la trace de ce qui a été saisi puis retiré.

-- ── les factures : le compteur et la table existants, deux colonnes ────────
create table if not exists public.compteur_factures (
  annee integer primary key,
  rang integer not null default 0 check (rang >= 0)
);
create table if not exists public.factures_commission (
  num text primary key,
  chauffeur_id uuid references public.chauffeurs(id),
  periode_du date not null,
  periode_au date not null,
  emetteur jsonb not null,
  client jsonb not null,
  lignes jsonb not null,
  ht numeric(12,2) not null,
  taux_tva numeric(5,2) not null default 0,
  tva numeric(12,2) not null default 0,
  ttc numeric(12,2) not null,
  emise_le timestamptz not null default now(),
  emise_par uuid default auth.uid()
);
-- Une facture importée d'un appareil peut viser un chauffeur effacé du
-- carnet depuis : le document reste (il est figé), sans lien.
alter table public.factures_commission alter column chauffeur_id drop not null;
alter table public.factures_commission add column if not exists cle_emission uuid;
alter table public.factures_commission add column if not exists donnees jsonb;
alter table public.factures_commission add column if not exists origine text not null default 'serveur';
create unique index if not exists factures_commission_cle_emission
  on public.factures_commission(cle_emission) where cle_emission is not null;
alter table public.compteur_factures enable row level security;
alter table public.factures_commission enable row level security;
revoke all on public.compteur_factures from public, anon, authenticated;
revoke all on public.factures_commission from public, anon, authenticated;
drop policy if exists factures_lecture_exploitant on public.factures_commission;

-- ── outils ────────────────────────────────────────────────────────────────
create or replace function public.ela_date_ou_nul(t text)
returns date language plpgsql immutable set search_path = public, pg_temp as $$
begin
  if t is null or btrim(t) = '' then return null; end if;
  if t !~ '^\d{4}-\d{2}-\d{2}' then return null; end if;
  return left(t, 10)::date;
exception when others then return null;
end $$;
revoke all on function public.ela_date_ou_nul(text) from public, anon;

create or replace function public.ela_texte(t text, n integer)
returns text language sql immutable set search_path = public, pg_temp as $$
  select left(btrim(coalesce(t, '')), n) $$;
revoke all on function public.ela_texte(text, integer) from public, anon;

-- Le carnet tel que l'appareil le connaît (mêmes noms de champs que
-- localStorage). Le taux ne sort que pour l'admin.
create or replace function public.ela_chauffeur_appareil(c public.chauffeurs, avec_taux boolean)
returns jsonb language sql stable set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'id', c.id_appareil, 'nom', c.nom_affiche, 'telephone', c.telephone_whatsapp,
    'siret', coalesce(c.siret, ''), 'adresse', coalesce(c.adresse, ''),
    'carte', coalesce(c.carte_vtc, ''), 'carteFin', coalesce(c.carte_vtc_fin::text, ''),
    'registre', coalesce(c.registre_exploitant, ''), 'registreFin', coalesce(c.registre_fin::text, ''),
    'assurance', coalesce(c.rc_pro_reference, ''), 'assuranceFin', coalesce(c.assurance_fin::text, ''),
    'taux', case when avec_taux then c.commission_valeur end,
    'tauxMode', case when avec_taux then coalesce(c.commission_mode, 'pct') end,
    'version', c.version) $$;
revoke all on function public.ela_chauffeur_appareil(public.chauffeurs, boolean) from public, anon;

-- ── le carnet : lire, écrire, retirer ─────────────────────────────────────
-- « p_tous » : y compris les fiches retirées (marquées « retire »), pour que
-- l'appareil qui vérifie son import les retrouve.
create or replace function public.ela_chauffeurs_lister(p_tous boolean default false)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare admin boolean;
begin
  if not public.est_exploitant() then raise exception 'acces_refuse' using errcode = '42501'; end if;
  admin := public.est_admin();
  return coalesce((select jsonb_agg(public.ela_chauffeur_appareil(c, admin)
                                    || case when c.actif then '{}'::jsonb else '{"retire":true}'::jsonb end
                                    order by lower(c.nom_affiche), c.id_appareil)
                     from public.chauffeurs c where (c.actif or p_tous) and c.id_appareil is not null), '[]'::jsonb);
end $$;

-- Écrit UNE fiche. « version » absente = création ; présente = modification
-- de cette version-là. Rejouer la même écriture rend la fiche sans rien
-- changer ; une version dépassée par un autre appareil est REFUSÉE
-- (« conflit_version ») avec la fiche du serveur, jamais écrasée.
create or replace function public.ela_chauffeur_ecrire(p jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_id text := public.ela_texte(p->>'id', 64);
  v_nom text := public.ela_texte(p->>'nom', 120);
  v_mode text := case when p->>'tauxMode' = 'eur' then 'eur' else 'pct' end;
  v_taux numeric;
  c public.chauffeurs;
  voulu jsonb;
begin
  if not public.est_admin() then raise exception 'acces_refuse' using errcode = '42501'; end if;
  if v_id !~ '^CH-[A-Za-z0-9_-]{1,60}$' then raise exception 'identifiant_invalide'; end if;
  if v_nom = '' then raise exception 'nom_obligatoire'; end if;
  begin v_taux := nullif(btrim(coalesce(p->>'taux', '')), '')::numeric;
  exception when others then raise exception 'taux_invalide'; end;
  if v_taux is not null and (v_taux < 0 or (v_mode = 'pct' and v_taux > 100) or v_taux > 100000) then
    raise exception 'taux_invalide'; end if;

  select * into c from public.chauffeurs where id_appareil = v_id for update;
  if found and c.actif then
    voulu := public.ela_chauffeur_appareil(c, true) - 'version';
    if (p->>'version') is null or (p->>'version')::integer <> c.version then
      -- Rejeu d'une écriture déjà passée : même contenu, on rend la fiche.
      if voulu = (jsonb_build_object('id', v_id, 'nom', v_nom,
            'telephone', public.ela_texte(p->>'telephone', 40), 'siret', public.ela_texte(p->>'siret', 40),
            'adresse', public.ela_texte(p->>'adresse', 300), 'carte', public.ela_texte(p->>'carte', 80),
            'carteFin', coalesce(public.ela_date_ou_nul(p->>'carteFin')::text, ''),
            'registre', public.ela_texte(p->>'registre', 80),
            'registreFin', coalesce(public.ela_date_ou_nul(p->>'registreFin')::text, ''),
            'assurance', public.ela_texte(p->>'assurance', 120),
            'assuranceFin', coalesce(public.ela_date_ou_nul(p->>'assuranceFin')::text, ''),
            'taux', v_taux, 'tauxMode', v_mode)) then
        return public.ela_chauffeur_appareil(c, true);
      end if;
      raise exception 'conflit_version' using detail = public.ela_chauffeur_appareil(c, true)::text;
    end if;
  end if;

  insert into public.chauffeurs as t (id_appareil, nom_affiche, telephone_whatsapp, siret, adresse,
      carte_vtc, carte_vtc_fin, registre_exploitant, registre_fin, rc_pro_reference, assurance_fin,
      commission_mode, commission_valeur, taux_commission, actif, version, modifie_le)
    values (v_id, v_nom, public.ela_texte(p->>'telephone', 40), public.ela_texte(p->>'siret', 40),
      public.ela_texte(p->>'adresse', 300), public.ela_texte(p->>'carte', 80), public.ela_date_ou_nul(p->>'carteFin'),
      public.ela_texte(p->>'registre', 80), public.ela_date_ou_nul(p->>'registreFin'),
      public.ela_texte(p->>'assurance', 120), public.ela_date_ou_nul(p->>'assuranceFin'),
      case when v_taux is null then null else v_mode end, v_taux,
      case when v_mode = 'pct' then v_taux end, true, 1, now())
  on conflict (id_appareil) do update set
      nom_affiche = excluded.nom_affiche, telephone_whatsapp = excluded.telephone_whatsapp,
      siret = excluded.siret, adresse = excluded.adresse, carte_vtc = excluded.carte_vtc,
      carte_vtc_fin = excluded.carte_vtc_fin, registre_exploitant = excluded.registre_exploitant,
      registre_fin = excluded.registre_fin, rc_pro_reference = excluded.rc_pro_reference,
      assurance_fin = excluded.assurance_fin, commission_mode = excluded.commission_mode,
      commission_valeur = excluded.commission_valeur, taux_commission = excluded.taux_commission,
      actif = true, version = t.version + 1, modifie_le = now()
  returning * into c;
  return public.ela_chauffeur_appareil(c, true);
end $$;

-- Retirer n'efface pas : la fiche sort du carnet (actif = faux), les
-- factures et les règlements qui la citent restent lisibles.
create or replace function public.ela_chauffeur_retirer(p_id text)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not public.est_admin() then raise exception 'acces_refuse' using errcode = '42501'; end if;
  update public.chauffeurs set actif = false, version = version + 1, modifie_le = now()
   where id_appareil = p_id and actif;
  return true;
end $$;

-- ── les règlements ────────────────────────────────────────────────────────
create or replace function public.ela_reglement_appareil(r public.reglements_chauffeurs)
returns jsonb language sql stable set search_path = public, pg_temp as $$
  select jsonb_build_object('id', r.id, 'cle', r.cle, 'nom', r.nom, 'tel', r.telephone,
    'montant', r.montant, 'date', r.date_reglement::text, 'mode', r.mode,
    'cree', to_char(r.cree_le at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')) $$;
revoke all on function public.ela_reglement_appareil(public.reglements_chauffeurs) from public, anon;

create or replace function public.ela_reglements_lister(p_tous boolean default false)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not public.est_admin() then raise exception 'acces_refuse' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(public.ela_reglement_appareil(r)
                                    || case when r.retire_le is null then '{}'::jsonb else '{"retire":true}'::jsonb end
                                    order by r.date_reglement, r.cree_le)
                     from public.reglements_chauffeurs r where r.retire_le is null or p_tous), '[]'::jsonb);
end $$;

-- L'identifiant vient de l'appareil, tiré UNE fois par saisie : un double
-- appui, une requête rejouée après une coupure, retombent sur la même ligne.
create or replace function public.ela_reglement_ecrire(p jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_id text := public.ela_texte(p->>'id', 64);
  v_montant numeric; v_date date;
  r public.reglements_chauffeurs;
begin
  if not public.est_admin() then raise exception 'acces_refuse' using errcode = '42501'; end if;
  if v_id !~ '^P-[A-Za-z0-9_-]{1,60}$' then raise exception 'identifiant_invalide'; end if;
  begin v_montant := round((p->>'montant')::numeric, 2);
  exception when others then raise exception 'montant_invalide'; end;
  if v_montant is null or v_montant <= 0 or v_montant >= 1000000 then raise exception 'montant_invalide'; end if;
  v_date := public.ela_date_ou_nul(p->>'date');
  if v_date is null then raise exception 'date_invalide'; end if;
  if public.ela_texte(p->>'cle', 200) = '' then raise exception 'chauffeur_obligatoire'; end if;

  insert into public.reglements_chauffeurs(id, cle, nom, telephone, montant, date_reglement, mode, cree_par)
    values (v_id, public.ela_texte(p->>'cle', 200), public.ela_texte(p->>'nom', 120),
            public.ela_texte(p->>'tel', 40), v_montant, v_date, public.ela_texte(p->>'mode', 40), auth.uid())
  on conflict (id) do nothing;
  select * into r from public.reglements_chauffeurs where id = v_id;
  if r.montant <> v_montant or r.cle <> public.ela_texte(p->>'cle', 200) or r.date_reglement <> v_date then
    raise exception 'identifiant_reutilise';
  end if;
  return public.ela_reglement_appareil(r);
end $$;

create or replace function public.ela_reglement_retirer(p_id text)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not public.est_admin() then raise exception 'acces_refuse' using errcode = '42501'; end if;
  update public.reglements_chauffeurs set retire_le = now(), retire_par = auth.uid()
   where id = p_id and retire_le is null;
  return true;
end $$;

-- ── les factures ──────────────────────────────────────────────────────────
create or replace function public.ela_facture_appareil(f public.factures_commission)
returns jsonb language sql stable set search_path = public, pg_temp as $$
  select coalesce(f.donnees, jsonb_build_object(
      'date', (f.emise_le at time zone 'Europe/Paris')::date::text,
      'du', f.periode_du::text, 'au', f.periode_au::text,
      'emetteur', f.emetteur, 'client', f.client, 'lignes', f.lignes,
      'ht', f.ht, 'tauxTva', f.taux_tva, 'tva', f.tva, 'ttc', f.ttc,
      'refs', coalesce((select jsonb_agg(l->'ref') from jsonb_array_elements(f.lignes) l), '[]'::jsonb)))
    || jsonb_build_object('num', f.num) $$;
revoke all on function public.ela_facture_appareil(public.factures_commission) from public, anon;

create or replace function public.ela_factures_lister()
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not public.est_admin() then raise exception 'acces_refuse' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(public.ela_facture_appareil(f) order by f.num)
                     from public.factures_commission f), '[]'::jsonb);
end $$;

create or replace function public.ela_rang_facture(n text)
returns integer language sql immutable set search_path = public, pg_temp as $$
  select case when n ~ '^F-\d{4}-\d{1,9}$' then split_part(n, '-', 3)::integer end $$;
revoke all on function public.ela_rang_facture(text) from public, anon;

-- ÉMETTRE UNE FACTURE préparée par l'admin (commissionDe : course, carnet,
-- canal). Le serveur ne recalcule pas la commission — elle ne change pas —,
-- il vérifie que les comptes tombent juste, verrouille les courses, prend le
-- numéro EN UNE INSTRUCTION, enregistre et marque les courses dans la MÊME
-- transaction. « cle » (tirée par l'appareil à la préparation) : un double
-- appui ou une requête rejouée rendent la MÊME facture, jamais deux.
create or replace function public.ela_facture_emettre(p jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_cle uuid; f public.factures_commission; e jsonb; cl jsonb;
  refs text[]; refs_lignes text[]; tenues text[];
  v_ht numeric; v_somme numeric; v_taux numeric; v_tva numeric; v_ttc numeric;
  v_chauffeur uuid; v_annee integer; v_rang integer; v_num text; v_doc jsonb;
  ref_bloquee text;
begin
  if not public.est_admin() then raise exception 'acces_refuse' using errcode = '42501'; end if;
  begin v_cle := (p->>'cle')::uuid; exception when others then raise exception 'cle_invalide'; end;
  if v_cle is null then raise exception 'cle_invalide'; end if;

  -- Rejouée : la facture déjà émise, telle quelle.
  select * into f from public.factures_commission where cle_emission = v_cle;
  if found then return public.ela_facture_appareil(f); end if;

  e := p->'emetteur'; cl := p->'client';
  if coalesce(btrim(e->>'nom'), '') = '' or coalesce(btrim(e->>'siret'), '') = ''
     or coalesce(btrim(e->>'adresse'), '') = '' then raise exception 'emetteur_incomplet'; end if;
  select id into v_chauffeur from public.chauffeurs where id_appareil = cl->>'id' and actif;
  if v_chauffeur is null then raise exception 'chauffeur_inconnu'; end if;
  if public.ela_date_ou_nul(p->>'du') is null or public.ela_date_ou_nul(p->>'au') is null
     or public.ela_date_ou_nul(p->>'du') > public.ela_date_ou_nul(p->>'au') then
    raise exception 'periode_invalide'; end if;

  select array_agg(x order by x) into refs from (select distinct jsonb_array_elements_text(p->'refs') x) s;
  select array_agg(x order by x) into refs_lignes from (select distinct l->>'ref' x from jsonb_array_elements(p->'lignes') l) s;
  if refs is null then raise exception 'aucune_course_a_facturer'; end if;
  if refs_lignes is distinct from refs then raise exception 'lignes_incoherentes'; end if;

  -- Les courses, VERROUILLÉES : une seconde émission sur les mêmes attend,
  -- puis les trouve facturées et refuse.
  select array_agg(c.ref order by c.ref) into tenues from (
    select c.ref from public.courses c where c.ref = any(refs) order by c.ref for update) c;
  if tenues is distinct from refs then raise exception 'course_introuvable'; end if;
  select c.ref into ref_bloquee from public.courses c
   where c.ref = any(refs)
     and (c.statut is distinct from 'realisee' or coalesce(c.bon->>'factureNum', '') <> ''
          or coalesce((c.bon->>'essai')::boolean, false))
   limit 1;
  if ref_bloquee is not null then raise exception 'course_non_facturable' using detail = ref_bloquee; end if;

  begin
    v_ht := round((p->>'ht')::numeric, 2);
    v_taux := coalesce(round((p->>'tauxTva')::numeric, 2), 0);
    v_tva := round((p->>'tva')::numeric, 2);
    v_ttc := round((p->>'ttc')::numeric, 2);
    select round(sum((l->>'commission')::numeric), 2) into v_somme from jsonb_array_elements(p->'lignes') l;
  exception when others then raise exception 'montants_invalides'; end;
  if v_ht is null or v_somme is null or abs(v_somme - v_ht) > 0.01 or v_taux < 0 or v_taux > 100
     or abs(round(v_ht * v_taux / 100, 2) - v_tva) > 0.01 or abs(v_ht + v_tva - v_ttc) > 0.01 then
    raise exception 'montants_incoherents';
  end if;

  v_annee := extract(year from (now() at time zone 'Europe/Paris'))::integer;
  insert into public.compteur_factures(annee, rang) values (v_annee, 1)
    on conflict (annee) do update set rang = public.compteur_factures.rang + 1
    returning rang into v_rang;
  v_num := 'F-' || v_annee || '-' || lpad(v_rang::text, 4, '0');

  v_doc := jsonb_build_object('num', v_num, 'date', (now() at time zone 'Europe/Paris')::date::text,
    'du', p->>'du', 'au', p->>'au', 'emetteur', e, 'client', cl, 'lignes', p->'lignes',
    'ht', v_ht, 'tauxTva', v_taux, 'tva', v_tva, 'ttc', v_ttc, 'refs', to_jsonb(refs));
  insert into public.factures_commission(num, chauffeur_id, periode_du, periode_au, emetteur, client,
      lignes, ht, taux_tva, tva, ttc, emise_par, cle_emission, donnees, origine)
    values (v_num, v_chauffeur, public.ela_date_ou_nul(p->>'du'), public.ela_date_ou_nul(p->>'au'),
      e, cl, p->'lignes', v_ht, v_taux, v_tva, v_ttc, auth.uid(), v_cle, v_doc, 'admin');

  update public.courses set bon = jsonb_set(bon, '{factureNum}', to_jsonb(v_num), true)
   where ref = any(refs);
  return v_doc;
end $$;

-- ── l'import des données d'un appareil ────────────────────────────────────
-- Entrée : la sauvegarde de l'appareil (format « elatransfer-1 » : chauffeurs,
-- paiementsChauffeurs, factures, rangFacture, entreprise, lienAvis).
-- AJOUTE ce que le serveur n'a pas, ne remplace RIEN de ce qu'il a, et rend
-- un compte rendu : ajoutés, déjà là, CONFLITS (même identifiant, contenu
-- différent — jamais tranchés en silence), refusés (illisibles).
-- Rejouer le même import n'ajoute rien.
create or replace function public.ela_importer_appareil(p jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  x jsonb; c public.chauffeurs; r public.reglements_chauffeurs; f public.factures_commission;
  ch_aj int := 0; ch_la int := 0; ch_co jsonb := '[]'; ch_re jsonb := '[]';
  rg_aj int := 0; rg_la int := 0; rg_co jsonb := '[]'; rg_re jsonb := '[]';
  fa_aj int := 0; fa_la int := 0; fa_co jsonb := '[]'; fa_re jsonb := '[]';
  em text := 'deja'; av text := 'deja';
  v_num text; v_rang int; v_annee int; v_ref text; v_montant numeric;
  rang_appareil jsonb;
begin
  if not public.est_admin() then raise exception 'acces_refuse' using errcode = '42501'; end if;
  if jsonb_typeof(p) is distinct from 'object' then raise exception 'sauvegarde_illisible'; end if;

  -- 1. Le carnet (avant les factures, qui le citent).
  for x in select * from jsonb_array_elements(case when jsonb_typeof(p->'chauffeurs') = 'array' then p->'chauffeurs' else '[]' end) loop
    if coalesce(x->>'id', '') !~ '^CH-[A-Za-z0-9_-]{1,60}$' or public.ela_texte(x->>'nom', 120) = '' then
      ch_re := ch_re || to_jsonb(coalesce(x->>'id', '?')); continue; end if;
    select * into c from public.chauffeurs where id_appareil = x->>'id';
    if found then
      if lower(c.nom_affiche) = lower(public.ela_texte(x->>'nom', 120)) then ch_la := ch_la + 1;
      else ch_co := ch_co || to_jsonb(x->>'id'); end if;
      continue;
    end if;
    begin
      perform public.ela_chauffeur_ecrire(x - 'version');
      ch_aj := ch_aj + 1;
    exception when others then ch_re := ch_re || to_jsonb(x->>'id');
    end;
  end loop;

  -- 2. Les règlements.
  for x in select * from jsonb_array_elements(case when jsonb_typeof(p->'paiementsChauffeurs') = 'array' then p->'paiementsChauffeurs' else '[]' end) loop
    select * into r from public.reglements_chauffeurs where id = x->>'id';
    if found then
      begin v_montant := round((x->>'montant')::numeric, 2); exception when others then v_montant := null; end;
      if r.montant = v_montant and r.cle = public.ela_texte(x->>'cle', 200) then rg_la := rg_la + 1;
      else rg_co := rg_co || to_jsonb(x->>'id'); end if;
      continue;
    end if;
    begin
      perform public.ela_reglement_ecrire(x);
      rg_aj := rg_aj + 1;
    exception when others then rg_re := rg_re || to_jsonb(coalesce(x->>'id', '?'));
    end;
  end loop;

  -- 3. Les factures, figées telles qu'émises sur l'appareil.
  for x in select * from jsonb_array_elements(case when jsonb_typeof(p->'factures') = 'array' then p->'factures' else '[]' end) loop
    v_num := x->>'num';
    if public.ela_rang_facture(v_num) is null or jsonb_typeof(x->'lignes') is distinct from 'array' then
      fa_re := fa_re || to_jsonb(coalesce(v_num, '?')); continue; end if;
    select * into f from public.factures_commission where num = v_num;
    if found then
      if coalesce(f.client->>'id', '') = coalesce(x->'client'->>'id', '')
         and f.ttc = round((x->>'ttc')::numeric, 2) then fa_la := fa_la + 1;
      else fa_co := fa_co || to_jsonb(v_num); end if;
      continue;
    end if;
    begin
      insert into public.factures_commission(num, chauffeur_id, periode_du, periode_au, emetteur, client,
          lignes, ht, taux_tva, tva, ttc, emise_le, emise_par, donnees, origine)
        values (v_num,
          (select id from public.chauffeurs where id_appareil = x->'client'->>'id'),
          coalesce(public.ela_date_ou_nul(x->>'du'), public.ela_date_ou_nul(x->>'date')),
          coalesce(public.ela_date_ou_nul(x->>'au'), public.ela_date_ou_nul(x->>'date')),
          coalesce(x->'emetteur', '{}'), coalesce(x->'client', '{}'), x->'lignes',
          round((x->>'ht')::numeric, 2), coalesce(round((x->>'tauxTva')::numeric, 2), 0),
          coalesce(round((x->>'tva')::numeric, 2), 0), round((x->>'ttc')::numeric, 2),
          coalesce(public.ela_date_ou_nul(x->>'date')::timestamptz, now()), auth.uid(), x, 'appareil');
      -- Une course facturée sur l'appareil mais pas encore marquée sur le
      -- serveur reçoit son numéro ; une course marquée d'un AUTRE numéro
      -- est un conflit, dit et laissé tel quel.
      for v_ref in select jsonb_array_elements_text(case when jsonb_typeof(x->'refs') = 'array' then x->'refs' else '[]' end) loop
        update public.courses co set bon = jsonb_set(co.bon, '{factureNum}', to_jsonb(v_num), true)
         where co.ref = v_ref and coalesce(co.bon->>'factureNum', '') = '';
        if exists (select 1 from public.courses co where co.ref = v_ref
                     and coalesce(co.bon->>'factureNum', '') not in ('', v_num)) then
          fa_co := fa_co || to_jsonb(v_num || ' / ' || v_ref);
        end if;
      end loop;
      fa_aj := fa_aj + 1;
    exception when others then fa_re := fa_re || to_jsonb(v_num || ' : ' || sqlerrm);
    end;
  end loop;

  -- 4. LE COMPTEUR NE RECULE JAMAIS : pour chaque année, au moins le plus
  -- grand rang connu — factures du serveur, factures importées, rang de
  -- l'appareil (un rang consommé sans facture gardée compte aussi).
  rang_appareil := case when jsonb_typeof(p->'rangFacture') = 'string'
                        then (case when (p->>'rangFacture') ~ '^\s*\{' then (p->>'rangFacture')::jsonb end)
                        else p->'rangFacture' end;
  for v_annee, v_rang in
    select a, max(n) from (
      select split_part(num, '-', 2)::int a, public.ela_rang_facture(num) n
        from public.factures_commission where public.ela_rang_facture(num) is not null
      union all
      select (rang_appareil->>'annee')::int, (rang_appareil->>'rang')::int
       where jsonb_typeof(rang_appareil) = 'object'
         and (rang_appareil->>'annee') ~ '^\d{4}$' and (rang_appareil->>'rang') ~ '^\d{1,9}$'
    ) s group by a
  loop
    insert into public.compteur_factures(annee, rang) values (v_annee, v_rang)
      on conflict (annee) do update set rang = greatest(public.compteur_factures.rang, excluded.rang);
  end loop;

  -- 5. L'émetteur et le lien d'avis : posés seulement si le serveur n'en a pas.
  if jsonb_typeof(p->'entreprise') = 'object' and coalesce(btrim(p->'entreprise'->>'nom'), '') <> '' then
    insert into public.parametres_commerciaux(cle, valeur)
      values ('entreprise_emettrice', jsonb_build_object(
        'nom', public.ela_texte(p->'entreprise'->>'nom', 200), 'siret', public.ela_texte(p->'entreprise'->>'siret', 40),
        'adresse', public.ela_texte(p->'entreprise'->>'adresse', 300), 'contact', public.ela_texte(p->'entreprise'->>'contact', 200),
        'taux_tva', coalesce(nullif(p->'entreprise'->>'tva', '')::numeric, 0)))
      on conflict (cle) do nothing;
    if found then em := 'ajoute'; end if;
  else em := 'absent';
  end if;
  if coalesce(btrim(p->>'lienAvis'), '') ~ '^https://' then
    insert into public.parametres_commerciaux(cle, valeur)
      values ('lien_avis', jsonb_build_object('url', public.ela_texte(p->>'lienAvis', 500)))
      on conflict (cle) do nothing;
    if found then av := 'ajoute'; end if;
  else av := 'absent';
  end if;

  return jsonb_build_object(
    'chauffeurs', jsonb_build_object('ajoutes', ch_aj, 'deja', ch_la, 'conflits', ch_co, 'refuses', ch_re),
    'reglements', jsonb_build_object('ajoutes', rg_aj, 'deja', rg_la, 'conflits', rg_co, 'refuses', rg_re),
    'factures', jsonb_build_object('ajoutes', fa_aj, 'deja', fa_la, 'conflits', fa_co, 'refuses', fa_re),
    'emetteur', em, 'lienAvis', av,
    'compteur', coalesce((select jsonb_object_agg(annee, rang) from public.compteur_factures), '{}'));
end $$;

-- ── les droits ────────────────────────────────────────────────────────────
do $$
declare f text;
begin
  foreach f in array array[
    'public.ela_chauffeurs_lister(boolean)', 'public.ela_chauffeur_ecrire(jsonb)', 'public.ela_chauffeur_retirer(text)',
    'public.ela_reglements_lister(boolean)', 'public.ela_reglement_ecrire(jsonb)', 'public.ela_reglement_retirer(text)',
    'public.ela_factures_lister()', 'public.ela_facture_emettre(jsonb)', 'public.ela_importer_appareil(jsonb)'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;

select 'données métier sur le serveur' as etat,
       (select count(*) from public.chauffeurs where id_appareil is not null) as chauffeurs_lies,
       (select count(*) from public.reglements_chauffeurs) as reglements,
       (select count(*) from public.factures_commission) as factures;
