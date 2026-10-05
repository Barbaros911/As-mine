-- ============================================================================
-- LE NUMERO COURT -- epreuve sur un vrai PostgreSQL, AVANT la migration.
--
-- On pose ce que la production porte (inventaire du 2 octobre 2026) : la
-- colonne de creation, la version (vraie migration, appliquee dans le
-- workflow avant ce fichier), et deux declencheurs dont le code n'est PAS
-- dans le depot. On les remplace par deux sentinelles :
--   * l'une journalise tout ce qui la traverse ;
--   * l'autre fait ECHOUER toute modification tant que « ela.interdit »
--     vaut « oui ».
-- Si la numerotation des courses existantes passait par eux, la migration
-- tomberait ici. Les epreuves sont dans numero-court-apres.sql.
-- ============================================================================
alter table public.courses add column if not exists cree_le timestamptz not null default now();

create table if not exists public.sentinelle_journal(
  id bigint generated always as identity primary key, op text, ref text);

create or replace function public.sentinelle_journal_f() returns trigger
language plpgsql as $$
begin
  insert into public.sentinelle_journal(op, ref) values (tg_op, coalesce(new.ref, old.ref));
  return coalesce(new, old);
end $$;
create or replace function public.sentinelle_refus_f() returns trigger
language plpgsql as $$
begin
  if current_setting('ela.interdit', true) = 'oui' then
    raise exception 'un declencheur de la table a tourne pendant la numerotation';
  end if;
  return new;
end $$;
create trigger journal_courses_operateurs after insert or update on public.courses
  for each row execute function public.sentinelle_journal_f();
create trigger proteger_courses_agent before update on public.courses
  for each row execute function public.sentinelle_refus_f();

-- Trois courses existantes, inserees dans le desordre de leur creation : le
-- numero doit suivre la date de creation, pas l'ordre d'ecriture ni la ref.
insert into public.courses(ref, statut, bon, cree_le) values
  ('ELA-26-10-CCCCC', 'attente',   '{"ref":"ELA-26-10-CCCCC"}', '2026-10-03 09:00+02'),
  ('ELA-26-09-AAAAA', 'realisee',  '{"ref":"ELA-26-09-AAAAA"}', '2026-09-20 08:00+02'),
  ('ELA-26-10-BBBBB', 'confirmee', '{"ref":"ELA-26-10-BBBBB"}', '2026-10-01 22:00+02');

truncate public.sentinelle_journal;
select set_config('ela.interdit', 'oui', false);
