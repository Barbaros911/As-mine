-- ============================================================================
-- LE CODE ADMIN — ce qui doit être vrai APRÈS la migration
-- Chaque cas est joué sous le VRAI rôle (anon, authenticated) avec un jeton
-- posé comme le ferait PostgREST ; un refus est exigé POUR LA BONNE RAISON.
-- Le jeton porte « session_id » : « mdp » = une session ouverte au mot de
-- passe seul ; « aal2 » = une session où le code a été tapé juste.
-- ============================================================================
create or replace function public.essai_attendre(p_uid text, p_session text,
  p_exploitant boolean, p_admin boolean, p_cas text) returns void
language plpgsql as $$
declare e boolean; a boolean; n integer; sonde text;
begin
  perform public.essai_jeton(p_uid, p_session);
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
  if n is distinct from (case when p_exploitant then 1 else 0 end) then
    raise exception '% : % course(s) lue(s), attendu %', p_cas, n, case when p_exploitant then 1 else 0 end; end if;
  if sonde is distinct from (case when p_admin then 'acceptee' else 'refusee' end) then
    raise exception '% : fonction réservée à l''admin %', p_cas, sonde; end if;
  raise notice 'ok — %', p_cas;
end $$;

-- Une fonction du code, appelée sous le vrai rôle, avec son résultat exigé.
create or replace function public.essai_code(p_uid text, p_session text,
  p_appel text, p_attendu text, p_cas text) returns void
language plpgsql as $$
declare r text;
begin
  perform public.essai_jeton(p_uid, p_session);
  execute 'set local role authenticated';
  execute 'select ' || p_appel into r;
  execute 'reset role';
  if r is distinct from p_attendu then
    raise exception '% : % a rendu %, attendu %', p_cas, p_appel, r, p_attendu; end if;
  raise notice 'ok — %', p_cas;
end $$;

-- ════ 1. LES PORTES ════
begin;
select public.essai_attendre('aaaaaaaa-0000-0000-0000-000000000001', 'mdp', false, false,
  'admin avec code, mot de passe seul : REFUSÉ partout');
rollback;
begin;
select public.essai_attendre('aaaaaaaa-0000-0000-0000-000000000001', 'aal2', true, true,
  'admin avec code, session où le code a été tapé : accepté');
rollback;
begin;
select public.essai_attendre('aaaaaaaa-0000-0000-0000-000000000002', 'aal2', true, false,
  'agent avec code confirmé : exploitant, jamais admin');
rollback;
begin;
select public.essai_attendre('aaaaaaaa-0000-0000-0000-000000000002', 'mdp', false, false,
  'agent avec code, mot de passe seul : refusé');
rollback;
begin;
select public.essai_attendre('aaaaaaaa-0000-0000-0000-000000000003', 'mdp', true, true,
  'admin SANS code, cliquet baissé : entre encore (rien n''enferme avant le choix du code)');
rollback;
begin;
select public.essai_attendre('aaaaaaaa-0000-0000-0000-000000000004', 'aal2', false, false,
  'compte connecté qui n''est pas opérateur : refusé');
rollback;
begin;
select public.essai_attendre('aaaaaaaa-0000-0000-0000-000000000005', 'aal2', false, false,
  'admin suspendu, même session confirmée : refusé');
rollback;
begin;
select public.essai_attendre('aaaaaaaa-0000-0000-0000-000000000001', null, false, false,
  'jeton sans session (claims incomplets) : refusé');
rollback;
begin;
-- La session confirmée de l'admin 1 ne vaut pas pour un autre compte qui
-- porterait le même identifiant de session.
select public.essai_attendre('aaaaaaaa-0000-0000-0000-000000000006', 'aal2', true, true,
  'admin 6 sans code : entre (contrôle du décor)');
insert into public.codes_admin(user_id, empreinte)
  values ('aaaaaaaa-0000-0000-0000-000000000006', extensions.crypt('111111', extensions.gen_salt('bf', 4)));
select public.essai_attendre('aaaaaaaa-0000-0000-0000-000000000006', 'aal2', false, false,
  'la session confirmée d''UN compte ne vaut pas pour un autre');
rollback;
begin;
update public.sessions_admin set ouverte_le = now() - interval '31 days'
 where user_id = 'aaaaaaaa-0000-0000-0000-000000000001';
select public.essai_attendre('aaaaaaaa-0000-0000-0000-000000000001', 'aal2', false, false,
  'une session confirmée il y a plus de 30 jours redemande le code');
rollback;

-- UNE SESSION OUVERTE AVANT LE CODE NE LE CONTOURNE PAS : l'admin 3 entre
-- au mot de passe, PUIS un code est posé. La même session est refusée à
-- l'appel suivant — le contrôle se fait à chaque requête.
begin;
select public.essai_attendre('aaaaaaaa-0000-0000-0000-000000000003', 'mdp', true, true,
  'ancienne session : avant le code, acceptée');
insert into public.codes_admin(user_id, empreinte)
  values ('aaaaaaaa-0000-0000-0000-000000000003', extensions.crypt('222222', extensions.gen_salt('bf', 4)));
select public.essai_attendre('aaaaaaaa-0000-0000-0000-000000000003', 'mdp', false, false,
  'ancienne session : dès le code posé, la même session est refusée');
rollback;

-- ════ 2. TAPER SON CODE ════
begin;
select public.essai_code('aaaaaaaa-0000-0000-0000-000000000001', 's1', 'public.ela_code_admin_etat()', 'a_saisir',
  'état : code à saisir');
select public.essai_code('aaaaaaaa-0000-0000-0000-000000000001', 's1', 'public.ela_code_admin_verifier(''000000'')', 'faux',
  'un code faux est refusé');
select public.essai_attendre('aaaaaaaa-0000-0000-0000-000000000001', 's1', false, false,
  'après un code faux : toujours refusé');
select public.essai_code('aaaaaaaa-0000-0000-0000-000000000001', 's1', 'public.ela_code_admin_verifier(''12345'')', 'faux',
  '5 chiffres : faux, sans erreur');
select public.essai_code('aaaaaaaa-0000-0000-0000-000000000001', 's1', 'public.ela_code_admin_verifier(''123456'')', 'ok',
  'le bon code confirme la session');
select public.essai_attendre('aaaaaaaa-0000-0000-0000-000000000001', 's1', true, true,
  'session confirmée : l''admin entre');
select public.essai_attendre('aaaaaaaa-0000-0000-0000-000000000001', 's2', false, false,
  'une AUTRE session du même compte redemande le code');
select public.essai_code('aaaaaaaa-0000-0000-0000-000000000001', 's1', 'public.ela_code_admin_etat()', 'ok',
  'état : ok');
do $$ begin
  if (select essais_faux from public.codes_admin where user_id = 'aaaaaaaa-0000-0000-0000-000000000001') is distinct from 0 then
    raise exception 'le bon code n''a pas remis les essais à zéro'; end if;
end $$;
rollback;

-- 5 CODES FAUX DE SUITE : 15 minutes de blocage, MÊME avec le bon code.
-- Le compte des essais est écrit, chaque appel dans sa propre transaction
-- (comme PostgREST) : une erreur levée l'aurait effacé.
select public.essai_code('aaaaaaaa-0000-0000-0000-000000000001', 's3', 'public.ela_code_admin_verifier(''000001'')', 'faux', 'essai 1');
select public.essai_code('aaaaaaaa-0000-0000-0000-000000000001', 's3', 'public.ela_code_admin_verifier(''000002'')', 'faux', 'essai 2');
select public.essai_code('aaaaaaaa-0000-0000-0000-000000000001', 's3', 'public.ela_code_admin_verifier(''000003'')', 'faux', 'essai 3');
select public.essai_code('aaaaaaaa-0000-0000-0000-000000000001', 's3', 'public.ela_code_admin_verifier(''000004'')', 'faux', 'essai 4');
select public.essai_code('aaaaaaaa-0000-0000-0000-000000000001', 's3', 'public.ela_code_admin_verifier(''000005'')', 'bloque', 'essai 5 : bloqué');
select public.essai_code('aaaaaaaa-0000-0000-0000-000000000001', 's3', 'public.ela_code_admin_verifier(''123456'')', 'bloque',
  'bloqué : même le bon code est refusé');
select public.essai_code('aaaaaaaa-0000-0000-0000-000000000001', 's3', 'public.ela_code_admin_etat()', 'bloque', 'état : bloqué');
select public.essai_attendre('aaaaaaaa-0000-0000-0000-000000000001', 's3', false, false, 'bloqué : rien ne s''ouvre');
do $$ begin
  if (select bloque_jusqua from public.codes_admin where user_id = 'aaaaaaaa-0000-0000-0000-000000000001')
     not between now() + interval '14 minutes' and now() + interval '16 minutes' then
    raise exception 'le blocage ne dure pas 15 minutes'; end if;
end $$;
-- Les 15 minutes passées, le bon code rouvre.
update public.codes_admin set bloque_jusqua = now() - interval '1 second'
 where user_id = 'aaaaaaaa-0000-0000-0000-000000000001';
select public.essai_code('aaaaaaaa-0000-0000-0000-000000000001', 's3', 'public.ela_code_admin_verifier(''123456'')', 'ok',
  'après le blocage : le bon code rouvre');

-- Les autres comptes n'en tirent rien.
select public.essai_code('aaaaaaaa-0000-0000-0000-000000000004', 'x', 'public.ela_code_admin_verifier(''123456'')', 'non',
  'pas opérateur : « non »');
select public.essai_code('aaaaaaaa-0000-0000-0000-000000000004', 'x', 'public.ela_code_admin_etat()', 'non',
  'pas opérateur : l''état ne dit rien de plus');
select public.essai_code('aaaaaaaa-0000-0000-0000-000000000005', 'x', 'public.ela_code_admin_verifier(''123456'')', 'non',
  'suspendu : le bon code n''ouvre rien');
select public.essai_code('aaaaaaaa-0000-0000-0000-000000000005', 'x', 'public.ela_code_admin_etat()', 'suspendu',
  'suspendu : l''état le dit');
select public.essai_code('aaaaaaaa-0000-0000-0000-000000000003', 'x', 'public.ela_code_admin_etat()', 'aucun',
  'sans code : « aucun »');
select public.essai_code('aaaaaaaa-0000-0000-0000-000000000003', 'x', 'public.ela_code_admin_verifier(''123456'')', 'aucun',
  'sans code : rien à vérifier');

-- ════ 3. CHOISIR ET CHANGER SON CODE ════
begin;
select public.essai_code('aaaaaaaa-0000-0000-0000-000000000003', 'c1', 'public.ela_code_admin_choisir(''12a456'')', 'format',
  'un code qui n''est pas 6 chiffres est refusé');
select public.essai_code('aaaaaaaa-0000-0000-0000-000000000003', 'c1', 'public.ela_code_admin_choisir(''1234567'')', 'format',
  '7 chiffres : refusé');
select public.essai_code('aaaaaaaa-0000-0000-0000-000000000003', 'c1', 'public.ela_code_admin_choisir(''480512'')', 'ok',
  'premier code choisi');
select public.essai_attendre('aaaaaaaa-0000-0000-0000-000000000003', 'c1', true, true,
  'la session qui l''a choisi reste ouverte');
select public.essai_attendre('aaaaaaaa-0000-0000-0000-000000000003', 'c2', false, false,
  'une autre session demande désormais le code');
select public.essai_code('aaaaaaaa-0000-0000-0000-000000000003', 'c2', 'public.ela_code_admin_choisir(''000000'')', 'code_requis',
  'un mot de passe volé ne suffit pas à CHANGER le code');
select public.essai_code('aaaaaaaa-0000-0000-0000-000000000003', 'c2', 'public.ela_code_admin_verifier(''480512'')', 'ok',
  'le code choisi ouvre une autre session');
select public.essai_code('aaaaaaaa-0000-0000-0000-000000000003', 'c2', 'public.ela_code_admin_choisir(''777888'')', 'ok',
  'dans une session confirmée, on le change');
select public.essai_attendre('aaaaaaaa-0000-0000-0000-000000000003', 'c1', false, false,
  'un code changé ferme les AUTRES sessions confirmées');
select public.essai_code('aaaaaaaa-0000-0000-0000-000000000003', 'c3', 'public.ela_code_admin_verifier(''480512'')', 'faux',
  'l''ancien code ne sert plus');
select public.essai_code('aaaaaaaa-0000-0000-0000-000000000003', 'c3', 'public.ela_code_admin_verifier(''777888'')', 'ok',
  'le nouveau, si');
do $$ begin
  if exists (select 1 from public.codes_admin where empreinte ~ '480512|777888') then
    raise exception 'le code est gardé en clair'; end if;
  if (select empreinte from public.codes_admin where user_id = 'aaaaaaaa-0000-0000-0000-000000000003') !~ '^\$2[abxy]\$' then
    raise exception 'l''empreinte n''est pas du bcrypt'; end if;
end $$;
rollback;
select public.essai_code('aaaaaaaa-0000-0000-0000-000000000004', 'x', 'public.ela_code_admin_choisir(''123456'')', 'non',
  'pas opérateur : ne choisit rien');
select public.essai_code('aaaaaaaa-0000-0000-0000-000000000005', 'x', 'public.ela_code_admin_choisir(''123456'')', 'non',
  'suspendu : ne choisit rien');
select public.essai_code('aaaaaaaa-0000-0000-0000-000000000003', null, 'public.ela_code_admin_choisir(''123456'')', 'non',
  'jeton sans session : ne choisit rien');

-- ════ 4. CE QUE PERSONNE NE LIT ════
select public.essai_jeton(null, null);
set role anon;
do $$ begin
  begin perform public.est_exploitant(); raise exception 'anon exécute est_exploitant()';
  exception when insufficient_privilege then null; end;
  begin perform public.est_admin(); raise exception 'anon exécute est_admin()';
  exception when insufficient_privilege then null; end;
  begin perform public.ela_session_suffisante(); raise exception 'anon exécute ela_session_suffisante()';
  exception when insufficient_privilege then null; end;
  begin perform public.ela_code_admin_etat(); raise exception 'anon exécute ela_code_admin_etat()';
  exception when insufficient_privilege then null; end;
  begin perform public.ela_code_admin_verifier('123456'); raise exception 'anon essaie un code';
  exception when insufficient_privilege then null; end;
  begin perform public.ela_code_admin_choisir('123456'); raise exception 'anon choisit un code';
  exception when insufficient_privilege then null; end;
  begin perform 1 from public.courses; raise exception 'anon lit courses';
  exception when insufficient_privilege then null; end;
  begin perform 1 from public.securite_admin; raise exception 'anon lit securite_admin';
  exception when insufficient_privilege then null; end;
  begin perform 1 from public.codes_admin; raise exception 'anon lit codes_admin';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

select public.essai_jeton('aaaaaaaa-0000-0000-0000-000000000001', 'aal2');
set role authenticated;
do $$ begin
  begin perform 1 from public.securite_admin; raise exception 'un compte connecté lit securite_admin';
  exception when insufficient_privilege then null; end;
  begin update public.securite_admin set double_verification_exigee = false;
        raise exception 'un compte connecté change securite_admin';
  exception when insufficient_privilege then null; end;
  begin perform 1 from public.codes_admin; raise exception 'un compte connecté lit les empreintes';
  exception when insufficient_privilege then null; end;
  begin delete from public.codes_admin; raise exception 'un compte connecté efface les codes';
  exception when insufficient_privilege then null; end;
  begin insert into public.sessions_admin values ('pirate', 'aaaaaaaa-0000-0000-0000-000000000001');
        raise exception 'un compte connecté se déclare une session confirmée';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- LES FONCTIONS « definer » : search_path vide, aucun droit pour public.
do $$ declare f text; p record; begin
  foreach f in array array['public.ela_session_suffisante()', 'public.ela_code_admin_etat()',
                           'public.ela_code_admin_verifier(text)', 'public.ela_code_admin_choisir(text)'] loop
    select prosecdef, proconfig into p from pg_proc where oid = f::regprocedure;
    if not p.prosecdef then raise exception '% devrait être definer', f; end if;
    if not ('search_path=""' = any(p.proconfig)) then
      raise exception '% sans search_path vide : %', f, p.proconfig; end if;
    if has_function_privilege('anon', f::regprocedure, 'EXECUTE') then
      raise exception 'anon exécute %', f; end if;
  end loop;
end $$;

select 'code admin : tous les cas tiennent' as etat;
