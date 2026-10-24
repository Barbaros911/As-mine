-- ============================================================================
-- RETOUR ARRIÈRE de 20261024000000_double_verification_admin.sql
-- À NE LANCER QUE SI LA DOUBLE VÉRIFICATION DOIT ÊTRE RETIRÉE (jamais pour
-- « débloquer » un téléphone perdu : pour ça, voir SECURITE-ADMIN-MFA.md,
-- « J'ai perdu mon téléphone »).
-- Repose est_exploitant() et est_admin() exactement comme avant, sans le
-- niveau de session. Le réglage et le juge restent, inertes.
-- ============================================================================
create or replace function public.est_exploitant()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1 from public.operateurs o
    where o.user_id = (select auth.uid()) and o.actif
  );
$$;

create or replace function public.est_admin()
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1 from public.operateurs o
    where o.user_id = (select auth.uid()) and o.actif and o.role = 'admin'
  );
$$;

select 'double vérification retirée' as etat;
