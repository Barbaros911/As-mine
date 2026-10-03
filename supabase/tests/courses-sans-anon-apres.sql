-- Après les deux migrations : anon ne doit plus pouvoir écrire, la policy
-- « depot client » ne doit plus exister, et rien n'est perdu.
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
  -- C'est CE contrôle qui distingue la migration du 28/09 (drop sur un nom
  -- qui n'existait pas en production) de celle du 03/10 (drop sur le vrai
  -- nom). Le revoke seul rend déjà la policy inerte : le refus d'écriture
  -- ci-dessus passerait au vert avec la policy encore affichée.
  if exists (select 1 from pg_policies where tablename='courses' and 'anon' = any(roles)) then
    raise exception 'une policy pour anon subsiste sur courses : %',
      (select string_agg(policyname, ', ') from pg_policies
        where tablename='courses' and 'anon' = any(roles));
  end if;
  -- Le droit sur la table, séparément : une policy absente ne protège rien
  -- si quelqu'un refait « grant insert … to anon », et inversement.
  if exists (select 1 from information_schema.role_table_grants
              where table_schema='public' and table_name='courses'
                and grantee='anon' and privilege_type in ('INSERT','UPDATE','DELETE')) then
    raise exception 'anon garde un droit d''ecriture sur courses';
  end if;
end $$;
select 'courses-sans-anon : OK';
