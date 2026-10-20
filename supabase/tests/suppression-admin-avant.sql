-- ============================================================================
-- SEUL L'ADMIN SUPPRIME — l'état d'AVANT la migration, posé et éprouvé.
-- Après socle.sql, role-agent-avant.sql et 20260929030000 (est_admin).
-- On repose l'état de production : la policy du 15/09 (« suppression
-- exploitant », ouverte à tout exploitant) PLUS une seconde sous un autre nom,
-- pour prouver que la migration les lit toutes dans pg_policies. Puis on
-- EXIGE que cet état laisse l'agent supprimer et qu'une attribution bloque :
-- une épreuve dont l'état d'avant passe déjà ne prouverait rien.
-- ============================================================================
\i supabase/migrations/20260915_supprimer_course.sql
alter table public.courses enable row level security;
drop policy if exists "lecture exploitant" on public.courses;
create policy "lecture exploitant" on public.courses for select to authenticated using ((select public.est_exploitant()));
create policy "un nom lu nulle part" on public.courses for delete to authenticated using ((select public.est_exploitant()));

insert into public.courses(ref, statut, bon) values
  ('ELA-26-10-AGENT', 'attente',  '{}'),
  ('ELA-26-10-FAITE', 'realisee', '{}'),
  ('ELA-26-10-ATTRI', 'realisee', '{}'),
  ('ELA-26-10-RESTE', 'confirmee','{}');
insert into public.chauffeurs(id, nom_affiche, telephone_whatsapp)
  values ('22222222-2222-2222-2222-222222222222', 'Ali', '0611223344') on conflict do nothing;
insert into public.attributions_chauffeur(course_ref, chauffeur_id)
  values ('ELA-26-10-ATTRI', '22222222-2222-2222-2222-222222222222');

-- Avant : l'agent supprime (c'est le défaut que la migration ferme).
select set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000002', false);
set role authenticated;
do $$
declare n int;
begin
  delete from public.courses where ref = 'ELA-26-10-AGENT';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'AVANT : l''agent devrait encore pouvoir supprimer (% ligne)', n; end if;
end $$;
reset role;
insert into public.courses(ref, statut, bon) values ('ELA-26-10-AGENT', 'attente', '{}');

-- Avant : une attribution héritée bloque la suppression, même pour l'admin.
select set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000001', false);
set role authenticated;
do $$
begin
  begin
    delete from public.courses where ref = 'ELA-26-10-ATTRI';
    raise exception 'AVANT : la contrainte « restrict » devrait bloquer';
  exception when foreign_key_violation then null; end;
end $$;
reset role;

select 'SUPPRESSION AVANT : l''agent supprime, l''attribution bloque — état reproduit' as resultat;
