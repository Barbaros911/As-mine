-- ============================================================================
-- LES PROSPECTS (bloc 2) — LA SONDE DE LA VUE. Lancée APRÈS prospects-apres.sql,
-- et suivie de la migration rejouée : elle DOIT s'arrêter. Une vue créée un
-- jour dans le tableau de bord sur les prospects reçoit SELECT pour anon par
-- les privilèges par défaut de Supabase (20261005000000_vues_lecture_seule.sql)
-- et rendrait noms et téléphones à quiconque a la clé publique du site.
-- Le workflow exige l'ÉCHEC de la migration qui suit ce fichier.
-- ============================================================================
create view public.prospects_publics as select etablissement, telephone from public.prospects;
do $$ begin
  if not has_table_privilege('anon', 'public.prospects_publics', 'SELECT') then
    raise exception 'DÉCOR FAUX : la vue sonde n''est pas lisible par anon';
  end if;
end $$;
