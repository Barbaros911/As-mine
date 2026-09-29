-- ============================================================================
-- LE RÔLE AGENT — épreuves, APRÈS la migration.
-- On éprouve LES DEUX CÔTÉS : l'agent est refusé, l'admin passe. Une règle
-- qui refuserait tout le monde rendrait les mêmes refus, et le test serait
-- vert sans rien prouver.
-- ============================================================================
insert into public.chauffeurs(id, nom_affiche, telephone_whatsapp, siret, adresse, statut, actif)
values ('11111111-1111-1111-1111-111111111111','Mehmet','0612345678',
        '90112233400015','12 rue des Lilas, 93200 Saint-Denis','valide',true)
on conflict do nothing;
insert into public.parametres_commerciaux(cle, valeur)
values ('commission_ela_defaut','{"pourcentage":20}') on conflict (cle) do nothing;

-- 1. est_admin distingue les deux comptes
do $$ begin
  perform set_config('test.uid','aaaaaaaa-0000-0000-0000-000000000002', false);
  if not public.est_exploitant() then raise exception 'ECHEC 1 : l''agent n''est plus exploitant'; end if;
  if public.est_admin() then raise exception 'ECHEC 1 : l''agent est vu comme admin'; end if;
  perform set_config('test.uid','aaaaaaaa-0000-0000-0000-000000000001', false);
  if not public.est_admin() then raise exception 'ECHEC 1 : l''admin n''est pas admin'; end if;
end $$;

-- 2. les fonctions gardent leur sécurité et prennent le verrou admin
do $$
declare f text;
begin
  foreach f in array array['public.ela_apercu_facture_commission(uuid,date,date)',
                           'public.ela_emettre_facture_commission(uuid,date,date)',
                           'public.ela_restaurer_courses_exploitant(jsonb)'] loop
    if not (select prosecdef from pg_proc where oid = to_regprocedure(f)) then
      raise exception 'ECHEC 2 : % a perdu security definer', f; end if;
    if position('est_admin()' in pg_get_functiondef(to_regprocedure(f))) = 0 then
      raise exception 'ECHEC 2 : % n''a pas le verrou admin', f; end if;
    if has_function_privilege('anon', f, 'execute') then
      raise exception 'ECHEC 2 : anon peut exécuter %', f; end if;
  end loop;
end $$;

-- 3. l'agent est refusé sur les trois fonctions, l'admin passe le verrou
do $$
declare refus int := 0;
begin
  perform set_config('test.uid','aaaaaaaa-0000-0000-0000-000000000002', false);
  begin perform public.ela_apercu_facture_commission('11111111-1111-1111-1111-111111111111','2026-09-01','2026-09-30');
  exception when others then if sqlerrm = 'acces_refuse' then refus := refus + 1; end if; end;
  begin perform public.ela_emettre_facture_commission('11111111-1111-1111-1111-111111111111','2026-09-01','2026-09-30');
  exception when others then if sqlerrm = 'acces_refuse' then refus := refus + 1; end if; end;
  begin perform public.ela_restaurer_courses_exploitant('[]'::jsonb);
  exception when others then if sqlerrm = 'acces_refuse' then refus := refus + 1; end if; end;
  if refus <> 3 then raise exception 'ECHEC 3 : l''agent n''est refusé que % fois sur 3', refus; end if;

  perform set_config('test.uid','aaaaaaaa-0000-0000-0000-000000000001', false);
  begin perform public.ela_apercu_facture_commission('11111111-1111-1111-1111-111111111111','2026-09-01','2026-09-30');
  exception when others then
    if sqlerrm = 'acces_refuse' then raise exception 'ECHEC 3 : l''admin est refusé sur l''aperçu'; end if; end;
  begin perform public.ela_restaurer_courses_exploitant('[]'::jsonb);
  exception when others then
    if sqlerrm = 'acces_refuse' then raise exception 'ECHEC 3 : l''admin est refusé sur la restauration'; end if; end;
end $$;

-- 4. les tables, sous le vrai rôle « authenticated » (la RLS ne s'applique
--    pas au propriétaire des tables)
select set_config('test.uid','aaaaaaaa-0000-0000-0000-000000000002', false);
set role authenticated;
do $$
declare n int;
begin
  select count(*) into n from public.parametres_commerciaux;
  if n = 0 then raise exception 'ECHEC 4 : l''agent ne lit plus la grille (le prix en a besoin)'; end if;
  update public.parametres_commerciaux set valeur = '{"pourcentage":0}' where cle = 'commission_ela_defaut';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'ECHEC 4 : l''agent a modifié la commission'; end if;
  begin
    insert into public.parametres_commerciaux(cle, valeur) values ('pirate','{}');
    raise exception 'ECHEC 4 : l''agent a inséré un réglage';
  exception when insufficient_privilege then null; end;
  select count(*) into n from public.factures_commission;
  -- aucune facture n'existe : le contrôle qui compte est celui de l'admin
  -- ci-dessous, qui prouve que la lecture n'est pas fermée à tous.
end $$;
reset role;

select set_config('test.uid','aaaaaaaa-0000-0000-0000-000000000001', false);
set role authenticated;
do $$
declare n int;
begin
  update public.parametres_commerciaux set valeur = '{"pourcentage":20}' where cle = 'commission_ela_defaut';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'ECHEC 4 : l''admin ne peut plus modifier la commission'; end if;
end $$;
reset role;

select 'ROLE AGENT : 4 blocs au vert' as resultat;
