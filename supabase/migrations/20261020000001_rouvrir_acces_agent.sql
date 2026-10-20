-- =====================================================================
-- ROUVRIR L'ACCÈS AGENT — l'inverse de 20261020000000_suspendre_acces_agent.sql
-- ---------------------------------------------------------------------
-- À lancer par le workflow « Appliquer une migration Supabase » le jour où
-- Barbaros décide de rouvrir l'accès. NE PAS la lancer par réflexe : tant
-- que le cloisonnement serveur n'est pas fait, un agent lit toutes les
-- courses et leurs prix. Rejouée : constate, ne fait rien de plus.
-- =====================================================================

update public.operateurs set actif = true
 where role = 'agent_reservation' and not actif;

select
  count(*) filter (where role = 'agent_reservation' and actif) as agents_actifs,
  count(*) filter (where role = 'agent_reservation' and not actif) as agents_suspendus
from public.operateurs;
