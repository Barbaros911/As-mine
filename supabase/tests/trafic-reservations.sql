-- ============================================================================
-- TRAFIC : UNE RÉSERVATION N'EST COMPTÉE QUE SI LA COURSE EXISTE
-- (18 octobre 2026). Après trafic-apres.sql, puis 20261018000000 appliquée
-- DEUX fois. Le décor laissé par trafic-apres : une demande envoyée
-- (ELA-26-10-AB12C) dont la course est réalisée.
-- Contre 20261015010000 seule, ce fichier tombe : le geste inventé y compte.
-- ============================================================================

-- ── 1. Les droits n'ont pas bougé ──────────────────────────────────────
do $$ begin
  if has_function_privilege('authenticated', 'public.trafic_agreger(timestamptz,timestamptz,text)', 'execute') then
    raise exception 'ECHEC R1 : trafic_agreger est exécutable depuis le navigateur'; end if;
  if has_function_privilege('anon', 'public.ela_trafic(text)', 'execute') then
    raise exception 'ECHEC R1 : ela_trafic est exécutable par un anonyme'; end if;
  if not has_function_privilege('authenticated', 'public.ela_trafic(text)', 'execute') then
    raise exception 'ECHEC R1 : l''admin ne peut plus lire le trafic'; end if;
  if position('est_admin()' in pg_get_functiondef('public.ela_trafic(text)'::regprocedure)) = 0 then
    raise exception 'ECHEC R1 : ela_trafic a perdu le verrou admin'; end if;
end $$;

-- ── 2. Un geste inventé et une vraie demande ───────────────────────────
-- FAUX9 : un « demande_envoyee » au bon format, sans course — ce qu'un curl
-- qui imite l'origine du site peut envoyer. VRAI7 : une demande réelle, la
-- course est sur le serveur, encore en attente.
insert into public.courses(ref, statut, bon) values ('ELA-26-10-VRAI7', 'attente', '{}'::jsonb)
  on conflict (ref) do update set statut = 'attente';
set role service_role;
do $$ begin
  if not public.ela_mesurer_evenement('{"evenement":"demande_envoyee","page":"fr-orly","source":"direct","detail":{"ref":"ELA-26-10-FAUX9"}}', repeat('e', 64)) then
    raise exception 'ECHEC R2 : le geste inventé n''est pas écrit (le décor de l''épreuve est faux)'; end if;
  if not public.ela_mesurer_evenement('{"evenement":"demande_envoyee","page":"fr-orly","source":"direct","detail":{"ref":"ELA-26-10-VRAI7"}}', repeat('f', 64)) then
    raise exception 'ECHEC R2 : la vraie demande est refusée'; end if;
end $$;
reset role;

-- ── 3. L'admin ne voit que les demandes arrivées ───────────────────────
set role authenticated;
do $$
declare r jsonb; s jsonb; n int;
begin
  perform set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000001', false);
  r := public.ela_trafic('aujourdhui');
  if (r->'totaux'->>'reservations')::int <> 2 then
    raise exception 'ECHEC R3 : % réservations au lieu de 2 — un geste sans course est compté', r->'totaux'->>'reservations'; end if;
  if (r->'totaux'->>'confirmees')::int <> 1 or (r->'totaux'->>'realisees')::int <> 1 then
    raise exception 'ECHEC R3 : confirmées/réalisées ont bougé (%)', r->'totaux'; end if;
  select coalesce(sum((x->>'reservations')::int), 0) into n from jsonb_array_elements(r->'serie') x;
  if n <> 2 then raise exception 'ECHEC R3 : la courbe porte % réservations au lieu de 2', n; end if;
  select x into s from jsonb_array_elements(r->'pages') x where x->>'valeur' = 'fr-orly';
  if s is null or (s->'totaux'->>'reservations')::int <> 1 then
    raise exception 'ECHEC R3 : la page porte le geste inventé (%)', s; end if;
  if r::text like '%FAUX9%' or r::text like '%VRAI7%' then
    raise exception 'ECHEC R3 : une référence sort dans les agrégats'; end if;
end $$;
reset role;

select 'TRAFIC (réservations serveur) : toutes les épreuves passent' as resultat;
