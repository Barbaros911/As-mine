-- =====================================================================
-- SEUL BARBAROS SUPPRIME UNE COURSE
-- ---------------------------------------------------------------------
-- 20/10/2026, Barbaros : « il faut que je puisse supprimer les courses,
-- effectuées ou non, sur admin », puis « c'est seulement moi qui peut
-- supprimer ».
--
-- CE QUE ÇA CHANGE :
--   1. La suppression d'une ligne de « courses » est réservée à l'ADMIN
--      (est_admin()), plus à tout exploitant. L'agent de réservation —
--      suspendu depuis 20261020000000 — ne supprimera pas non plus le jour
--      où son accès sera rouvert. La réception n'a jamais pu : elle passe
--      par « courses-hotel », qui ne fait que lire.
--   2. Une course qui porte une ATTRIBUTION héritée d'Admin v2
--      (« attributions_chauffeur », retiré de la publication le 3/10) ne
--      bloque plus la suppression. La contrainte était « on delete
--      restrict » : effacer une telle course rendait une erreur, et l'admin
--      affichait « Le serveur a refusé » sans dire pourquoi. Elle passe en
--      « on delete cascade » : l'attribution d'une course effacée n'a plus
--      d'objet. Aucune autre table ne référence « courses ».
--
-- ON NE DROPPE PAS UN NOM LU DANS UNE DOC (leçon du 2/10/2026) : la policy
-- de suppression a pu être posée sous un autre nom que celui du dépôt. On
-- les lit TOUTES dans pg_policies, et on n'en garde qu'une.
--
-- REJOUABLE : rejouée, elle repose la même policy et la même contrainte.
-- Elle REFUSE (exception) si est_admin() n'existe pas : sans elle, la
-- policy refuserait tout le monde, Barbaros compris, sans un mot.
-- =====================================================================

do $$
begin
  if to_regprocedure('public.est_admin()') is null then
    raise exception 'est_admin() absente : appliquer 20260929030000_role_agent_serveur.sql d''abord';
  end if;
end $$;

-- 1. Toutes les policies de suppression sur « courses », quel que soit leur nom.
do $$
declare p record;
begin
  for p in select policyname from pg_policies
           where schemaname = 'public' and tablename = 'courses' and cmd = 'DELETE' loop
    execute format('drop policy %I on public.courses', p.policyname);
  end loop;
end $$;

grant delete on table public.courses to authenticated;
revoke delete on table public.courses from anon;
create policy "suppression admin" on public.courses
  for delete to authenticated
  using ((select public.est_admin()));

-- 2. L'attribution héritée suit sa course.
do $$
declare c record;
begin
  if to_regclass('public.attributions_chauffeur') is null then return; end if;
  for c in select conname from pg_constraint
           where conrelid = 'public.attributions_chauffeur'::regclass
             and contype = 'f' and confrelid = 'public.courses'::regclass loop
    execute format('alter table public.attributions_chauffeur drop constraint %I', c.conname);
  end loop;
  alter table public.attributions_chauffeur
    add constraint attributions_chauffeur_course_ref_fkey
    foreign key (course_ref) references public.courses(ref) on delete cascade;
end $$;

-- 3. Ce qui doit être vrai en sortie, vérifié par la base elle-même.
do $$
declare n int; q text;
begin
  select count(*), max(qual) into n, q from pg_policies
   where schemaname = 'public' and tablename = 'courses' and cmd = 'DELETE';
  if n <> 1 or position('est_admin' in coalesce(q, '')) = 0 then
    raise exception 'suppression : % policy(s), condition « % »', n, q;
  end if;
  if to_regclass('public.attributions_chauffeur') is not null and exists (
       select 1 from pg_constraint
        where conrelid = 'public.attributions_chauffeur'::regclass
          and confrelid = 'public.courses'::regclass and contype = 'f' and confdeltype <> 'c') then
    raise exception 'attributions_chauffeur bloque encore la suppression d''une course';
  end if;
end $$;

-- 4. LE VERDICT, LISIBLE DANS LE JOURNAL DU WORKFLOW. Des tables ont été
--    créées en production hors migration (audit du 2/10) : si l'une d'elles
--    pointe vers « courses » sans cascade, elle bloquerait encore une
--    suppression. On ne la change pas à l'aveugle : on la NOMME (table et
--    contrainte, aucune donnée), et elle se traite à part.
select 'suppression des courses : réservée à l''admin ; contraintes qui bloqueraient encore : '
       || coalesce((select string_agg(conrelid::regclass::text || '.' || conname, ', ' order by conname)
                      from pg_constraint
                     where confrelid = 'public.courses'::regclass and contype = 'f'
                       and confdeltype in ('r', 'a')), 'aucune') as resultat;
