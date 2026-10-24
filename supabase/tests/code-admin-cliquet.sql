-- LE CLIQUET a été refusé juste avant (deux admins actifs sans code) : il
-- ne doit RIEN avoir changé. Puis chacun choisit son code, pour que le
-- prochain essai passe (la session « aal2 » de 3 l'a tapé juste).
do $$ begin
  if (select double_verification_exigee from public.securite_admin) then
    raise exception 'le cliquet s''est levé alors que des opérateurs actifs n''avaient pas de code';
  end if;
end $$;
insert into public.codes_admin(user_id, empreinte)
select u::uuid, extensions.crypt('654321', extensions.gen_salt('bf', 4))
from unnest(array['aaaaaaaa-0000-0000-0000-000000000003',
                  'aaaaaaaa-0000-0000-0000-000000000006']) u;
insert into public.sessions_admin(session_id, user_id)
  values ('aal2', 'aaaaaaaa-0000-0000-0000-000000000003');
select 'cliquet refusé sans rien changer ; codes choisis' as etat;
