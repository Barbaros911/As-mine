-- ============================================================================
-- Épreuve de 20261005000000_vues_lecture_seule.sql — APRÈS la migration.
-- Le trou est fermé pour les deux rôles publics, sur les deux vues ET sur la
-- vue future qu'elle ne nomme pas, colonne comprise — et le site lit toujours.
-- ============================================================================

-- 1. Plus aucune écriture, pour anon comme pour un compte connecté. On ESSAIE
--    vraiment : un droit lu dans le catalogue ne dit pas ce que fait la base.
--    Sur une vue que PostgreSQL sait modifier (tarif_public pour DELETE, la
--    vue sonde), SEUL le refus de droit (insufficient_privilege) est une
--    preuve : c'est exactement là que le trou était ouvert. Sur une vue qu'il
--    ne sait pas modifier (jointure, colonnes calculées), il refuse AVANT de
--    regarder les droits (55000 ou 0A000) — refus honnête, mais qui ne prouve
--    rien sur les droits : le bloc 5 les lit à part. TRUNCATE n'est pas
--    essayé : PostgreSQL ne vide jamais une vue (« is not a table »).
do $$
declare
  r text;
  essai text;
  doit_etre_un_refus_de_droit text[] := array[
    'delete from public.tarif_public where gamme = ''berline''',
    'update public.sonde_vue_future set actif = false',
    'delete from public.sonde_vue_future'];
  refus_quelconque text[] := array[
    'update public.forfaits_partenaires_publics set montant_centimes = 100',
    'delete from public.forfaits_partenaires_publics',
    'update public.tarif_public set par_km_centimes = 10',
    'insert into public.tarif_public default values'];
begin
  foreach r in array array['anon', 'authenticated'] loop
    foreach essai in array doit_etre_un_refus_de_droit loop
      begin
        execute format('set local role %I', r);
        execute essai;
        reset role;
        raise exception 'ÉCHEC : % a pu exécuter « % »', r, essai;
      exception when insufficient_privilege then
        reset role;
      end;
    end loop;
    foreach essai in array refus_quelconque loop
      begin
        execute format('set local role %I', r);
        execute essai;
        reset role;
        raise exception 'ÉCHEC : % a pu exécuter « % »', r, essai;
      exception when insufficient_privilege or object_not_in_prerequisite_state
                  or feature_not_supported then
        reset role;
      end;
    end loop;
  end loop;
end $$;

-- 2. Rien n'a été effacé ni modifié par les essais.
do $$ begin
  if (select count(*) from public.parametres_commerciaux
       where cle in ('tarif_general_berline', 'tarif_general_van', 'commission_ela_defaut') and actif) <> 3 then
    raise exception 'ÉCHEC : un réglage a disparu ou a été désactivé';
  end if;
  if (select montant_centimes from public.tarifs_partenaires limit 1) <> 9000 then
    raise exception 'ÉCHEC : un forfait a été modifié';
  end if;
end $$;

-- 3. LE SITE LIT TOUJOURS — c'est la moitié qui compte pour les clients. Un
--    REVOKE trop large qui emporterait SELECT casserait l'affichage des prix,
--    en silence (le site retomberait sur ses prix de secours).
begin;
set local role anon;
do $$
declare
  n int;
  km int;
  forfait int;
begin
  select count(*), max(par_km_centimes) filter (where gamme = 'berline')
    into n, km from public.tarif_public;
  select max(montant_centimes) into forfait from public.forfaits_partenaires_publics;
  if n <> 2 or km <> 290 or forfait <> 9000 then
    raise exception 'ÉCHEC : anon ne lit plus les tarifs (lignes %, berline %, forfait %)', n, km, forfait;
  end if;
end $$;
reset role;
rollback;

-- 4. La commission n'est toujours pas lisible par anon, ni par la vue ni par
--    la table : la migration ne doit rien ouvrir en fermant.
do $$ begin
  if has_table_privilege('anon', 'public.parametres_commerciaux', 'SELECT') then
    raise exception 'ÉCHEC : anon lit la table des réglages, donc la commission';
  end if;
end $$;

-- 5. La règle générale, lue dans le catalogue : aucune vue de « public » n'a
--    gardé un droit d'écriture, ni sur la vue ni sur une colonne.
do $$
declare restes text;
begin
  select string_agg(c.relname || ':' || r.role || ':' || p.droit, ', ') into restes
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  cross join (values ('anon'), ('authenticated')) r(role)
  cross join (values ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE'), ('REFERENCES'), ('TRIGGER')) p(droit)
  where n.nspname = 'public' and c.relkind = 'v'
    and (has_table_privilege(r.role, c.oid, p.droit)
         or (p.droit in ('INSERT', 'UPDATE', 'REFERENCES') and has_any_column_privilege(r.role, c.oid, p.droit)));
  if restes is not null then raise exception 'ÉCHEC : droits d''écriture restants : %', restes; end if;
  raise notice 'vues en lecture seule : aucun droit d''écriture pour anon ni authenticated';
end $$;
