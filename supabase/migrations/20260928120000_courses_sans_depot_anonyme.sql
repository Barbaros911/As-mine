-- =====================================================================
-- COURSES : PLUS AUCUNE ÉCRITURE DIRECTE PAR UN VISITEUR ANONYME
-- ---------------------------------------------------------------------
-- Audit de sécurité du 28/09/2026. Le script d'origine (SUPABASE.md)
-- posait « un client peut deposer sa demande » : INSERT pour anon, with
-- check (true). Depuis la passerelle « deposer-course », le site publié ne
-- s'en sert PLUS — il dépose par la fonction, qui recroise le prix avec la
-- grille serveur, plafonne à 12 dépôts par heure et par IP, et écrit avec
-- la clé de service. Laisser la porte directe ouverte, c'était laisser
-- n'importe qui écrire une course au prix de son choix, sans quota, en
-- contournant tous ces contrôles avec la clé publique de la page.
--
-- Idempotente : rejouée sur une base où la policy n'existe pas, elle ne
-- fait rien de plus. Aucune donnée n'est touchée.
-- Les exploitants connectés gardent leurs policies (est_exploitant()).
-- =====================================================================

drop policy if exists "un client peut deposer sa demande" on public.courses;
revoke insert, update, delete on table public.courses from anon;
