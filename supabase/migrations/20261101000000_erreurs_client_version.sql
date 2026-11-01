-- ============================================================================
-- LE JOURNAL DES ERREURS DU SITE PORTE LA VERSION DE LA PAGE
-- (1er novembre 2026, audit fiabilité et observabilité)
-- ----------------------------------------------------------------------------
-- Une erreur remontée par « erreur-client » ne disait pas d'où elle venait :
-- la page du jour, ou une copie gardée en cache depuis trois mises en ligne.
-- construire.sh pose désormais dans la page « commit court · cache du
-- service worker » ; la fonction l'envoie ; cette colonne la garde, et le
-- résumé de l'admin la montre à côté de chaque message.
--
-- CE QUE CETTE MIGRATION NE CHANGE PAS : les droits (anon rien, un compte
-- connecté lit, la clé de service écrit), les bornes, la purge à 30 jours.
-- Elle se rejoue sans dommage : colonne « if not exists », fonctions
-- remplacées à l'identique, garde finale identique à celle du 19/10.
-- ============================================================================

alter table public.journal_erreurs_client
  add column if not exists version text check (version is null or length(version) <= 40);

create or replace function public.ela_erreur_client_ecrire(p jsonb)
returns boolean language plpgsql security definer
set search_path = public, pg_temp as $$
begin
  if p is null or jsonb_typeof(p) <> 'object' then
    raise exception 'erreur_invalide' using errcode = '22023';
  end if;
  if coalesce(length(p->>'message'), 0) = 0 or length(p->>'message') > 200
     or coalesce(length(p->>'chemin'), 0) = 0 or length(p->>'chemin') > 120 then
    raise exception 'erreur_invalide' using errcode = '22023';
  end if;
  insert into public.journal_erreurs_client(espace, chemin, ecran, message, source, appareil, langue, version)
  values (
    p->>'espace',
    p->>'chemin',
    nullif(left(p->>'ecran', 40), ''),
    p->>'message',
    nullif(left(p->>'source', 160), ''),
    case when p->>'appareil' in ('mobile','tablette','ordinateur') then p->>'appareil' end,
    case when (p->>'langue') ~ '^[a-z]{2}$' then p->>'langue' end,
    -- La version est gardée si elle a la forme attendue, sinon NULL : une
    -- vieille page n'en envoie pas, et l'erreur ne doit pas se perdre pour ça.
    case when (p->>'version') ~ '^[A-Za-z0-9._·-]{1,40}$' then p->>'version' end
  );
  delete from public.journal_erreurs_client where cree_le < now() - interval '30 days';
  return true;
end $$;
revoke all on function public.ela_erreur_client_ecrire(jsonb) from public, anon, authenticated;
grant execute on function public.ela_erreur_client_ecrire(jsonb) to service_role;

create or replace function public.ela_erreurs_client_recentes()
returns json language plpgsql stable security definer
set search_path = public, pg_temp as $$
begin
  if not public.est_exploitant() then
    raise exception 'acces_refuse' using errcode = '42501';
  end if;
  return json_build_object(
    'n24h', (select count(*) from public.journal_erreurs_client where cree_le >= now() - interval '24 hours'),
    'n1h',  (select count(*) from public.journal_erreurs_client where cree_le >= now() - interval '1 hour'),
    'derniere', (select max(cree_le) from public.journal_erreurs_client),
    'messages', (
      select coalesce(json_agg(json_build_object('message', x.message, 'espace', x.espace, 'n', x.n, 'derniere', x.derniere, 'version', x.version)), '[]'::json)
        from (select message, espace, count(*) as n, max(cree_le) as derniere,
                     -- La version la plus récente qui a produit ce message.
                     (array_agg(version order by cree_le desc nulls last))[1] as version
                from public.journal_erreurs_client
               where cree_le >= now() - interval '24 hours'
               group by message, espace order by n desc, derniere desc limit 5) x)
  );
end $$;
revoke all on function public.ela_erreurs_client_recentes() from public, anon;
grant execute on function public.ela_erreurs_client_recentes() to authenticated, service_role;

do $$
begin
  if has_table_privilege('anon', 'public.journal_erreurs_client', 'select')
     or has_table_privilege('anon', 'public.journal_erreurs_client', 'insert')
     or has_table_privilege('authenticated', 'public.journal_erreurs_client', 'insert')
     or has_table_privilege('authenticated', 'public.journal_erreurs_client', 'update')
     or has_table_privilege('authenticated', 'public.journal_erreurs_client', 'delete')
     or has_function_privilege('anon', 'public.ela_erreur_client_ecrire(jsonb)', 'execute')
     or has_function_privilege('authenticated', 'public.ela_erreur_client_ecrire(jsonb)', 'execute')
     or has_function_privilege('anon', 'public.ela_erreurs_client_recentes()', 'execute') then
    raise exception 'journal_erreurs_client : un droit ouvert au navigateur';
  end if;
end $$;
