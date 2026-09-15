-- Contrôles de sécurité à exécuter après migration.
-- Ils ne modifient aucune donnée.

-- 1. RLS doit rester activée sur les tables privées.
select tablename, rowsecurity
from pg_tables
where schemaname = 'public' and tablename in ('courses','abonnements');

-- 2. Le suivi public ne doit exposer que statut/chauffeur et rester borné à une référence+jeton.
select p.proname, p.prosecdef, p.proacl
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname='public' and p.proname='suivi';

-- 3. Vérifier les politiques avant toute mise en production.
select tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname='public'
order by tablename, policyname;
