-- Après la migration : anon ne doit plus pouvoir écrire, et rien n'est perdu.
do $$ begin
  begin
    set local role anon;
    insert into public.courses(ref,statut,bon) values ('ELA-26-09-9902','attente','{}');
    raise exception 'ANON A ENCORE PU ECRIRE UNE COURSE';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
do $$ begin
  if not exists (select 1 from public.courses where ref='ELA-26-09-9901') then
    raise exception 'la migration a perdu une course existante';
  end if;
  if exists (select 1 from pg_policies where tablename='courses' and 'anon' = any(roles)) then
    raise exception 'une policy pour anon subsiste sur courses';
  end if;
end $$;
select 'courses-sans-anon : OK';
