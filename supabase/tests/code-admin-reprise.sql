-- REPOSÉE après le retour arrière : la règle revient entière.
begin;
select public.essai_attendre('aaaaaaaa-0000-0000-0000-000000000001', 'mdp', false, false,
  'reposée : mot de passe seul de nouveau refusé');
rollback;
begin;
select public.essai_attendre('aaaaaaaa-0000-0000-0000-000000000001', 'aal2', true, true,
  'reposée : mot de passe + code accepté');
rollback;
select 'reprise : tient' as etat;
