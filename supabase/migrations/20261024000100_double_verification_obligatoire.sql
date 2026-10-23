-- ============================================================================
-- LE CLIQUET : LA DOUBLE VÉRIFICATION DEVIENT OBLIGATOIRE POUR TOUS
-- (24 octobre 2026, à appliquer APRÈS 20261024000000, et après que chaque
-- opérateur actif a activé son code depuis l'admin)
-- ----------------------------------------------------------------------------
-- Sans ce cliquet, un compte SANS code entre encore au mot de passe seul : un
-- agent réactivé demain, un opérateur ajouté pour un deuxième hôtel. Avec lui,
-- tout compte doit d'abord activer son code avant de voir une seule course.
--
-- IL NE PEUT ENFERMER PERSONNE DEHORS : il refuse de se lever tant qu'un
-- opérateur ACTIF n'a pas de code vérifié, et il le dit (un compte, jamais
-- une adresse e-mail : le journal du workflow est public).
-- RETOUR ARRIÈRE, dans l'éditeur SQL de Supabase :
--   update public.securite_admin set double_verification_exigee = false, modifie_le = now();
-- ============================================================================
do $$
declare
  sans_code integer;
begin
  if to_regclass('public.securite_admin') is null then
    raise exception 'appliquer d''abord 20261024000000_double_verification_admin.sql';
  end if;
  select count(*) into sans_code
  from public.operateurs o
  where o.actif
    and not exists (select 1 from auth.mfa_factors f
                    where f.user_id = o.user_id and f.status = 'verified');
  if sans_code > 0 then
    raise exception '% opérateur(s) actif(s) sans code vérifié : rien n''a été changé. Activer le code depuis l''admin (Réglages → Double vérification), puis relancer.', sans_code;
  end if;
  update public.securite_admin set double_verification_exigee = true, modifie_le = now() where id;
end $$;

select 'double vérification obligatoire' as etat,
       (select double_verification_exigee from public.securite_admin where id) as exigee_pour_tous;
