-- ============================================================================
-- Épreuve de 20261028000900_durcissement_fonctions_retour.sql : le retour
-- arrière repose EXACTEMENT l'état d'avant (déclencheurs sans réglage, anon
-- exécute « suivi »), sans toucher ni aux corps ni aux données.
-- ============================================================================
do $$ begin
  if exists (select 1 from pg_proc p
              where p.oid in (to_regprocedure('public.ela_courses_numero()'),
                              to_regprocedure('public.ela_courses_version()'))
                and p.proconfig is not null) then
    raise exception 'le retour arriere a laisse un reglage sur un declencheur';
  end if;
  if exists (select 1 from public.epreuve_corps e
               join pg_proc p on p.proname = e.proname and p.pronamespace = 'public'::regnamespace
              where md5(p.prosrc) <> e.empreinte) then
    raise exception 'le retour arriere a reecrit le corps d''un declencheur';
  end if;
  if not has_function_privilege('anon', 'public.suivi(text, text)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.suivi(text, text)', 'EXECUTE') then
    raise exception 'le retour arriere ne repose pas les droits de suivi relevés le 24/10';
  end if;
end $$;

-- La numérotation marche toujours après le retour arrière.
insert into public.courses(ref, statut, bon) values ('ELA-26-10-RETOUR', 'attente', '{}');
do $$ begin
  if (select numero from public.courses where ref = 'ELA-26-10-RETOUR') is null then
    raise exception 'plus de N° court apres le retour arriere';
  end if;
end $$;

select 'retour : etat du 24/10 repose' as etat;
