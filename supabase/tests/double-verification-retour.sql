-- LE RETOUR ARRIÈRE rend l'ancien comportement : le mot de passe seul suffit.
begin;
select public.essai_attendre('aaaaaaaa-0000-0000-0000-000000000001', 'aal1', true, true,
  'retour arrière : le mot de passe seul entre de nouveau');
rollback;
select 'retour arrière : tient' as etat;
