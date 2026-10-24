-- ============================================================================
-- RETOUR ARRIÈRE de 20261024020000_code_admin.sql
-- À NE LANCER QUE SI LE CODE ADMIN DOIT ÊTRE RETIRÉ (jamais pour « débloquer »
-- un code oublié : pour ça, voir SECURITE-ADMIN-CODE.md).
-- Repose est_exploitant() et est_admin() exactement comme avant, sans le
-- juge de session. Les tables et les fonctions du code restent, inertes.
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

select 'code admin retiré' as etat;
