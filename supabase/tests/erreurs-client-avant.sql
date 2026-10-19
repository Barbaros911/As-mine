-- ============================================================================
-- LE JOURNAL DES ERREURS DU SITE — DÉCOR, AVANT la migration.
--
-- La migration accorde l'écriture à « service_role », le rôle de la clé de
-- service chez Supabase. Il n'existe pas sur le PostgreSQL nu de la CI : on
-- le pose ici, EXACTEMENT comme les décors des prospects et du trafic —
-- avec « bypassrls », puisque c'est ainsi qu'il est chez Supabase.
--
-- POURQUOI LA FORME COMPTE : un rôle appartient au CLUSTER, pas à la base.
-- Le premier décor qui le crée fixe ses attributs pour toutes les épreuves
-- qui suivent, chacune dans sa propre base. Une première version de la
-- migration le créait sans « bypassrls » ; l'épreuve des prospects, jouée
-- après, faisait un UPDATE sous ce rôle que la RLS laissait passer… sur
-- zéro ligne, et son quota par e-mail tombait. Aucune base n'avait tort :
-- c'était l'ordre des blocs. Ne jamais créer un rôle dans une migration.
-- ============================================================================
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'service_role')
  then create role service_role bypassrls; end if;
end $$;
