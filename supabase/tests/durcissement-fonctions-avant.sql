-- ============================================================================
-- Épreuve de 20261028000000_durcissement_fonctions.sql — PARTIE « AVANT ».
--
-- Ordre (comme en CI) : socle.sql, 20261002000000_courses_version.sql,
-- 20261006000000_numero_court.sql (les VRAIS déclencheurs), CE fichier, la
-- migration (deux fois : elle doit se rejouer), puis -apres.sql.
--
-- On repose ce que l'inventaire de production montre le 24/10 : « suivi »
-- SECURITY DEFINER, search_path=public, exécutable par anon et pas par
-- authenticated ; les deux déclencheurs sans réglage. Puis on EXIGE que les
-- deux défauts se reproduisent — sans quoi le refus éprouvé après ne
-- prouverait rien :
--   * un search_path de session piégé détourne les déclencheurs ;
--   * anon lit une course par « suivi ».
-- Le piège est posé par le superutilisateur de l'épreuve : en production,
-- aucun rôle public ne peut en poser un. L'épreuve montre le mécanisme que le
-- réglage ferme, pas une attaque possible par l'API.
-- ============================================================================
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'service_role')
  then create role service_role; end if;
end $$;
grant usage on schema public to anon, authenticated, service_role;
grant select on public.courses to service_role;

-- « suivi » telle que la production la porte (20260915_harden_ela_access.sql).
create or replace function public.suivi(p_ref text, p_jeton text)
returns table(statut text, chauffeur text)
language sql
stable
security definer
set search_path = public
as $$
  select c.statut, c.bon->'chauffeur'->>'nom'
  from public.courses as c
  where c.ref = left(trim(p_ref), 80)
    and c.bon->>'jeton' = left(trim(p_jeton), 256)
    and length(trim(p_ref)) between 1 and 80
    and length(trim(p_jeton)) between 16 and 256
  limit 1;
$$;
revoke all on function public.suivi(text, text) from public, authenticated;
grant execute on function public.suivi(text, text) to anon, service_role;

-- Une course de l'ancien site, avec son jeton (fictif).
insert into public.courses(ref, statut, bon)
values ('ELA-26-09-SUIVI', 'confirmee',
        '{"jeton":"jeton-ancien-site-0001","chauffeur":{"nom":"Prenom-Fictif"}}');

-- Le corps des deux déclencheurs, gardé pour vérifier après que la migration
-- n'a touché QUE le réglage.
create table public.epreuve_corps as
  select p.proname, md5(p.prosrc) as empreinte
    from pg_proc p
   where p.oid in (to_regprocedure('public.ela_courses_numero()'),
                   to_regprocedure('public.ela_courses_version()'));

-- LE PIÈGE : un schéma placé AVANT pg_catalog dans le search_path de la
-- session, avec des fonctions homonymes de celles qu'appellent les
-- déclencheurs.
create schema piege;
create function piege.now() returns timestamptz language plpgsql as $$
begin raise exception 'piege atteint : now()'; end $$;
create function piege.nextval(regclass) returns bigint language plpgsql as $$
begin raise exception 'piege atteint : nextval()'; end $$;
grant usage on schema piege to anon, authenticated, service_role;

-- DÉFAUT 1 : les deux déclencheurs suivent le search_path de la session.
do $$
declare msg text;
begin
  perform set_config('search_path', 'piege, pg_catalog, public', true);
  begin
    insert into public.courses(ref, statut, bon) values ('ELA-26-10-PIEGE', 'attente', '{}');
    raise exception 'etat mal repose : l''insertion n''est pas passee par le piege';
  exception when raise_exception then
    get stacked diagnostics msg = message_text;
    if msg not like 'piege atteint : nextval()%' then raise; end if;
  end;
  begin
    update public.courses set statut = 'confirmee' where ref = 'ELA-26-09-SUIVI';
    raise exception 'etat mal repose : la modification n''est pas passee par le piege';
  exception when raise_exception then
    get stacked diagnostics msg = message_text;
    if msg not like 'piege atteint : now()%' then raise; end if;
  end;
  perform set_config('search_path', '"$user", public', true);
end $$;

-- DÉFAUT 2 : anon lit la course par « suivi ».
set role anon;
do $$ begin
  if not exists (select 1 from public.suivi('ELA-26-09-SUIVI', 'jeton-ancien-site-0001')
                  where chauffeur = 'Prenom-Fictif') then
    raise exception 'etat mal repose : anon ne lit pas la course par suivi';
  end if;
end $$;
reset role;

select 'avant : les deux defauts se reproduisent' as etat;
