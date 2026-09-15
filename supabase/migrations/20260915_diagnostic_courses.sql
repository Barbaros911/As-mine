-- LECTURE SEULE : ne modifie rien. Sert à voir ce que la base a vraiment
-- accepté comme règles sur « courses », plutôt que de le supposer.
select 'policy | ' || policyname || ' | cmd=' || cmd
       || ' | roles=' || roles::text
       || ' | using=' || coalesce(qual::text, '-') as info
from pg_policies
where schemaname = 'public' and tablename = 'courses'
union all
select 'grant  | ' || grantee || ' | ' || privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'courses'
order by 1;
