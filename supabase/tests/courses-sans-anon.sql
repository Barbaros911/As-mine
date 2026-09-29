-- Épreuve de 20260928120000_courses_sans_depot_anonyme.sql.
-- On REPOSE d'abord l'état d'origine (policy anon + droit INSERT), on
-- vérifie qu'il laisse bien passer — sinon le refus final ne prouverait
-- rien —, puis la migration est appliquée par le workflow après ce fichier.
alter table public.courses enable row level security;
grant insert on public.courses to anon;
drop policy if exists "un client peut deposer sa demande" on public.courses;
create policy "un client peut deposer sa demande" on public.courses
  for insert to anon with check (true);
set role anon;
insert into public.courses(ref,statut,bon) values ('ELA-26-09-9901','attente','{}');
reset role;
do $$ begin
  if not exists (select 1 from public.courses where ref='ELA-26-09-9901') then
    raise exception 'etat d''origine mal repose : anon n''a pas pu ecrire';
  end if;
end $$;
