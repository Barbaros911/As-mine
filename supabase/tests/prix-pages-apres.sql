-- ============================================================================
-- Épreuve de 20261014010000_prix_pages.sql — APRÈS la migration.
--
-- Décor : socle.sql, vues-lecture-seule.sql (tables fermées à anon, privilèges
-- par défaut de Supabase), tarif_unifie.sql, 20261005000000, puis la migration
-- DEUX fois (elle doit se rejouer). On exige : anon lit les seules valeurs
-- valides et rien d'autre, une valeur mal écrite ne règle rien et ne fait pas
-- tomber la vue, personne n'écrit à travers elle, la table reste fermée.
-- ============================================================================

-- 1. Sans réglage, la vue ne rend rien : le site garde son prix.
begin;
set local role anon;
do $$ begin
  if (select count(*) from public.prix_pages_publics) <> 0 then
    raise exception 'ÉCHEC : la vue rend un prix de page sans réglage';
  end if;
end $$;
reset role;
rollback;

-- 2. Le réglage tel que l'admin l'écrit, avec ce qu'une erreur de saisie
--    pourrait y mettre : textes, clé mal formée, zéros, excès, objet absent.
insert into public.parametres_commerciaux(cle, valeur) values
  ('prix_pages', '{
     "en-cdg":        {"pourcentage": 20},
     "fr-cdg":        {"pourcentage": 12.5, "par_km_centimes": {"berline": 350}},
     "en-orly":       {"pourcentage": "abc", "par_km_centimes": {"berline": "3,50", "van": 590}},
     "EN-X":          {"pourcentage": 10},
     "en-disneyland": {"pourcentage": 0, "par_km_centimes": {"berline": 0}},
     "en-cdg-orly":   {"pourcentage": 150, "par_km_centimes": {"berline": 300}},
     "en-accueil":    {"pourcentage": -5},
     "fr-orly":       25,
     "fr-chauffeur":  {"par_km_centimes": [350]},
     "page-test":     {"pourcentage": 10, "par_km_centimes": {"berline": 5000, "van": 20}}
   }');

begin;
set local role anon;
do $$
declare
  lignes text;
  attendu text := 'en-cdg=20/-/-,en-cdg-orly=-/300/-,en-orly=-/-/590,fr-cdg=12.5/350/-,page-test=10/-/-';
begin
  select string_agg(page || '=' || coalesce(pourcentage::text, '-') || '/'
                    || coalesce(berline_km_centimes::text, '-') || '/'
                    || coalesce(van_km_centimes::text, '-'), ',' order by page)
    into lignes from public.prix_pages_publics;
  if lignes is distinct from attendu then
    raise exception 'ÉCHEC : la vue rend « % » au lieu de « % »', lignes, attendu;
  end if;
end $$;
reset role;
rollback;

-- 3. La vue ne porte QUE la page, le pourcentage et les tarifs au km — jamais
--    la commission.
do $$ begin
  if (select string_agg(column_name, ',' order by ordinal_position)
        from information_schema.columns
       where table_schema = 'public' and table_name = 'prix_pages_publics')
     <> 'page,pourcentage,berline_km_centimes,van_km_centimes' then
    raise exception 'ÉCHEC : la vue expose d''autres colonnes que les prix des pages';
  end if;
end $$;

-- 4. Une ligne qui n'est pas un objet ne fait pas tomber la vue : elle ne rend
--    rien. Puis une ligne désactivée ne règle plus rien.
update public.parametres_commerciaux set valeur = '[20, 30]' where cle = 'prix_pages';
begin;
set local role anon;
do $$ begin
  if (select count(*) from public.prix_pages_publics) <> 0 then
    raise exception 'ÉCHEC : un tableau a produit un prix de page';
  end if;
end $$;
reset role;
rollback;
update public.parametres_commerciaux
   set valeur = '{"en-cdg": {"pourcentage": 20, "par_km_centimes": {"van": 600}}}', actif = false
 where cle = 'prix_pages';
begin;
set local role anon;
do $$ begin
  if (select count(*) from public.prix_pages_publics) <> 0 then
    raise exception 'ÉCHEC : une ligne désactivée règle encore un prix';
  end if;
end $$;
reset role;
rollback;
update public.parametres_commerciaux set actif = true where cle = 'prix_pages';

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
      'update public.prix_pages_publics set pourcentage = 90',
      'delete from public.prix_pages_publics',
      'insert into public.prix_pages_publics(page, pourcentage) values (''en-orly'', 50)'] loop
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
    if has_table_privilege('anon', 'public.prix_pages_publics', d)
       or has_table_privilege('authenticated', 'public.prix_pages_publics', d) then
      raise exception 'ÉCHEC : droit % sur la vue', d;
    end if;
  end loop;
  if not has_table_privilege('anon', 'public.prix_pages_publics', 'SELECT') then
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
  if (select valeur from public.parametres_commerciaux where cle = 'prix_pages')
       <> '{"en-cdg": {"pourcentage": 20, "par_km_centimes": {"van": 600}}}'::jsonb
     or (select count(*) from public.parametres_commerciaux where cle = 'commission_ela_defaut') <> 1 then
    raise exception 'ÉCHEC : un réglage a été modifié';
  end if;
end $$;

select 'prix des pages : épreuve passée' as resultat;
