-- =====================================================================
-- DIAGNOSTIC — CE QUI EXISTE VRAIMENT POUR LE RÔLE « AGENT DE RÉSERVATION »
-- ---------------------------------------------------------------------
-- 29/09/2026, Barbaros : « valide le rôle agent ». Aujourd'hui l'agent n'est
-- limité QUE par l'affichage (agent-role-ui.mjs) : côté serveur,
-- est_exploitant() lui donne tout. Ses fonctions serveur (role_operateur,
-- signaler_presence, presences_operateurs) ont été créées directement dans
-- Supabase et ne sont dans AUCUNE migration du dépôt. On LIT avant d'écrire
-- une règle : sinon on écrirait sur un schéma supposé.
--
-- LECTURE SEULE : rien n'est modifié. Le journal GitHub est PUBLIC : on ne
-- sort ni adresse e-mail, ni identifiant de compte — seulement des noms de
-- rôle, des comptes, des noms de colonnes et le code des fonctions.
-- =====================================================================
select jsonb_pretty(jsonb_build_object(
  'colonnes_operateurs', (
    select jsonb_agg(column_name || ' ' || data_type order by ordinal_position)
    from information_schema.columns
    where table_schema = 'public' and table_name = 'operateurs'),
  'contraintes_operateurs', (
    select jsonb_agg(pg_get_constraintdef(c.oid))
    from pg_constraint c
    where c.conrelid = 'public.operateurs'::regclass and c.contype = 'c'),
  'comptes_par_role', (
    select jsonb_object_agg(coalesce(role, '(vide)') || case when actif then '' else ' (inactif)' end, n)
    from (select role, actif, count(*) n from public.operateurs group by role, actif) x),
  'fonctions', (
    select jsonb_object_agg(p.proname,
      jsonb_build_object('securite', case when p.prosecdef then 'definer' else 'invoker' end,
                         'code', p.prosrc))
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('role_operateur', 'signaler_presence', 'presences_operateurs', 'est_exploitant'))
)) as diagnostic;
