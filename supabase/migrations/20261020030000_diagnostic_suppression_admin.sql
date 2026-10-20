-- =====================================================================
-- DIAGNOSTIC — LA SUPPRESSION D'UNE COURSE MARCHE-T-ELLE VRAIMENT EN PRODUCTION ?
-- ---------------------------------------------------------------------
-- 20/10/2026, Barbaros : « toi fait tout à ma place ». Après
-- 20261020020000 (suppression réservée à l'admin), on l'ÉPROUVE sur la
-- vraie base, avec les vraies règles, au lieu de supposer.
--
-- RIEN N'EST EFFACÉ, ET C'EST GARANTI PAR LA BASE ELLE-MÊME. Tout l'essai
-- vit dans un bloc « begin … exception » qui se termine TOUJOURS par une
-- exception levée exprès : PostgreSQL annule alors tout ce qui s'est passé
-- dedans — suppressions, cascade vers attributions_chauffeur, changement
-- de rôle. On n'insère rien (une insertion consommerait un N° court). La
-- fonction est temporaire (pg_temp) et disparaît avec la session.
--
-- CE QUI EST JOUÉ, SOUS LE VRAI RÔLE « authenticated » ET LES VRAIES POLICIES :
--   1. le compte ADMIN supprime une course réalisée, et une course non
--      finie s'il y en a une → chacune doit partir (1 ligne) ;
--   2. un compte quelconque, connecté mais inconnu d'operateurs, tente la
--      même chose → 0 ligne ;
--   3. le compte AGENT (suspendu depuis 20261020000000) tente aussi → 0.
--
-- LE JOURNAL GITHUB EST PUBLIC : on ne sort que des comptes et des états —
-- ni référence, ni nom, ni identifiant de compte.
-- =====================================================================
create or replace function pg_temp.essai_suppression() returns jsonb
language plpgsql as $$
declare
  admin uuid; agent uuid; inconnu uuid := gen_random_uuid();
  faite text; vivante text; n int;
  r jsonb := '{}'::jsonb;
  apres_faite boolean; apres_vivante boolean;
begin
  select user_id into admin from public.operateurs where role = 'admin' and actif order by user_id limit 1;
  select user_id into agent from public.operateurs where role = 'agent_reservation' order by user_id limit 1;
  select ref into faite   from public.courses where statut = 'realisee' order by ref limit 1;
  select ref into vivante from public.courses where coalesce(statut, 'attente') in ('attente', 'confirmee') order by ref limit 1;
  r := r || jsonb_build_object(
    'compte_admin_actif', admin is not null,
    'compte_agent', case when agent is null then 'aucun'
                         when (select actif from public.operateurs where user_id = agent) then 'actif'
                         else 'suspendu' end,
    'course_realisee_disponible', faite is not null,
    'course_a_venir_disponible', vivante is not null);
  begin
    -- 2. un compte inconnu
    perform set_config('request.jwt.claim.sub', inconnu::text, true);
    perform set_config('request.jwt.claims', jsonb_build_object('sub', inconnu, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    delete from public.courses where ref in (faite, vivante);
    get diagnostics n = row_count;
    r := r || jsonb_build_object('inconnu_supprime', n);
    execute 'reset role';
    -- 3. l'agent
    if agent is not null then
      perform set_config('request.jwt.claim.sub', agent::text, true);
      perform set_config('request.jwt.claims', jsonb_build_object('sub', agent, 'role', 'authenticated')::text, true);
      execute 'set local role authenticated';
      delete from public.courses where ref in (faite, vivante);
      get diagnostics n = row_count;
      r := r || jsonb_build_object('agent_supprime', n);
      execute 'reset role';
    end if;
    -- 1. l'admin, une course à la fois
    if admin is not null then
      perform set_config('request.jwt.claim.sub', admin::text, true);
      perform set_config('request.jwt.claims', jsonb_build_object('sub', admin, 'role', 'authenticated')::text, true);
      execute 'set local role authenticated';
      if faite is not null then
        delete from public.courses where ref = faite;
        get diagnostics n = row_count;
        r := r || jsonb_build_object('admin_supprime_realisee', n);
      end if;
      if vivante is not null then
        delete from public.courses where ref = vivante;
        get diagnostics n = row_count;
        r := r || jsonb_build_object('admin_supprime_a_venir', n);
      end if;
      execute 'reset role';
    end if;
    -- On annule TOUT ce qui précède.
    raise exception using errcode = 'P0001', message = 'essai_annule';
  exception when others then
    if sqlerrm <> 'essai_annule' then
      r := r || jsonb_build_object('erreur', sqlstate || ' ' || left(sqlerrm, 200));
    end if;
  end;
  -- La preuve que rien n'est parti.
  select exists (select 1 from public.courses where ref = faite)   into apres_faite;
  select exists (select 1 from public.courses where ref = vivante) into apres_vivante;
  r := r || jsonb_build_object('rien_n_a_ete_efface',
         (faite is null or apres_faite) and (vivante is null or apres_vivante));
  r := r || jsonb_build_object('verdict', case
    when r ? 'erreur' then 'ERREUR : voir « erreur »'
    when coalesce((r->>'inconnu_supprime')::int, 0) <> 0 or coalesce((r->>'agent_supprime')::int, 0) <> 0
      then 'DÉFAUT : un compte autre que l''admin a pu supprimer'
    when (faite is not null and coalesce((r->>'admin_supprime_realisee')::int, 0) <> 1)
      or (vivante is not null and coalesce((r->>'admin_supprime_a_venir')::int, 0) <> 1)
      then 'DÉFAUT : l''admin n''a pas pu supprimer'
    else 'OK : seul l''admin supprime, réalisée comme à venir' end);
  return r;
end $$;

select jsonb_pretty(pg_temp.essai_suppression()) as diagnostic;
