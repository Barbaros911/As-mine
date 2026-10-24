-- LE CLIQUET LEVÉ : un compte SANS code n'entre plus au mot de passe seul.
-- L'opérateur 7 arrive après (un deuxième hôtel, un agent) sans code.
do $$ begin
  if not (select double_verification_exigee from public.securite_admin) then
    raise exception 'le cliquet ne s''est pas levé'; end if;
end $$;
insert into public.operateurs(user_id, role, actif)
  values ('aaaaaaaa-0000-0000-0000-000000000007', 'agent_reservation', true);
begin;
select public.essai_attendre('aaaaaaaa-0000-0000-0000-000000000007', 'aal1', false, false,
  'cliquet levé : un nouvel opérateur sans code est refusé');
rollback;
begin;
select public.essai_attendre('aaaaaaaa-0000-0000-0000-000000000003', 'aal1', false, false,
  'cliquet levé : mot de passe seul refusé');
rollback;
begin;
select public.essai_attendre('aaaaaaaa-0000-0000-0000-000000000003', 'aal2', true, true,
  'cliquet levé : mot de passe + code accepté');
rollback;
select 'cliquet : tient' as etat;
