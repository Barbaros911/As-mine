-- Épreuve de 20260928120000_courses_sans_depot_anonyme.sql PUIS de
-- 20261003000000_courses_policy_depot_client.sql (Issue #190).
-- On REPOSE d'abord l'état d'origine (policy anon + droit INSERT), on
-- vérifie qu'il laisse bien passer — sinon le refus final ne prouverait
-- rien —, puis les deux migrations sont appliquées par le workflow après
-- ce fichier, dans l'ordre où la production les a reçues.
--
-- LA POLICY EST REPOSÉE SOUS SON VRAI NOM DE PRODUCTION, « depot client »
-- (audit du 2 octobre 2026). Le premier jet de cette épreuve la reposait
-- sous « un client peut deposer sa demande », le nom écrit dans
-- SUPABASE.md — et c'est exactement le nom que la migration du 28/09
-- droppait : l'épreuve passait au vert sur une migration dont le drop,
-- en production, visait le vide. Une épreuve qui repose l'état qu'on
-- imagine, et non l'état relevé dans pg_policies, éprouve la doc, pas la
-- base. Le nom vient du relevé du 15/09 (20260915_diagnostic_courses.sql).
alter table public.courses enable row level security;
grant insert on public.courses to anon;
drop policy if exists "depot client" on public.courses;
create policy "depot client" on public.courses
  for insert to anon with check (true);
set role anon;
insert into public.courses(ref,statut,bon) values ('ELA-26-09-9901','attente','{}');
reset role;
do $$ begin
  if not exists (select 1 from public.courses where ref='ELA-26-09-9901') then
    raise exception 'etat d''origine mal repose : anon n''a pas pu ecrire';
  end if;
  if not exists (select 1 from pg_policies where tablename='courses'
                   and policyname='depot client' and 'anon' = any(roles)) then
    raise exception 'etat d''origine mal repose : la policy « depot client » manque';
  end if;
end $$;
