-- LE CLIQUET a été refusé juste avant (deux admins actifs sans code) : il
-- ne doit RIEN avoir changé. Puis chacun active son code, pour que le
-- prochain essai passe.
do $$ begin
  if (select double_verification_exigee from public.securite_admin) then
    raise exception 'le cliquet s''est levé alors que des opérateurs actifs n''avaient pas de code';
  end if;
end $$;
insert into auth.mfa_factors(user_id, status) values
  ('aaaaaaaa-0000-0000-0000-000000000003', 'verified');
update auth.mfa_factors set status = 'verified'
 where user_id = 'aaaaaaaa-0000-0000-0000-000000000006';
select 'cliquet refusé sans rien changer ; codes activés' as etat;
