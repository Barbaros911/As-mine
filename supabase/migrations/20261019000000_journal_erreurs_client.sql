-- =====================================================================
-- LE JOURNAL DES ERREURS DU SITE — 19 octobre 2026, audit (observabilité)
-- ---------------------------------------------------------------------
-- Une exception JavaScript dans le tunnel de réservation n'existait nulle
-- part : le voyant et le chien de garde ne regardent que ce qui atteint le
-- serveur. La page envoie désormais chaque erreur à la fonction
-- « erreur-client », qui écrit ici par la RPC ci-dessous.
--
-- CE QUE LA TABLE PORTE, ET RIEN D'AUTRE : l'espace (public, hotel,
-- reception, admin), le chemin de la page, l'écran actif, le message borné
-- à 200 signes et déjà masqué (six chiffres de suite, e-mails, adresses
-- complètes), la source (fichier:ligne), l'appareil, la langue. JAMAIS le
-- nom, le téléphone, la référence, l'adresse IP ni le navigateur complet.
--
-- QUI ÉCRIT, QUI LIT. Seule la fonction écrit, par « ela_erreur_client_
-- ecrire », réservée à la clé de service, qui borne encore les champs et
-- purge ce qui a plus de 30 jours. Un exploitant connecté lit la table et
-- appelle « ela_erreurs_client_recentes » (compte sur 24 h et 1 h, les cinq
-- messages les plus fréquents) : c'est ce que l'admin affiche sous le
-- voyant. anon : rien.
--
-- À APPLIQUER EN PRODUCTION APRÈS LA FUSION (workflow « Appliquer une
-- migration Supabase »). Entre les deux rien ne casse : la fonction rend 503
-- sur la RPC absente et la page ne lit pas la réponse ; l'admin ne montre
-- rien. Rejouable : « if not exists » et « or replace » partout.
-- =====================================================================
-- Hors Supabase (l'épreuve SQL de la CI tourne sur un PostgreSQL nu), le rôle
-- « service_role » n'existe pas : on le pose, sans effet en production où il
-- est déjà là.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin;
  end if;
end $$;

create table if not exists public.journal_erreurs_client (
  id bigint generated always as identity primary key,
  espace text not null check (espace in ('public','hotel','reception','admin','autre')),
  chemin text not null check (length(chemin) between 1 and 120),
  ecran text check (ecran is null or length(ecran) <= 40),
  message text not null check (length(message) between 1 and 200),
  source text check (source is null or length(source) <= 160),
  appareil text check (appareil is null or appareil in ('mobile','tablette','ordinateur')),
  langue text check (langue is null or langue ~ '^[a-z]{2}$'),
  cree_le timestamptz not null default now()
);
create index if not exists journal_erreurs_client_cree_le_idx on public.journal_erreurs_client (cree_le desc);

alter table public.journal_erreurs_client enable row level security;
revoke all on public.journal_erreurs_client from public, anon, authenticated;
grant select on public.journal_erreurs_client to authenticated;
drop policy if exists "exploitant lit journal erreurs" on public.journal_erreurs_client;
create policy "exploitant lit journal erreurs" on public.journal_erreurs_client
  for select to authenticated using ((select public.est_exploitant()));

-- L'écriture : la clé de service seule. Les bornes sont refaites ici — la
-- fonction les pose déjà, mais une RPC qui croit son appelant n'est pas une
-- frontière. La purge se fait au passage : une erreur par écriture, et la
-- table ne grossit jamais au-delà d'un mois.
create or replace function public.ela_erreur_client_ecrire(p jsonb)
returns boolean language plpgsql security definer
set search_path = public, pg_temp as $$
begin
  if current_user not in ('service_role','postgres') then
    raise exception 'acces_refuse' using errcode = '42501';
  end if;
  if p is null or jsonb_typeof(p) <> 'object' then
    raise exception 'erreur_invalide' using errcode = '22023';
  end if;
  if coalesce(length(p->>'message'), 0) = 0 or length(p->>'message') > 200
     or coalesce(length(p->>'chemin'), 0) = 0 or length(p->>'chemin') > 120 then
    raise exception 'erreur_invalide' using errcode = '22023';
  end if;
  insert into public.journal_erreurs_client(espace, chemin, ecran, message, source, appareil, langue)
  values (
    p->>'espace',
    p->>'chemin',
    nullif(left(p->>'ecran', 40), ''),
    p->>'message',
    nullif(left(p->>'source', 160), ''),
    case when p->>'appareil' in ('mobile','tablette','ordinateur') then p->>'appareil' end,
    case when (p->>'langue') ~ '^[a-z]{2}$' then p->>'langue' end
  );
  delete from public.journal_erreurs_client where cree_le < now() - interval '30 days';
  return true;
end $$;
revoke all on function public.ela_erreur_client_ecrire(jsonb) from public, anon, authenticated;
grant execute on function public.ela_erreur_client_ecrire(jsonb) to service_role;

-- La lecture de l'admin : un exploitant connecté, et lui seul. Des comptes
-- et des messages déjà masqués, jamais une ligne brute.
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
      select coalesce(json_agg(json_build_object('message', x.message, 'espace', x.espace, 'n', x.n, 'derniere', x.derniere)), '[]'::json)
        from (select message, espace, count(*) as n, max(cree_le) as derniere
                from public.journal_erreurs_client
               where cree_le >= now() - interval '24 hours'
               group by message, espace order by n desc, derniere desc limit 5) x)
  );
end $$;
revoke all on function public.ela_erreurs_client_recentes() from public, anon;
grant execute on function public.ela_erreurs_client_recentes() to authenticated, service_role;

-- Un droit qui survivrait pour anon, ou une écriture pour authenticated,
-- arrête la migration ici : même ceinture que journal_depots.
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
    raise exception 'journal_erreurs_client : un droit survit pour anon ou authenticated';
  end if;
end $$;

select 'journal_erreurs_client : table, écriture par la clé de service, lecture exploitant' as info;
