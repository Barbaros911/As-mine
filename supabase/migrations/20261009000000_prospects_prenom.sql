-- =====================================================================
-- LE PRÉNOM DES PROSPECTS, À PART DU NOM (démo professionnels)
-- ---------------------------------------------------------------------
-- 9 octobre 2026, à la demande de Barbaros : le formulaire de
-- /professionnels/ demande « Prénom » et « Nom » séparément, et la base les
-- garde séparément. « nom » porte désormais le NOM DE FAMILLE seul.
--
-- LES PROSPECTS DÉJÀ ENREGISTRÉS GARDENT prenom = NULL : leur « nom » est le
-- nom complet saisi d'un bloc. On ne le coupe pas en deux : « Jean-Marc de
-- la Tour » ne se découpe pas sans se tromper une fois sur deux.
--
-- L'ORDRE DE MISE EN LIGNE EST L'INVERSE DE CELUI QU'ON VOUDRAIT : la fusion
-- déploie « demande-demo » AVANT que ce fichier soit appliqué. La fonction
-- appelle donc ela_prospect_creer AVEC p_prenom, et si la base ne le connaît
-- pas encore, elle rappelle SANS (et range « Prénom Nom » dans « nom »).
-- L'écran Prospects de l'admin relit de même sans « prenom » si la colonne
-- manque. Aucun prospect n'est perdu pendant la transition.
--
-- REJOUABLE : colonne et contrainte posées seulement si absentes, fonction
-- reposée, droits retirés puis rendus. Aucune donnée créée ni modifiée.
-- À APPLIQUER EN PRODUCTION après la fusion (workflow « Appliquer une
-- migration Supabase », ce fichier), APRÈS 20261008000000_prospects.sql.
-- Épreuves : supabase/tests/prospects.sql puis prospects-apres.sql.
-- =====================================================================

do $$ begin
  if to_regclass('public.prospects') is null then
    raise exception 'prospects absente : appliquer 20261008000000_prospects.sql avant ce fichier';
  end if;
end $$;

alter table public.prospects add column if not exists prenom text;

do $$ begin
  if not exists (select 1 from pg_constraint
                  where conrelid = 'public.prospects'::regclass and conname = 'prospects_prenom') then
    alter table public.prospects add constraint prospects_prenom check (prenom is null or (
      char_length(prenom) between 1 and 60 and prenom !~ '[[:cntrl:]<>]'));
  end if;
end $$;

-- ── CRÉER, AVEC LE PRÉNOM ─────────────────────────────────────────────
-- L'ANCIENNE SIGNATURE (9 paramètres) EST RETIRÉE, pas laissée à côté :
-- deux fonctions du même nom, et PostgREST refuse un appel qui pourrait
-- viser l'une ou l'autre. La nouvelle prend p_prenom EN DERNIER, avec un
-- défaut NULL : un appel ancien, sans p_prenom, trouve toujours sa fonction.
drop function if exists public.ela_prospect_creer(text,text,text,text,text,text,text,text,integer);

create or replace function public.ela_prospect_creer(
  p_type text, p_etablissement text, p_nom text, p_fonction text,
  p_email text, p_telephone text, p_langue text,
  p_jeton_empreinte text, p_par_jour integer default 3, p_prenom text default null)
returns table(id uuid, domaine_pro boolean)
language plpgsql security definer
set search_path = public, pg_temp as $$
declare v_email text := lower(btrim(p_email)); n integer;
begin
  perform pg_advisory_xact_lock(hashtextextended('prospect|' || coalesce(v_email, ''), 0));
  select count(*) into n from public.prospects p
   where p.email = v_email and p.cree_le > now() - interval '24 hours';
  if n >= greatest(p_par_jour, 1) then
    raise exception 'quota_email' using errcode = 'P0001';
  end if;
  return query
  insert into public.prospects as p (type, etablissement, prenom, nom, fonction, email, telephone, langue,
                                     jeton_empreinte, jeton_expire_le)
  values (p_type, btrim(p_etablissement), nullif(btrim(p_prenom), ''), btrim(p_nom),
          nullif(btrim(p_fonction), ''), v_email, p_telephone, coalesce(p_langue, 'fr'),
          p_jeton_empreinte, now() + interval '48 hours')
  returning p.id, p.domaine_pro;
end $$;

-- ── LES DROITS ───────────────────────────────────────────────────────
-- Une colonne neuve hérite des privilèges par défaut de Supabase sur la
-- table ? Non — mais une fonction neuve, si : on retire tout, on rend le
-- strict nécessaire.
revoke all on function public.ela_prospect_creer(text,text,text,text,text,text,text,text,integer,text)
  from public, anon, authenticated;
grant execute on function public.ela_prospect_creer(text,text,text,text,text,text,text,text,integer,text)
  to service_role;
revoke insert (prenom), update (prenom), references (prenom) on table public.prospects
  from public, anon, authenticated;
revoke select (prenom) on table public.prospects from public, anon;
grant select (prenom) on table public.prospects to authenticated;

-- ── LE CONTRÔLE QUI ARRÊTE LA MIGRATION ───────────────────────────────
do $$
declare p text;
begin
  foreach p in array array['SELECT','INSERT','UPDATE','REFERENCES'] loop
    if has_column_privilege('anon', 'public.prospects', 'prenom', p) then
      raise exception 'anon a % sur prospects.prenom', p; end if;
  end loop;
  if has_column_privilege('authenticated', 'public.prospects', 'prenom', 'UPDATE')
     or has_column_privilege('authenticated', 'public.prospects', 'prenom', 'INSERT') then
    raise exception 'le prénom d''un prospect est modifiable depuis le navigateur'; end if;
  if not has_column_privilege('authenticated', 'public.prospects', 'prenom', 'SELECT') then
    raise exception 'l''admin ne lit pas le prénom'; end if;
  if has_function_privilege('anon', 'public.ela_prospect_creer(text,text,text,text,text,text,text,text,integer,text)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.ela_prospect_creer(text,text,text,text,text,text,text,text,integer,text)', 'EXECUTE') then
    raise exception 'ela_prospect_creer est exécutable depuis le navigateur'; end if;
  if (select count(*) from pg_proc where proname = 'ela_prospect_creer'
        and pronamespace = 'public'::regnamespace) <> 1 then
    raise exception 'plusieurs ela_prospect_creer : PostgREST refuserait l''appel'; end if;
end $$;
