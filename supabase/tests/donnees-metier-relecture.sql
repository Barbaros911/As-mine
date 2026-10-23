-- RELU DANS UNE AUTRE SESSION (« l'admin fermé puis rouvert », « le nouveau
-- téléphone ») : ce qui est lu a été gardé par la base, pas seulement vu dans
-- la transaction qui l'a écrit.
select public.essai_jeton('aaaaaaaa-0000-0000-0000-000000000001', 'aal2');
set role authenticated;
do $$
declare c jsonb := public.ela_chauffeurs_lister(); r jsonb := public.ela_reglements_lister(); f jsonb := public.ela_factures_lister();
begin
  if jsonb_array_length(c) is distinct from 3 then raise exception 'relu : % fiches', jsonb_array_length(c); end if;
  if jsonb_array_length(r) is distinct from 2 then raise exception 'relu : % règlements', jsonb_array_length(r); end if;
  if jsonb_array_length(f) < 7 then raise exception 'relu : % factures', jsonb_array_length(f); end if;
  if (select count(distinct x->>'num') from jsonb_array_elements(f) x) is distinct from jsonb_array_length(f) then
    raise exception 'deux factures au même numéro'; end if;
  raise notice 'ok — relu dans une autre session : % fiches, % règlements, % factures, numéros uniques',
    jsonb_array_length(c), jsonb_array_length(r), jsonb_array_length(f);
end $$;
reset role;
-- Les retirés se relisent quand on le demande (vérification d'un import).
select public.essai_jeton('aaaaaaaa-0000-0000-0000-000000000001', 'aal2');
set role authenticated;
do $$ begin
  if jsonb_array_length(public.ela_reglements_lister(true)) is distinct from 3 then raise exception 'règlements, retirés compris : %', public.ela_reglements_lister(true); end if;
  if (select count(*) from jsonb_array_elements(public.ela_reglements_lister(true)) x where x->>'retire' = 'true') is distinct from 1 then raise exception 'le retiré n''est pas marqué'; end if;
  raise notice 'ok — les retirés se relisent, marqués';
end $$;
reset role;
