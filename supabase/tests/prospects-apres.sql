-- ============================================================================
-- LES PROSPECTS DE LA DÉMO (bloc 2) — ÉPREUVES, APRÈS la migration (appliquée
-- deux fois). Chaque refus est vérifié POUR SA RAISON (epreuve.refus), et un
-- refus est toujours précédé de la preuve que la même chose passe pour celui
-- qui en a le droit : une table fermée à tout le monde rendrait les mêmes
-- refus, et l'épreuve serait verte sans rien prouver.
--
-- Les comptes, ceux du décor role-agent-avant.sql :
--   …0001 l'admin · …0002 l'agent de réservation (exploitant, pas admin)
--   …0009 un compte connecté qui n'est pas opérateur du tout.
-- ============================================================================

-- ── 1. LA STRUCTURE ─────────────────────────────────────────────────────
do $$
declare p text; n int;
begin
  if not (select relrowsecurity from pg_class where oid = 'public.prospects'::regclass) then
    raise exception 'ECHEC 1 : RLS inactive'; end if;
  foreach p in array array['SELECT','INSERT','UPDATE','REFERENCES'] loop
    if has_any_column_privilege('anon', 'public.prospects', p) then
      raise exception 'ECHEC 1 : anon a % sur prospects', p; end if;
  end loop;
  foreach p in array array['DELETE','TRUNCATE','TRIGGER'] loop
    if has_table_privilege('anon', 'public.prospects', p)
       or has_table_privilege('authenticated', 'public.prospects', p) then
      raise exception 'ECHEC 1 : % accordé', p; end if;
  end loop;
  if has_any_column_privilege('authenticated', 'public.prospects', 'INSERT') then
    raise exception 'ECHEC 1 : un compte connecté peut créer un prospect'; end if;
  foreach p in array array['id','cree_le','type','etablissement','nom','fonction','email',
      'telephone','langue','email_confirme_le','demo_ouverte_le','derniere_visite_le',
      'nb_visites','dernier_contact_le','jeton_empreinte','jeton_expire_le'] loop
    if has_column_privilege('authenticated', 'public.prospects', p, 'UPDATE') then
      raise exception 'ECHEC 1 : le navigateur peut modifier « % »', p; end if;
  end loop;
  if not has_column_privilege('authenticated', 'public.prospects', 'statut', 'UPDATE')
     or not has_column_privilege('authenticated', 'public.prospects', 'note', 'UPDATE') then
    raise exception 'ECHEC 1 : l''admin ne pourra pas changer le statut ou la note'; end if;
  foreach p in array array['jeton_empreinte','jeton_expire_le'] loop
    if has_column_privilege('authenticated', 'public.prospects', p, 'SELECT') then
      raise exception 'ECHEC 1 : « % » est lisible depuis le navigateur', p; end if;
  end loop;
  if not has_column_privilege('authenticated', 'public.prospects', 'domaine_pro', 'SELECT') then
    raise exception 'ECHEC 1 : l''admin ne lit pas domaine_pro'; end if;

  select count(*) into n from pg_policies where schemaname = 'public' and tablename = 'prospects';
  if n <> 2 then raise exception 'ECHEC 1 : % policies (2 attendues : lire, modifier)', n; end if;
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'prospects'
              and (cmd not in ('SELECT','UPDATE') or roles::text <> '{authenticated}'
                   or coalesce(qual, '') not like '%est_admin()%'
                   or (cmd = 'UPDATE' and coalesce(with_check, '') not like '%est_admin()%'))) then
    raise exception 'ECHEC 1 : une policy n''est pas « authenticated + est_admin() »'; end if;

  foreach p in array array['public.ela_prospect_creer(text,text,text,text,text,text,text,text,integer)',
                           'public.ela_prospect_ouvrir(uuid)',
                           'public.ela_prospect_confirmer(text)'] loop
    if has_function_privilege('anon', p, 'execute') or has_function_privilege('authenticated', p, 'execute') then
      raise exception 'ECHEC 1 : % est appelable depuis le navigateur', p; end if;
    if not has_function_privilege('service_role', p, 'execute') then
      raise exception 'ECHEC 1 : la fonction demande-demo ne pourra pas appeler %', p; end if;
    if not (select prosecdef from pg_proc where oid = p::regprocedure) then
      raise exception 'ECHEC 1 : % n''écrit pas avec les droits du propriétaire', p; end if;
  end loop;

  select count(*) into n from pg_trigger where tgrelid = 'public.prospects'::regclass and not tgisinternal;
  if n <> 1 then raise exception 'ECHEC 1 : % déclencheurs après rejeu (1 attendu)', n; end if;
  -- Aucune colonne pour l'adresse IP : la règle est « on ne la garde pas ».
  if exists (select 1 from information_schema.columns where table_schema = 'public'
              and table_name = 'prospects' and column_name ~ '(^|_)ip($|_)|adresse_ip') then
    raise exception 'ECHEC 1 : une colonne d''adresse IP existe'; end if;
end $$;

-- ── 2. L'ADRESSE GRAND PUBLIC, CALCULÉE PAR LA BASE ───────────────────
do $$
declare cas text[]; begin
  foreach cas slice 1 in array array[
    array['direction@monhotel.fr','t'], array['a.b@gmail.com','f'], array['x@GMAIL.COM','f'],
    array['x@orange.fr','f'], array['x@wanadoo.fr','f'], array['x@hotmail.co.uk','f'],
    array['x@yahoo.de','f'], array['x@icloud.com','f'], array['x@outlook.monhotel.com','t'],
    array['x@hotel-gmail.com','t'], array['x@free.fr','f'], array['x@laposte.net','f']] loop
    if public.prospect_domaine_pro(cas[1]) <> cas[2]::boolean then
      raise exception 'ECHEC 2 : % devrait être pro=%', cas[1], cas[2]; end if;
  end loop;
end $$;

-- ── 3. LA FONCTION « demande-demo » CRÉE (service_role) ────────────────
set role service_role;
do $$
declare r record; l public.prospects;
begin
  select * into r from public.ela_prospect_creer('hotel', '  Hôtel des Lilas ', ' Marie Dupont ', '',
    ' Direction@HotelDesLilas.FR ', '+33612345678', 'fr', repeat('a', 64), 3);
  if r.id is null or r.domaine_pro is distinct from true then
    raise exception 'ECHEC 3 : création ou domaine_pro (%)', row_to_json(r); end if;
  select * into l from public.prospects where id = r.id;
  if l.etablissement <> 'Hôtel des Lilas' or l.nom <> 'Marie Dupont' or l.fonction is not null
     or l.email <> 'direction@hoteldeslilas.fr' or l.statut <> 'nouveau' or l.nb_visites <> 0
     or l.email_confirme_le is not null or l.demo_ouverte_le is not null then
    raise exception 'ECHEC 3 : ligne mal normalisée : %', row_to_json(l); end if;
  if l.jeton_expire_le < now() + interval '47 hours 59 minutes'
     or l.jeton_expire_le > now() + interval '48 hours 1 minute' then
    raise exception 'ECHEC 3 : le jeton ne vit pas 48 h (%)', l.jeton_expire_le; end if;
  perform set_config('test.p1', r.id::text, false);

  select * into r from public.ela_prospect_creer('agence', 'Voyages Martin', 'Paul Martin', 'Gérant',
    'paul.martin@gmail.com', '+33698765432', 'en', repeat('b', 64), 3);
  if r.domaine_pro is distinct from false then raise exception 'ECHEC 3 : gmail compté pro'; end if;
  perform set_config('test.p2', r.id::text, false);
end $$;

-- Les champs refusés par la BASE, chacun pour SA contrainte.
select epreuve.refus('3a type', $q$select public.ela_prospect_creer('taxi','Hôtel A','Nom B','','a@b.fr','+33612345678','fr',null,3)$q$, 'prospects_type');
select epreuve.refus('3b téléphone', $q$select public.ela_prospect_creer('hotel','Hôtel A','Nom B','','a@b.fr','0612345678','fr',null,3)$q$, 'prospects_telephone');
select epreuve.refus('3c e-mail', $q$select public.ela_prospect_creer('hotel','Hôtel A','Nom B','','pas-une-adresse','+33612345678','fr',null,3)$q$, 'prospects_email');
select epreuve.refus('3d chevron', $q$select public.ela_prospect_creer('hotel','<script>','Nom B','','a@b.fr','+33612345678','fr',null,3)$q$, 'prospects_etablissement');
select epreuve.refus('3e jeton', $q$select public.ela_prospect_creer('hotel','Hôtel A','Nom B','','a@b.fr','+33612345678','fr','pas-hexa',3)$q$, 'prospects_jeton');
select epreuve.refus('3f langue', $q$select public.ela_prospect_creer('hotel','Hôtel A','Nom B','','a@b.fr','+33612345678','de',null,3)$q$, 'prospects_langue');
select epreuve.refus('3g nom vide', $q$select public.ela_prospect_creer('hotel','Hôtel A',' ','','a@b.fr','+33612345678','fr',null,3)$q$, 'prospects_nom');

-- ── 4. LE QUOTA PAR ADRESSE E-MAIL : 3 PAR 24 H ───────────────────────
do $$ begin
  perform public.ela_prospect_creer('entreprise','Société Q','Q Q','','quota@exemple.fr','+33612345670','fr',null,3);
  perform public.ela_prospect_creer('entreprise','Société Q','Q Q','','QUOTA@exemple.fr','+33612345670','fr',null,3);
  perform public.ela_prospect_creer('entreprise','Société Q','Q Q','',' quota@exemple.fr','+33612345670','fr',null,3);
end $$;
select epreuve.refus('4a quatrième demande (casse et espaces changés)',
  $q$select public.ela_prospect_creer('entreprise','Société Q','Q Q','','Quota@Exemple.fr','+33612345670','fr',null,3)$q$, 'quota_email');
do $$ begin
  perform public.ela_prospect_creer('entreprise','Société R','R R','','autre@exemple.fr','+33612345670','fr',null,3);
  -- Une demande de plus de 24 h ne compte plus.
  update public.prospects set cree_le = now() - interval '25 hours' where email = 'quota@exemple.fr';
  perform public.ela_prospect_creer('entreprise','Société Q','Q Q','','quota@exemple.fr','+33612345670','fr',null,3);
end $$;

-- ── 5. OUVRIR : première ouverture, visites comptées par demi-heure ───
do $$
declare l public.prospects; p uuid := current_setting('test.p1')::uuid;
begin
  if not public.ela_prospect_ouvrir(p) then raise exception 'ECHEC 5 : ouverture refusée'; end if;
  select * into l from public.prospects where id = p;
  if l.demo_ouverte_le is null or l.nb_visites <> 1 or l.derniere_visite_le is null then
    raise exception 'ECHEC 5 : première ouverture mal comptée : %', row_to_json(l); end if;
  perform public.ela_prospect_ouvrir(p);
  select * into l from public.prospects where id = p;
  if l.nb_visites <> 1 then raise exception 'ECHEC 5 : un rechargement compté comme une visite'; end if;
  update public.prospects set derniere_visite_le = now() - interval '1 hour',
                              demo_ouverte_le = now() - interval '2 hours' where id = p;
  perform public.ela_prospect_ouvrir(p);
  select * into l from public.prospects where id = p;
  if l.nb_visites <> 2 then raise exception 'ECHEC 5 : un retour après une heure non compté'; end if;
  if l.demo_ouverte_le > now() - interval '1 hour' then
    raise exception 'ECHEC 5 : la première ouverture a été réécrite'; end if;
  if public.ela_prospect_ouvrir(gen_random_uuid()) then
    raise exception 'ECHEC 5 : un prospect inconnu s''ouvre'; end if;
end $$;

-- ── 6. CONFIRMER : usage unique, 48 h ──────────────────────────────────
do $$
declare l public.prospects; p uuid := current_setting('test.p1')::uuid;
begin
  if public.ela_prospect_confirmer('pas-hexa') or public.ela_prospect_confirmer(null)
     or public.ela_prospect_confirmer(repeat('c', 64)) then
    raise exception 'ECHEC 6 : une empreinte fausse confirme'; end if;
  if not public.ela_prospect_confirmer(repeat('a', 64)) then
    raise exception 'ECHEC 6 : le bon jeton ne confirme pas'; end if;
  select * into l from public.prospects where id = p;
  if l.email_confirme_le is null or l.jeton_empreinte is not null or l.jeton_expire_le is not null then
    raise exception 'ECHEC 6 : confirmation mal posée : %', row_to_json(l); end if;
  if public.ela_prospect_confirmer(repeat('a', 64)) then
    raise exception 'ECHEC 6 : le jeton sert DEUX fois'; end if;
  -- Expiré : refusé, et la ligne reste non confirmée.
  update public.prospects set jeton_expire_le = now() - interval '1 minute'
   where id = current_setting('test.p2')::uuid;
  if public.ela_prospect_confirmer(repeat('b', 64)) then
    raise exception 'ECHEC 6 : un jeton expiré confirme'; end if;
  if (select email_confirme_le from public.prospects where id = current_setting('test.p2')::uuid) is not null then
    raise exception 'ECHEC 6 : un jeton expiré a posé la date'; end if;
end $$;
reset role;

-- ── 7. ANON : RIEN ─────────────────────────────────────────────────────
set role anon;
select epreuve.refus('7a anon lit', 'select * from public.prospects', '42501');
select epreuve.refus('7b anon écrit', $q$insert into public.prospects(type,etablissement,nom,email,telephone) values ('hotel','Hôtel A','Nom B','a@b.fr','+33612345678')$q$, '42501');
select epreuve.refus('7c anon crée par la porte', $q$select public.ela_prospect_creer('hotel','Hôtel A','Nom B','','a@b.fr','+33612345678','fr',null,3)$q$, '42501');
select epreuve.refus('7d anon confirme', $q$select public.ela_prospect_confirmer(repeat('b',64))$q$, '42501');
select epreuve.refus('7e anon ouvre', $q$select public.ela_prospect_ouvrir(gen_random_uuid())$q$, '42501');
reset role;

-- ── 8. L'ADMIN LIT, CHANGE LE STATUT ET LA NOTE, ET RIEN D'AUTRE ──────
select set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000001', false);
set role authenticated;
do $$
declare n bigint; l record; avant timestamptz; p uuid := current_setting('test.p2')::uuid;
begin
  if not public.est_admin() then raise exception 'ECHEC 8 : décor — l''admin n''est pas reconnu'; end if;
  select count(*) into n from public.prospects;
  if n < 7 then raise exception 'ECHEC 8 : l''admin ne lit que % prospects', n; end if;
  select dernier_contact_le into avant from public.prospects where id = p;
  n := epreuve.lignes(format($q$update public.prospects set statut = 'contacte', note = '  Rappeler lundi  ' where id = %L$q$, p));
  if n <> 1 then raise exception 'ECHEC 8 : l''admin ne change pas le statut'; end if;
  select statut, note, dernier_contact_le into l from public.prospects where id = p;
  if l.statut <> 'contacte' or l.note <> 'Rappeler lundi' or l.dernier_contact_le <= avant then
    raise exception 'ECHEC 8 : statut, note ou dernier contact : %', row_to_json(l); end if;
  perform epreuve.lignes(format($q$update public.prospects set note = '   ' where id = %L$q$, p));
  if (select note from public.prospects where id = p) is not null then
    raise exception 'ECHEC 8 : une note d''espaces n''est pas vidée'; end if;
end $$;
select epreuve.refus('8a statut inconnu', $q$update public.prospects set statut = 'vip'$q$, 'prospects_statut');
select epreuve.refus('8b note trop longue', $q$update public.prospects set note = repeat('x', 2001)$q$, 'prospects_note');
select epreuve.refus('8c admin modifie le téléphone', $q$update public.prospects set telephone = '+33600000000'$q$, '42501');
select epreuve.refus('8d admin modifie les visites', $q$update public.prospects set nb_visites = 99$q$, '42501');
select epreuve.refus('8e admin lit l''empreinte', 'select jeton_empreinte from public.prospects', '42501');
select epreuve.refus('8f admin supprime', 'delete from public.prospects', '42501');
select epreuve.refus('8g admin crée', $q$insert into public.prospects(type,etablissement,nom,email,telephone) values ('hotel','Hôtel A','Nom B','a@b.fr','+33612345678')$q$, '42501');
select epreuve.refus('8h admin appelle la porte de création', $q$select public.ela_prospect_creer('hotel','Hôtel A','Nom B','','a@b.fr','+33612345678','fr',null,3)$q$, '42501');
reset role;

-- ── 9. L'AGENT ET UN COMPTE QUELCONQUE : ZÉRO LIGNE ───────────────────
do $$
declare u text; n bigint;
begin
  foreach u in array array['aaaaaaaa-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000009'] loop
    perform set_config('test.uid', u, false);
    set local role authenticated;
    select count(*) into n from public.prospects;
    if n <> 0 then raise exception 'ECHEC 9 : le compte % lit % prospects', u, n; end if;
    n := epreuve.lignes($q$update public.prospects set statut = 'sans_suite'$q$);
    if n <> 0 then raise exception 'ECHEC 9 : le compte % modifie % prospects', u, n; end if;
    reset role;
  end loop;
end $$;
-- La preuve que l'agent est bien un exploitant (sinon l'épreuve 9 ne dit rien).
select set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000002', false);
do $$ begin
  if not public.est_exploitant() or public.est_admin() then
    raise exception 'ECHEC 9 : décor — l''agent n''est pas « exploitant sans être admin »'; end if;
end $$;
select set_config('test.uid', '', false);
-- Rien n'a été changé par l'agent : le statut posé par l'admin tient.
do $$ begin
  if exists (select 1 from public.prospects where statut = 'sans_suite') then
    raise exception 'ECHEC 9 : un compte non admin a changé un statut'; end if;
end $$;

select 'prospects : toutes les épreuves passent' as resultat;
