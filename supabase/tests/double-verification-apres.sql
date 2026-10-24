-- ============================================================================
-- LA DOUBLE VÉRIFICATION — ce qui doit être vrai APRÈS la migration
-- Chaque cas est joué sous le VRAI rôle (anon, authenticated) avec un jeton
-- posé comme le ferait PostgREST ; un refus est exigé POUR LA BONNE RAISON.
-- ============================================================================
create or replace function public.essai_attendre(p_uid text, p_aal text,
  p_exploitant boolean, p_admin boolean, p_cas text) returns void
language plpgsql as $$
declare e boolean; a boolean; n integer; sonde text;
begin
  perform public.essai_jeton(p_uid, p_aal);
  execute 'set local role authenticated';
  e := public.est_exploitant();
  a := public.est_admin();
  select count(*) into n from public.courses;
  begin
    perform public.sonde_admin(); sonde := 'acceptee';
  exception when insufficient_privilege then sonde := 'refusee';
  end;
  execute 'reset role';
  if e is distinct from p_exploitant then
    raise exception '% : est_exploitant() = %, attendu %', p_cas, e, p_exploitant; end if;
  if a is distinct from p_admin then
    raise exception '% : est_admin() = %, attendu %', p_cas, a, p_admin; end if;
  if n <> (case when p_exploitant then 1 else 0 end) then
    raise exception '% : % course(s) lue(s), attendu %', p_cas, n, case when p_exploitant then 1 else 0 end; end if;
  if sonde <> (case when p_admin then 'acceptee' else 'refusee' end) then
    raise exception '% : fonction réservée à l''admin %', p_cas, sonde; end if;
  raise notice 'ok — %', p_cas;
end $$;

begin;
select public.essai_attendre('aaaaaaaa-0000-0000-0000-000000000001', 'aal1', false, false,
  'admin avec code, mot de passe seul (aal1) : REFUSÉ partout');
rollback;
begin;
select public.essai_attendre('aaaaaaaa-0000-0000-0000-000000000001', 'aal2', true, true,
  'admin avec code, mot de passe + code (aal2) : accepté');
rollback;
begin;
select public.essai_attendre('aaaaaaaa-0000-0000-0000-000000000002', 'aal2', true, false,
  'agent avec code (aal2) : exploitant, jamais admin');
rollback;
begin;
select public.essai_attendre('aaaaaaaa-0000-0000-0000-000000000002', 'aal1', false, false,
  'agent avec code, mot de passe seul : refusé');
rollback;
begin;
select public.essai_attendre('aaaaaaaa-0000-0000-0000-000000000003', 'aal1', true, true,
  'admin SANS code, cliquet baissé : entre encore (rien n''enferme avant l''activation)');
rollback;
begin;
select public.essai_attendre('aaaaaaaa-0000-0000-0000-000000000006', 'aal1', true, true,
  'admin dont le code n''est pas encore vérifié : pas enfermé pendant l''activation');
rollback;
begin;
select public.essai_attendre('aaaaaaaa-0000-0000-0000-000000000004', 'aal2', false, false,
  'compte connecté qui n''est pas opérateur, même en aal2 : refusé');
rollback;
begin;
select public.essai_attendre('aaaaaaaa-0000-0000-0000-000000000005', 'aal2', false, false,
  'admin suspendu, même en aal2 : refusé');
rollback;
begin;
select public.essai_attendre('aaaaaaaa-0000-0000-0000-000000000001', null, false, false,
  'jeton sans niveau (ancienne session, claims incomplets) : refusé');
rollback;

-- UNE ANCIENNE SESSION NE CONTOURNE RIEN : l'admin 3 se connecte au mot de
-- passe (aal1, accepté), PUIS active son code. Le même jeton aal1 est refusé
-- à l'appel suivant — le contrôle se fait à chaque requête, pas à la connexion.
begin;
select public.essai_attendre('aaaaaaaa-0000-0000-0000-000000000003', 'aal1', true, true,
  'ancienne session : avant l''activation, acceptée');
insert into auth.mfa_factors(user_id, status) values ('aaaaaaaa-0000-0000-0000-000000000003', 'verified');
select public.essai_attendre('aaaaaaaa-0000-0000-0000-000000000003', 'aal1', false, false,
  'ancienne session : dès l''activation, la même session aal1 est refusée');
rollback;

-- ANONYME : n'exécute ni les portes, ni le juge, ne lit rien.
select public.essai_jeton(null, null);
set role anon;
do $$ begin
  begin perform public.est_exploitant(); raise exception 'anon exécute est_exploitant()';
  exception when insufficient_privilege then null; end;
  begin perform public.est_admin(); raise exception 'anon exécute est_admin()';
  exception when insufficient_privilege then null; end;
  begin perform public.ela_session_suffisante(); raise exception 'anon exécute ela_session_suffisante()';
  exception when insufficient_privilege then null; end;
  begin perform 1 from public.courses; raise exception 'anon lit courses';
  exception when insufficient_privilege then null; end;
  begin perform 1 from public.securite_admin; raise exception 'anon lit securite_admin';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- CONNECTÉ : ne lit ni ne change le réglage, ne lit pas les codes des autres.
select public.essai_jeton('aaaaaaaa-0000-0000-0000-000000000001', 'aal2');
set role authenticated;
do $$ begin
  begin perform 1 from public.securite_admin; raise exception 'un compte connecté lit securite_admin';
  exception when insufficient_privilege then null; end;
  begin update public.securite_admin set double_verification_exigee = false;
        raise exception 'un compte connecté change securite_admin';
  exception when insufficient_privilege then null; end;
  begin perform 1 from auth.mfa_factors; raise exception 'un compte connecté lit auth.mfa_factors';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- LE JUGE : definer, search_path vide, aucun droit pour public.
do $$ declare p record; begin
  select prosecdef, proconfig into p from pg_proc where oid = 'public.ela_session_suffisante()'::regprocedure;
  if not p.prosecdef then raise exception 'ela_session_suffisante() devrait être definer'; end if;
  if not ('search_path=""' = any(p.proconfig)) then
    raise exception 'ela_session_suffisante() sans search_path vide : %', p.proconfig; end if;
end $$;

select 'double vérification : tous les cas tiennent' as etat;
