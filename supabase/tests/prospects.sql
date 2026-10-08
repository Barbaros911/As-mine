-- ============================================================================
-- LES PROSPECTS DE LA DÉMO (bloc 2) — LE DÉCOR, posé AVANT la migration.
--
-- Ordre dans le workflow : socle.sql, role-agent-avant.sql (les opérateurs et
-- auth.uid() réglable), 20260929030000_role_agent_serveur.sql (la VRAIE
-- est_admin()), CE fichier, la migration DEUX fois (elle doit se rejouer),
-- prospects-apres.sql.
--
-- ON REPOSE L'ÉTAT DE PRODUCTION, PAS CELUI QU'ON IMAGINE (leçon de
-- courses-sans-anon.sql, Issue #190) :
--   · les opérateurs sous leur vraie RLS ;
--   · LES PRIVILÈGES PAR DÉFAUT DE SUPABASE : tout, à anon et à
--     authenticated, sur ce qu'on crée ensuite dans « public » — et on EXIGE
--     que le trou se reproduise sur une table sonde ;
--   · le rôle service_role de Supabase, qui contourne la RLS : c'est avec lui
--     que la fonction « demande-demo » appelle les trois portes.
-- ============================================================================

alter table public.operateurs enable row level security;
revoke all on table public.operateurs from anon, authenticated;
grant select on table public.operateurs to authenticated;
drop policy if exists "lire son propre droit" on public.operateurs;
create policy "lire son propre droit" on public.operateurs
  for select to authenticated using (user_id = (select auth.uid()));

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'service_role')
  then create role service_role bypassrls; end if;
end $$;
grant usage on schema public, auth to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;

create table public.sonde_defauts(x int);
do $$ begin
  if not has_table_privilege('anon', 'public.sonde_defauts', 'SELECT')
     or not has_table_privilege('authenticated', 'public.sonde_defauts', 'DELETE') then
    raise exception 'DÉCOR FAUX : les privilèges par défaut de Supabase ne sont pas reproduits';
  end if;
end $$;
drop table public.sonde_defauts;

-- ── L'OUTIL D'ÉPREUVE (le même que celui du Pilotage) ────────────────
create schema if not exists epreuve;
grant usage on schema epreuve to anon, authenticated, service_role;
create or replace function epreuve.refus(p_libelle text, p_sql text, p_attendu text)
returns void language plpgsql as $$
declare v_etat text; v_msg text; v_contrainte text;
begin
  begin
    execute p_sql;
  exception when others then
    get stacked diagnostics v_etat = returned_sqlstate, v_msg = message_text,
                            v_contrainte = constraint_name;
    if v_contrainte = p_attendu or v_etat = p_attendu or position(p_attendu in v_msg) > 0 then
      return;
    end if;
    raise exception 'ECHEC % : refusé, mais pour une autre raison (% / % / %)',
      p_libelle, v_etat, coalesce(nullif(v_contrainte, ''), '-'), v_msg;
  end;
  raise exception 'ECHEC % : accepté alors qu''il devait être refusé', p_libelle;
end $$;
create or replace function epreuve.lignes(p_sql text)
returns bigint language plpgsql as $$
declare n bigint;
begin
  execute p_sql;
  get diagnostics n = row_count;
  return n;
end $$;
grant execute on all functions in schema epreuve to anon, authenticated, service_role;
