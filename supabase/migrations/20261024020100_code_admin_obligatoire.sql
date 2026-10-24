-- ============================================================================
-- LE CLIQUET : LE CODE ADMIN DEVIENT OBLIGATOIRE POUR TOUS
-- (24 octobre 2026, à appliquer APRÈS 20261024020000, et après que chaque
-- opérateur actif a choisi son code depuis l'admin)
-- ----------------------------------------------------------------------------
-- Sans ce cliquet, un compte SANS code entre encore au mot de passe seul : un
-- agent réactivé demain, un opérateur ajouté pour un deuxième hôtel. Avec lui,
-- tout compte doit d'abord choisir son code avant de voir une seule course.
--
-- IL NE PEUT ENFERMER PERSONNE DEHORS : il refuse de se lever tant qu'un
-- opérateur ACTIF n'a pas de code, et il le dit (un nombre, jamais une
-- adresse e-mail : le journal du workflow est public).
-- RETOUR ARRIÈRE, dans l'éditeur SQL de Supabase :
--   update public.securite_admin set double_verification_exigee = false, modifie_le = now();
-- ============================================================================
do $$
declare
  sans_code integer;
begin
  if to_regclass('public.codes_admin') is null then
    raise exception 'appliquer d''abord 20261024020000_code_admin.sql';
  end if;
  select count(*) into sans_code
  from public.operateurs o
  where o.actif
    and not exists (select 1 from public.codes_admin c where c.user_id = o.user_id);
  if sans_code > 0 then
    raise exception '% opérateur(s) actif(s) sans code : rien n''a été changé. Choisir le code depuis l''admin (Réglages → Code admin), puis relancer.', sans_code;
  end if;
  update public.securite_admin set double_verification_exigee = true, modifie_le = now() where id;
end $$;

select 'code admin obligatoire' as etat,
       (select double_verification_exigee from public.securite_admin where id) as exige_pour_tous;
