-- ============================================================================
-- LE PILOTAGE (Issue #197, bloc 1) — LE DÉCOR, posé AVANT la migration.
--
-- Ordre dans le workflow : socle.sql, role-agent-avant.sql (les opérateurs et
-- auth.uid() réglable), 20260929030000_role_agent_serveur.sql (la VRAIE
-- est_admin()), CE fichier, la migration DEUX fois (elle doit se rejouer),
-- pilotage-apres.sql, puis pilotage-persistance.sql dans une AUTRE session.
--
-- ON REPOSE L'ÉTAT DE PRODUCTION, PAS CELUI QU'ON IMAGINE (leçon de
-- courses-sans-anon.sql, Issue #190) :
--   · les opérateurs sous leur vraie RLS (20260915_operator_auth_server.sql :
--     chacun ne lit que sa propre ligne) — est_admin() doit marcher ainsi ;
--   · LES PRIVILÈGES PAR DÉFAUT DE SUPABASE : tout, à anon et à
--     authenticated, sur ce qu'on crée ensuite dans « public ». Et on EXIGE
--     que le trou se reproduise sur une table sonde — sans cette preuve, un
--     refus éprouvé après la migration pourrait venir d'un décor mal posé.
-- ============================================================================

alter table public.operateurs enable row level security;
revoke all on table public.operateurs from anon, authenticated;
grant select on table public.operateurs to authenticated;
drop policy if exists "lire son propre droit" on public.operateurs;
create policy "lire son propre droit" on public.operateurs
  for select to authenticated using (user_id = (select auth.uid()));

grant usage on schema public, auth to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;
alter default privileges in schema public grant execute on functions to anon, authenticated;

-- La sonde : une table neuve, créée comme le sera celle du Pilotage. Anon
-- doit pouvoir la VIDER (TRUNCATE, que la RLS ne filtre pas) : c'est le trou
-- que la migration doit fermer.
create table public.sonde_defauts(x int);
do $$ begin
  if not has_table_privilege('anon', 'public.sonde_defauts', 'TRUNCATE')
     or not has_table_privilege('authenticated', 'public.sonde_defauts', 'DELETE') then
    raise exception 'DÉCOR FAUX : les privilèges par défaut de Supabase ne sont pas reproduits';
  end if;
end $$;
drop table public.sonde_defauts;

-- Les courses AVANT : la migration ne doit rien y changer. On en garde
-- l'empreinte (déclencheurs, policies, droits) pour la comparer après.
create table public.epreuve_courses_avant as
select (select count(*) from pg_trigger where tgrelid = 'public.courses'::regclass and not tgisinternal) as declencheurs,
       (select count(*) from pg_policies where schemaname = 'public' and tablename = 'courses') as policies,
       (select string_agg(grantee || ':' || privilege_type, ',' order by grantee, privilege_type)
          from information_schema.role_table_grants
         where table_schema = 'public' and table_name = 'courses') as droits,
       (select string_agg(column_name || ':' || data_type, ',' order by ordinal_position)
          from information_schema.columns
         where table_schema = 'public' and table_name = 'courses') as colonnes;
revoke all on public.epreuve_courses_avant from anon, authenticated;

-- ── L'OUTIL D'ÉPREUVE ─────────────────────────────────────────────────
-- « refus » exécute une instruction qui DOIT être refusée, et vérifie que
-- c'est pour LA BONNE RAISON (nom de contrainte, code ou morceau de
-- message). Un refus pour une autre raison est un échec : une table fermée
-- à tout le monde rendrait les mêmes refus, et l'épreuve serait verte sans
-- avoir rien prouvé.
-- « lignes » rend le nombre de lignes touchées.
-- Dans un schéma à part, accordé aux deux rôles qu'on joue.
create schema if not exists epreuve;
grant usage on schema epreuve to anon, authenticated;
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
grant execute on all functions in schema epreuve to anon, authenticated;
