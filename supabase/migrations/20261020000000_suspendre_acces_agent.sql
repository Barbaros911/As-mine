-- =====================================================================
-- L'ACCÈS AGENT EST SUSPENDU — 20 octobre 2026, décision de Barbaros
-- ---------------------------------------------------------------------
-- Le compte « agent_reservation » a été créé pour un ami. L'activité ne
-- justifie pas un second accès, et surtout un compte agent lit encore
-- TOUTES les courses avec leurs prix (CLAUDE.md, « la limite, dite
-- franchement ») : le cloisonnement côté serveur n'est pas terminé.
--
-- LE VERROU EST ICI, PAS DANS LA PAGE. est_exploitant() exige « actif » :
-- une ligne inactive est refusée par TOUTES les règles (lecture des
-- courses, fonctions, écrans). La page ne fait qu'afficher la raison.
--
-- CE QUE LA MIGRATION FAIT :
--   1. passe à « actif = false » les comptes dont le rôle est
--      agent_reservation — jamais un admin, jamais un exploitant ;
--   2. s'arrête si elle ne trouve AUCUN compte agent (on saurait alors
--      que le rôle n'est pas celui qu'on croit, au lieu de croire la
--      suspension faite) ;
--   3. (re)pose le droit « lire son propre droit » sur operateurs, pour que
--      la page puisse lire « actif = false » et afficher le bon message au
--      lieu de « vérifiez vos identifiants ». Même texte que
--      20260915_operator_auth_server.sql : rejouer ne change rien.
-- Rejouée : constate, ne fait rien de plus. Pour rouvrir l'accès :
-- 20261020000001_rouvrir_acces_agent.sql.
-- Le journal GitHub est public : on ne sort qu'un compte, jamais un
-- identifiant ni une adresse.
-- =====================================================================

grant select on table public.operateurs to authenticated;
drop policy if exists "lire son propre droit" on public.operateurs;
create policy "lire son propre droit" on public.operateurs
for select to authenticated
using (user_id = (select auth.uid()));

do $$
declare n_agents integer; n_suspendus integer;
begin
  select count(*) into n_agents from public.operateurs where role = 'agent_reservation';
  if n_agents = 0 then
    raise exception 'aucun compte « agent_reservation » dans operateurs : rien n''a été suspendu. Lancer 20260929020000_diagnostic_role_agent.sql pour lire les rôles réels.';
  end if;
  update public.operateurs set actif = false
   where role = 'agent_reservation' and actif;
  get diagnostics n_suspendus = row_count;
  raise notice 'comptes agent : %, suspendus par cette exécution : %', n_agents, n_suspendus;
end $$;

select
  count(*) filter (where role = 'agent_reservation' and not actif) as agents_suspendus,
  count(*) filter (where role = 'agent_reservation' and actif) as agents_actifs,
  count(*) filter (where role = 'admin' and actif) as admins_actifs
from public.operateurs;
