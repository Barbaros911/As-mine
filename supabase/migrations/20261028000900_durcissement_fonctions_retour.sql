-- ============================================================================
-- RETOUR ARRIÈRE de 20261028000000_durcissement_fonctions.sql
-- À NE LANCER QUE SI LE DURCISSEMENT DOIT ÊTRE RETIRÉ (par exemple si un
-- dépôt ou un geste de l'admin tombait sur un déclencheur de « courses »).
-- Repose l'état relevé en production le 24/10 : les deux déclencheurs sans
-- réglage, « suivi » de nouveau exécutable par anon. Aucune donnée n'est lue
-- ni écrite ; le corps des fonctions n'est pas touché. Rejouable.
-- ============================================================================
do $$
begin
  if to_regprocedure('public.ela_courses_numero()') is not null then
    alter function public.ela_courses_numero() reset search_path;
  end if;
  if to_regprocedure('public.ela_courses_version()') is not null then
    alter function public.ela_courses_version() reset search_path;
  end if;
  if to_regprocedure('public.suivi(text, text)') is not null then
    grant execute on function public.suivi(text, text) to anon;
  end if;
end $$;

select 'durcissement retiré' as etat;
