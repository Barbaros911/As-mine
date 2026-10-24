do $$ begin
  if position('ela_session_suffisante' in pg_get_functiondef('public.est_exploitant()'::regprocedure)) > 0 then
    raise exception 'la garde a laissé écraser une est_exploitant() inconnue'; end if;
  if to_regclass('public.securite_admin') is not null then
    raise exception 'la migration refusée a quand même créé securite_admin'; end if;
end $$;
select 'garde : une porte inconnue n''est pas écrasée' as etat;
