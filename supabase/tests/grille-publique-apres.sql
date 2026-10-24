-- ============================================================================
-- Épreuve de 20261023120000_grille_publique.sql — APRÈS la migration.
--
-- Décor : socle.sql, vues-lecture-seule.sql (tables fermées à anon, privilèges
-- par défaut de Supabase), tarif_unifie.sql, 20261005000000, la migration,
-- puis UN RÉGLAGE fait comme depuis l'admin (accueil à 15 €), puis la
-- migration REJOUÉE. On exige : le réglage a survécu (la migration n'écrase
-- jamais un prix réglé en production), anon lit la grille et rien d'autre,
-- une ligne désactivée ou illisible ne rend rien, personne n'écrit à travers
-- la vue, la table reste fermée.
-- ============================================================================

-- 1. Le réglage de l'admin a survécu à la migration rejouée, et anon le lit.
begin;
set local role anon;
do $$
declare
  v jsonb;
begin
  select valeur into v from public.grille_publique;
  if v is null then
    raise exception 'ÉCHEC : anon ne lit aucune grille';
  end if;
  if (v ->> 'accueil_centimes')::int <> 1500 then
    raise exception 'ÉCHEC : la migration rejouée a écrasé le réglage (accueil = %)', v ->> 'accueil_centimes';
  end if;
  if v -> 'tranches_km' <> '[12,22,32,42]'::jsonb
     or v -> 'berline' -> 'tranches_centimes' <> '[3500,5000,7000,9000]'::jsonb
     or v -> 'van' -> 'tranches_centimes' <> '[5000,8000,11000,13000]'::jsonb
     or (v -> 'forfaits' -> 'orly' ->> 'berline')::int <> 5500 then
    raise exception 'ÉCHEC : la grille posée n''est pas celle décidée le 23 octobre : %', v;
  end if;
end $$;
reset role;
rollback;

-- 2. La vue ne porte QUE la valeur de cette ligne — jamais la commission.
do $$ begin
  if (select string_agg(column_name, ',' order by ordinal_position)
        from information_schema.columns
       where table_schema = 'public' and table_name = 'grille_publique') <> 'valeur' then
    raise exception 'ÉCHEC : la vue expose d''autres colonnes que la grille';
  end if;
end $$;
insert into public.parametres_commerciaux(cle, valeur)
values ('commission_canaux', '{"site": {"mode": "pourcent", "valeur": 20}}')
on conflict (cle) do nothing;
begin;
set local role anon;
do $$ begin
  if (select count(*) from public.grille_publique) <> 1 then
    raise exception 'ÉCHEC : la vue rend une autre ligne que la grille';
  end if;
end $$;
reset role;
rollback;

-- 3. Une ligne illisible ne fait pas tomber la vue : elle ne rend rien. Puis
--    une ligne désactivée ne règle plus rien.
update public.parametres_commerciaux set valeur = '[12, 22]' where cle = 'grille_publique';
begin;
set local role anon;
do $$ begin
  if (select count(*) from public.grille_publique) <> 0 then
    raise exception 'ÉCHEC : un tableau est rendu comme une grille';
  end if;
end $$;
reset role;
rollback;
update public.parametres_commerciaux
   set valeur = '{"tranches_km":[12]}', actif = false
 where cle = 'grille_publique';
begin;
set local role anon;
do $$ begin
  if (select count(*) from public.grille_publique) <> 0 then
    raise exception 'ÉCHEC : une ligne désactivée règle encore la grille';
  end if;
end $$;
reset role;
rollback;

-- 4. Personne n'écrit à travers la vue, ni anon ni un compte connecté. On
--    ESSAIE vraiment.
do $$
declare
  r text;
  essai text;
begin
  foreach r in array array['anon', 'authenticated'] loop
    foreach essai in array array[
      'update public.grille_publique set valeur = ''{}''',
      'delete from public.grille_publique',
      'insert into public.grille_publique(valeur) values (''{}'')'] loop
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

-- 5. Les droits eux-mêmes : lecture seule pour les deux rôles publics.
do $$
declare
  d text;
begin
  foreach d in array array['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'] loop
    if has_table_privilege('anon', 'public.grille_publique', d)
       or has_table_privilege('authenticated', 'public.grille_publique', d) then
      raise exception 'ÉCHEC : droit % sur la vue', d;
    end if;
  end loop;
end $$;

-- 6. La table reste fermée à anon : la vue n'a rien ouvert d'autre.
begin;
set local role anon;
do $$ begin
  begin
    perform 1 from public.parametres_commerciaux limit 1;
    raise exception 'ÉCHEC : anon lit parametres_commerciaux';
  exception when insufficient_privilege then
    null;
  end;
end $$;
reset role;
rollback;

select 'grille-publique : OK';
