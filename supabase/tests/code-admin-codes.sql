-- ============================================================================
-- LE CODE ADMIN — les codes du décor, posés APRÈS la migration (elle crée
-- les tables). Les comptes 1 (admin), 2 (agent) et 5 (suspendu) ont choisi
-- 123456 ; la session « aal2 » de 1 et de 2 a tapé le code juste (le nom
-- vient de l'ancienne épreuve et sert aussi aux données métier).
-- ============================================================================
insert into public.codes_admin(user_id, empreinte)
select u::uuid, extensions.crypt('123456', extensions.gen_salt('bf', 4))
from unnest(array['aaaaaaaa-0000-0000-0000-000000000001',
                  'aaaaaaaa-0000-0000-0000-000000000002',
                  'aaaaaaaa-0000-0000-0000-000000000005']) u
on conflict (user_id) do nothing;
insert into public.sessions_admin(session_id, user_id) values
  ('aal2', 'aaaaaaaa-0000-0000-0000-000000000001'),
  ('aal2', 'aaaaaaaa-0000-0000-0000-000000000002'),
  ('aal2', 'aaaaaaaa-0000-0000-0000-000000000005')
on conflict do nothing;
select 'codes du décor posés' as etat;
