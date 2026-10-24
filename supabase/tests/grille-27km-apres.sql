-- ============================================================================
-- Épreuve de 20261024120000_grille_marche_27km.sql — APRÈS la migration.
--
-- Lancée avec « -v cas=… », sur trois bases :
--   neuve   : 20261023120000 jamais appliquée ; la migration seule, deux fois.
--             On exige la grille entière, avec la marche, lue par anon.
--   apres23 : 20261023120000 appliquée, puis un réglage fait comme depuis
--             l'admin (accueil à 15 €, berline à 3 €/km au-delà), puis la
--             migration, deux fois. On exige la marche ajoutée ET les deux
--             réglages intacts : seules les tranches sont réécrites.
--   reglee  : 20261023120000 appliquée, puis la première tranche berline
--             réglée à 40 € depuis l'admin, puis la migration. On exige que
--             rien n'ait bougé : jamais une tranche réglée n'est écrasée.
-- ============================================================================

select set_config('ela.cas', :'cas', false);

begin;
set local role anon;
do $$
declare
  cas text := current_setting('ela.cas');
  v jsonb;
  n int;
begin
  select count(*) into n from public.grille_publique;
  if n <> 1 then
    raise exception 'ÉCHEC (%) : anon lit % grille(s) au lieu d''une', cas, n;
  end if;
  select valeur into v from public.grille_publique;
  if cas in ('neuve', 'apres23') then
    if v -> 'tranches_km' <> '[12,22,27,32,42]'::jsonb
       or v -> 'berline' -> 'tranches_centimes' <> '[3500,5000,6000,7000,9000]'::jsonb
       or v -> 'van' -> 'tranches_centimes' <> '[5000,8000,9500,11000,13000]'::jsonb then
      raise exception 'ÉCHEC (%) : la marche à 27 km n''est pas posée : %', cas, v;
    end if;
    if (v -> 'van' ->> 'au_dela_km_centimes')::int <> 380
       or (v -> 'forfaits' -> 'cdg' ->> 'berline')::int <> 7000
       or (v -> 'forfaits' -> 'orly' ->> 'van')::int <> 8000 then
      raise exception 'ÉCHEC (%) : la migration a touché autre chose que les tranches : %', cas, v;
    end if;
  end if;
  if cas = 'neuve' and ((v ->> 'accueil_centimes')::int <> 1000
                        or (v -> 'berline' ->> 'au_dela_km_centimes')::int <> 250) then
    raise exception 'ÉCHEC (neuve) : la grille posée n''est pas celle décidée : %', v;
  end if;
  if cas = 'apres23' and ((v ->> 'accueil_centimes')::int <> 1500
                          or (v -> 'berline' ->> 'au_dela_km_centimes')::int <> 300) then
    raise exception 'ÉCHEC (apres23) : un réglage de l''admin a été écrasé : %', v;
  end if;
  if cas = 'reglee' and (v -> 'tranches_km' <> '[12,22,32,42]'::jsonb
                         or v -> 'berline' -> 'tranches_centimes' <> '[4000,5000,7000,9000]'::jsonb) then
    raise exception 'ÉCHEC (reglee) : des tranches réglées depuis l''admin ont été écrasées : %', v;
  end if;
end $$;
reset role;
rollback;

-- La vue ne porte QUE la grille, et personne n'écrit à travers elle.
do $$
declare
  d text;
begin
  if (select string_agg(column_name, ',' order by ordinal_position)
        from information_schema.columns
       where table_schema = 'public' and table_name = 'grille_publique') <> 'valeur' then
    raise exception 'ÉCHEC : la vue expose d''autres colonnes que la grille';
  end if;
  foreach d in array array['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'] loop
    if has_table_privilege('anon', 'public.grille_publique', d)
       or has_table_privilege('authenticated', 'public.grille_publique', d) then
      raise exception 'ÉCHEC : droit % sur la vue', d;
    end if;
  end loop;
end $$;

-- La table reste fermée à anon.
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

select 'grille-27km (' || current_setting('ela.cas') || ') : OK';
