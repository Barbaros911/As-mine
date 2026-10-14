-- ============================================================================
-- Épreuve de 20261014010000_majoration_pages.sql — APRÈS la migration.
--
-- Décor : socle.sql, vues-lecture-seule.sql (tables fermées à anon, privilèges
-- par défaut de Supabase), tarif_unifie.sql, 20261005000000, puis la migration
-- DEUX fois (elle doit se rejouer). On exige : anon lit les pourcentages et
-- rien d'autre, une ligne mal écrite ne majore rien et ne fait pas tomber la
-- vue, personne n'écrit à travers elle, la table reste fermée.
-- ============================================================================

-- 1. Sans réglage, la vue ne rend rien : le site garde le prix de base.
begin;
set local role anon;
do $$ begin
  if (select count(*) from public.majorations_pages_publiques) <> 0 then
    raise exception 'ÉCHEC : la vue rend une majoration sans réglage';
  end if;
end $$;
reset role;
rollback;

-- 2. Le réglage tel que l'admin l'écrit, avec ce qu'une erreur de saisie
--    pourrait y mettre : un texte, une clé mal formée, un zéro, un excès.
insert into public.parametres_commerciaux(cle, valeur) values
  ('majoration_pages', '{"en-cdg":20,"fr-cdg":12.5,"en-orly":"abc","EN-X":10,"en-disneyland":0,"en-cdg-orly":150,"en-accueil":-5}');

begin;
set local role anon;
do $$
declare
  lignes text;
begin
  select string_agg(page || '=' || pourcentage::text, ',' order by page)
    into lignes from public.majorations_pages_publiques;
  if lignes is distinct from 'en-cdg=20,fr-cdg=12.5' then
    raise exception 'ÉCHEC : la vue rend « % » au lieu de « en-cdg=20,fr-cdg=12.5 »', lignes;
  end if;
end $$;
reset role;
rollback;

-- 3. La vue ne porte QUE la page et le pourcentage — jamais la commission.
do $$ begin
  if (select string_agg(column_name, ',' order by ordinal_position)
        from information_schema.columns
       where table_schema = 'public' and table_name = 'majorations_pages_publiques')
     <> 'page,pourcentage' then
    raise exception 'ÉCHEC : la vue expose d''autres colonnes que page et pourcentage';
  end if;
end $$;

-- 4. Une ligne qui n'est pas un objet ne fait pas tomber la vue : elle ne rend
--    rien. Puis une ligne désactivée ne majore plus.
update public.parametres_commerciaux set valeur = '[20, 30]' where cle = 'majoration_pages';
begin;
set local role anon;
do $$ begin
  if (select count(*) from public.majorations_pages_publiques) <> 0 then
    raise exception 'ÉCHEC : un tableau a produit une majoration';
  end if;
end $$;
reset role;
rollback;
update public.parametres_commerciaux set valeur = '{"en-cdg":20}', actif = false where cle = 'majoration_pages';
begin;
set local role anon;
do $$ begin
  if (select count(*) from public.majorations_pages_publiques) <> 0 then
    raise exception 'ÉCHEC : une ligne désactivée majore encore';
  end if;
end $$;
reset role;
rollback;
update public.parametres_commerciaux set actif = true where cle = 'majoration_pages';

-- 5. Personne n'écrit à travers la vue, ni anon ni un compte connecté. On
--    ESSAIE vraiment ; PostgreSQL refuse aussi une vue qu'il ne sait pas
--    modifier — les droits sont lus à part au bloc 6.
do $$
declare
  r text;
  essai text;
begin
  foreach r in array array['anon', 'authenticated'] loop
    foreach essai in array array[
      'update public.majorations_pages_publiques set pourcentage = 90',
      'delete from public.majorations_pages_publiques',
      'insert into public.majorations_pages_publiques(page, pourcentage) values (''en-orly'', 50)'] loop
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

-- 6. Les droits eux-mêmes : lecture seule pour les deux rôles publics.
do $$
declare
  d text;
begin
  foreach d in array array['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'] loop
    if has_table_privilege('anon', 'public.majorations_pages_publiques', d)
       or has_table_privilege('authenticated', 'public.majorations_pages_publiques', d) then
      raise exception 'ÉCHEC : droit % sur la vue', d;
    end if;
  end loop;
  if not has_table_privilege('anon', 'public.majorations_pages_publiques', 'SELECT') then
    raise exception 'ÉCHEC : anon ne lit pas la vue';
  end if;
end $$;

-- 7. La table reste fermée à anon : la vue n'a rien ouvert d'autre.
begin;
set local role anon;
do $$ begin
  begin
    perform 1 from public.parametres_commerciaux limit 1;
    raise exception 'ÉCHEC : anon lit parametres_commerciaux';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
rollback;

-- 8. Les essais n'ont rien changé.
do $$ begin
  if (select valeur from public.parametres_commerciaux where cle = 'majoration_pages') <> '{"en-cdg":20}'::jsonb
     or (select count(*) from public.parametres_commerciaux where cle = 'commission_ela_defaut') <> 1 then
    raise exception 'ÉCHEC : un réglage a été modifié';
  end if;
end $$;

select 'majoration des pages : épreuve passée' as resultat;
