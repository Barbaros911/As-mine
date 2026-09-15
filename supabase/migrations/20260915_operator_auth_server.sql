-- ELA Transfer : l'authentification ne suffit pas à donner les droits exploitant.
-- Le JWT doit appartenir au compte exploitant explicitement autorisé.

create or replace function public.est_exploitant()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select (select auth.uid()) = '7c8e0ba9-384d-4140-ac2e-ebf4e5e574ee'::uuid;
$$;

revoke all on function public.est_exploitant() from public;
revoke all on function public.est_exploitant() from anon;
grant execute on function public.est_exploitant() to authenticated;
grant execute on function public.est_exploitant() to service_role;

alter policy "lecture exploitant" on public.courses
  using ((select auth.uid()) = '7c8e0ba9-384d-4140-ac2e-ebf4e5e574ee'::uuid);

alter policy "maj exploitant" on public.courses
  using ((select auth.uid()) = '7c8e0ba9-384d-4140-ac2e-ebf4e5e574ee'::uuid)
  with check ((select auth.uid()) = '7c8e0ba9-384d-4140-ac2e-ebf4e5e574ee'::uuid);

alter policy "l exploitant depose aussi" on public.courses
  with check ((select auth.uid()) = '7c8e0ba9-384d-4140-ac2e-ebf4e5e574ee'::uuid);
