-- ============================================================================
-- LA MESURE D'AUDIENCE (14 octobre 2026) — LE DÉCOR, posé AVANT la migration.
--
-- Ordre dans le workflow : socle.sql, role-agent-avant.sql (les opérateurs et
-- auth.uid() réglable), 20260929030000_role_agent_serveur.sql (la VRAIE
-- est_admin()), CE fichier, la migration DEUX fois (elle doit se rejouer),
-- mesure-apres.sql.
--
-- ON REPOSE L'ÉTAT DE PRODUCTION, PAS CELUI QU'ON IMAGINE : les privilèges
-- par défaut de Supabase donnent TOUT à anon et à authenticated sur ce qu'on
-- crée ensuite — y compris l'exécution des fonctions. Sans ce décor, une
-- migration qui oublierait de retirer ces droits passerait l'épreuve, et un
-- anonyme lirait les totaux en production.
-- ============================================================================
grant usage on schema public, auth to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant execute on functions to anon, authenticated;

create table public.sonde_defauts_mesure(x int);
create function public.sonde_defauts_mesure_f() returns int language sql as $$ select 1 $$;
do $$ begin
  if not has_table_privilege('anon', 'public.sonde_defauts_mesure', 'SELECT')
     or not has_function_privilege('anon', 'public.sonde_defauts_mesure_f()', 'EXECUTE') then
    raise exception 'DÉCOR FAUX : les privilèges par défaut de Supabase ne sont pas reproduits';
  end if;
end $$;
drop table public.sonde_defauts_mesure;
drop function public.sonde_defauts_mesure_f();

-- L'outil d'épreuve : un refus n'est accepté que POUR SA RAISON.
create schema if not exists epreuve;
grant usage on schema epreuve to anon, authenticated;
create or replace function epreuve.refus(p_libelle text, p_sql text, p_attendu text)
returns void language plpgsql as $$
declare v_etat text; v_msg text;
begin
  begin
    execute p_sql;
  exception when others then
    get stacked diagnostics v_etat = returned_sqlstate, v_msg = message_text;
    if v_etat = p_attendu or position(p_attendu in v_msg) > 0 then return; end if;
    raise exception 'ECHEC % : refusé, mais pour une autre raison (% / %)', p_libelle, v_etat, v_msg;
  end;
  raise exception 'ECHEC % : accepté alors qu''il devait être refusé', p_libelle;
end $$;
grant execute on all functions in schema epreuve to anon, authenticated;
